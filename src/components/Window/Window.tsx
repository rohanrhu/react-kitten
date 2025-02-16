/**
 * React<Kitten> (react-kitten) is a desktop environment for the web.
 * Copyright (C) 2024, Oğuzhan Eroğlu (https://meowingcat.io) <meowingcate@gmail.com>
 * 
 * GitHub: https://github.com/rohanrhu/react-kitten
 * NPM: https://www.npmjs.com/package/react-kitten
 * 
 * This project and its source code is licensed under the MIT license,
 * found in the LICENSE file in the root directory of this source tree.
 * (MIT License: https://opensource.org/licenses/MIT)
 */

import React, { useEffect, useState, useCallback, useContext, useRef, useMemo, HTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import classNames from 'classnames'

import { isMobileDevice, nonZeroPosition } from '../../kitten'
import { usePosition, useKittenId } from '../../hooks'
import { ManagerContext, SpaceContext } from '../../contexts'
import { WindowEvent, MoveEvent, ResizeEvent, SpaceEvent } from '../../components/Space/library'
import { ALWAYS_ON_TOP_Z_INDEX, WindowContext } from './library'

import styles from './Window.module.css'

type Timeout = ReturnType<typeof setTimeout> | null | undefined

type ResizerDirection = 'top' | 'right' | 'bottom' | 'left' |
                        'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
type OnMayResize = (may_resize: boolean) => void
type BoundsChangeReason = 'user' | 'system'

const DEFAULT_MIN_SIZE: [number, number] = [100, 100]
const DEFAULT_MAX_SIZE = null
const DEFAULT_RESIZABLE: boolean = true
const DEFAULT_RESIZER_THRESHOLD: number = 25
const DEFAUULT_STAGED: boolean = false
const DEFAULT_STAGING_DISTANCE: number = 150
const DEFAULT_STAGED_SIZE: [number, number] = [100, 120]
const DEFAULT_ALLOW_OUTSIDE: boolean = true
const DEFAULT_COMPENSATE_POSITION_ON_VIEWPORT_RESIZE: boolean = true
const DEFAULT_CALLBACK = () => {}

interface WindowProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  kittenId: string
  size: [number, number]
  position: [number, number]
  minSize?: [number, number] | null
  maxSize?: [number, number] | null
  staged?: boolean
  resizable?: boolean
  resizerThreshold?: number
  alwaysOnTop?: boolean
  stagingDistance?: number
  stagedSize?: [number, number] | [number, null] | [null, number]
  allowOutside?: boolean
  compensatePositionOnViewportResize?: boolean
  onStagedChange: (staged: boolean) => void
  onSizeChange: (size: [number, number], reason: BoundsChangeReason) => void
  onPositionChange: (position: [number, number], reason: BoundsChangeReason) => void
  onMoveStart?: () => void
  onMoveEnd?: () => void
  onFocus?: () => void
  onBlur?: () => void
}

/**
 * @description Window component, moves, resizes, stages, and focuses the window.
 * 
 * When you use this Window component, you need to have your own states for size and position;
 * for simpler things you can use BasicWindow component.
 * 
 * Window component must be placed in a Space component. The hierarchy should be like this:
 * {@link Manager} -> {@link Spaces} -> {@link Space} -> {@link Window}
 * 
 * @param children Accepts any component as children and also accepts {@link TitleBar} and {@link Content} components inside
 * @param kittenId Unique identifier for the window. Use {@link useKittenId} hook for setting the kittenId.
 * @param size Size of the window
 * @param position Position of the window, use {@link usePosition} hook for setting the initial position
 * @param minSize Minimum size of the window
 * @param maxSize Maximum size of the window
 * @param resizable If the window is resizable
 * @param resizerThreshold Threshold for showing the resizers
 * @param alwaysOnTop If the window is always on top
 * @param staged If the window is staged
 * @param stagingDistance Distance for staging the window
 * @param stagedSize Size of the staged window
 * @param allowOutside If the window can go outside of the manager
 * @param compensatePositionOnViewportResize When the viewport is resized, the window will be repositioned to fit inside the manager
 * @param onStagedChange Callback for staged change
 * @param onSizeChange Callback for size change
 * @param onPositionChange Callback for position change
 * @param onMoveStart Callback for move start
 * @param onMoveEnd Callback for move end
 */
function Window({
  children = null,
  kittenId,
  size,
  position,
  minSize = DEFAULT_MIN_SIZE,
  maxSize = DEFAULT_MAX_SIZE,
  resizable = DEFAULT_RESIZABLE,
  resizerThreshold = DEFAULT_RESIZER_THRESHOLD,
  alwaysOnTop = false,
  staged = DEFAUULT_STAGED,
  stagingDistance = DEFAULT_STAGING_DISTANCE,
  stagedSize = DEFAULT_STAGED_SIZE,
  allowOutside = DEFAULT_ALLOW_OUTSIDE,
  compensatePositionOnViewportResize = DEFAULT_COMPENSATE_POSITION_ON_VIEWPORT_RESIZE,
  onSizeChange = DEFAULT_CALLBACK,
  onStagedChange = DEFAULT_CALLBACK,
  onPositionChange = DEFAULT_CALLBACK,
  onMoveStart = DEFAULT_CALLBACK,
  onMoveEnd = DEFAULT_CALLBACK,
  onFocus = DEFAULT_CALLBACK,
  onBlur = DEFAULT_CALLBACK,
  ...attrs
}: Readonly<WindowProps>) {
  const { size: managerSize, setWheelBusy, scaleX, scaleY, revertScaleX, revertScaleY } = useContext(ManagerContext)
  const { lmb, pointer, windowsRef, stagedsRef, focusedWindow, setFocusedWindow, setLastWindowPosition: setSpaceLastWindowPosition,
          windowZIndexCounter, setWindowZIndexCounter, stagedsWidth, onWindowMoveStart, onWindowMoveEnd, onUserBoundsChangeEnd, onWindowBoundsChanged,
          snapMargin, toSnap, eventDispatcher: spaceEventDispatcher, unmountedWindows: spaceUnmountedWindows, setUnmountedWindows: setSpaceUnmountedWindows
  } = useContext(SpaceContext)
  const [showResizers, setShowResizers] = useState(false)
  const resizerMouseMoveTimeoutRef = useRef<Timeout>(null)
  const [mayResize, setMayResize] = useState(false)
  const [moving, setMoving] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [prevMoving, setPrevMoving] = useState(false)
  const [zIndex, setZIndex] = useState(0)
  const [focused, setFocused] = useState(true)
  const [rotation, setRotation] = useState(0)
  const [scale, setScale] = useState(1)
  const [staging, setStaging] = useState(false)
  const [stagingXCompenstation, setStagingXCompenstation] = useState(0)
  const [stagingYCompenstation, setStagingYCompenstation] = useState(0)
  const [stagedScale, setStagedScale] = useState([1, 1])
  const [scaledStagedSize, setScaledStagedSize] = useState([0, 0])
  const [movingStartPosition, setMovingStartPosition] = useState<[number, number]>(position)
  const [prevManagerSize, setPrevManagerSize] = useState(managerSize)
  const prevAlwaysOnTopRef = useRef<boolean>(false)
  const hideResizersTimeoutRef = useRef<Timeout>(null)
  const prevResizingRef = useRef(resizing)
  const [lastWindowPosition, setLastWindowPosition] = useState<[number, number]>(position)
  const [stagedBy, setStagedBy] = useState<'instant' | 'move'>('instant')
  const [snapMoving, setSnapMoving] = useState(false)

  const kittenIdRef = useRef(kittenId)
  useEffect(() => { kittenIdRef.current = kittenId }, [kittenId])
  const spaceUnmountedWindowsRef = useRef(spaceUnmountedWindows)
  const setSpaceUnmountedWindowsRef = useRef(setSpaceUnmountedWindows)
  useEffect(() => { setSpaceUnmountedWindowsRef.current = setSpaceUnmountedWindows }, [setSpaceUnmountedWindows])

  const prevPositionRef = useRef<[number, number]>(position)
  const prevSizeRef = useRef<[number, number]>(size)

  const windowZIndexCounterRef = useRef(windowZIndexCounter)

  const onMount = useCallback(() => {
  }, [])

  const onUnmount = useCallback(() => {
    setSpaceUnmountedWindowsRef.current([...spaceUnmountedWindowsRef.current, kittenIdRef.current])
  }, [])

  const onMountRef = useRef(onMount)
  const onUnmountRef = useRef(onUnmount)
  
  useEffect(() => {
    onMountRef.current()
    return onUnmountRef.current
  }, [])
  
  useEffect(() => {focused && setFocusedWindow(kittenId)}, [kittenId, focused, setFocusedWindow])
  useEffect(() => {focusedWindow === kittenId ? setFocused(true): setFocused(false)}, [focusedWindow, kittenId])
  useEffect(() => {focused ? onFocus(): onBlur()}, [focused, onFocus, onBlur])
  useEffect(() => setStaging(moving && (pointer[0] < scaleX(stagingDistance))), [moving, pointer, stagingDistance, scaleX])
  useEffect(() => {!staging && setSpaceLastWindowPosition(nonZeroPosition(position))}, [staging, position, setSpaceLastWindowPosition, managerSize])
  useEffect(() => {setWheelBusy(moving)}, [moving, setWheelBusy])
  useEffect(() => setLastWindowPosition(nonZeroPosition(position)), [position])

  useEffect(() => {
    if (moving && !prevMoving) {
      setMovingStartPosition(position)
    }
    setPrevMoving(moving)
  }, [moving, prevMoving, position])

  useEffect(() => {
    if (!staged) return

    if (stagedSize[0] && !stagedSize[1]) {
      const width_scale = (size[1] > size[0]) ? stagedSize[0] / size[1]: stagedSize[0] / size[0]
      const scaled_width = size[0] * width_scale
      const scaled_height = size[1] * width_scale
      const height_scale = scaled_height / size[1]
      const scale_to_staged = [width_scale, height_scale]
      
      setStagedScale(scale_to_staged)
      setScaledStagedSize([scaled_width, scaled_height])
    } else if (!stagedSize[0] && stagedSize[1]) {
      const width_scale = (size[0] > size[1]) ? stagedsWidth / size[0]: stagedSize[ 1] / size[1]
      const scaled_width = size[0] * width_scale
      const scaled_height = size[1] * width_scale
      const height_scale = scaled_height / size[1]
      const scale_to_staged = [width_scale, height_scale]

      setStagedScale(scale_to_staged)
      setScaledStagedSize([scaled_width * 0.8, scaled_height * 0.8])
    } else if (stagedSize[0] && stagedSize[1]) {
      if (size[0] > size[1]) {
        const width_scale = stagedSize[0] / size[0]
        const scaled_width = size[0] * width_scale
        const scaled_height = size[1] * width_scale
        const height_scale = scaled_height / size[1]
        const scale_to_staged = [width_scale, height_scale]
        
        setStagedScale(scale_to_staged)
        setScaledStagedSize([scaled_width, scaled_height])
      } else {
        const height_scale = stagedSize[1] / size[1]
        const scaled_width = size[0] * height_scale
        const scaled_height = size[1] * height_scale
        const width_scale = scaled_width / size[0]
        const scale_to_staged = [width_scale, height_scale]

        setStagedScale(scale_to_staged)
        setScaledStagedSize([scaled_width, scaled_height])
      }
    }
  }, [staged, size, stagedSize, stagedsWidth, lastWindowPosition])

  useEffect(() => { if (!staged) setStagedBy('instant') }, [staged])
  
  useEffect(() => {
    onWindowBoundsChanged(kittenId, position, size, true, resizing, staged)
    onUserBoundsChangeEnd(kittenId, position, size, false, resizing, staged)
  }, [staged]) // eslint-disable-line

  useEffect(() => {
    if (!staging) return
    if (lmb) return
    if (staging) setStagedBy('move')
    setStaging(false)
    onStagedChange(true)
  }, [staging, lmb, onStagedChange])

  useEffect(() => {
    if (alwaysOnTop == prevAlwaysOnTopRef.current) {
      if (!focused) return
      if (focusedWindow !== kittenId) return
      if (zIndex === windowZIndexCounterRef.current) return
      if (zIndex === windowZIndexCounterRef.current + ALWAYS_ON_TOP_Z_INDEX) return
    }
    prevAlwaysOnTopRef.current = alwaysOnTop
    const newCounter = windowZIndexCounterRef.current + 1
    setZIndex(newCounter + (alwaysOnTop ? ALWAYS_ON_TOP_Z_INDEX: 0))
    setWindowZIndexCounter(newCounter)
  }, [focused, focusedWindow, setWindowZIndexCounter, kittenId, zIndex, alwaysOnTop])

  useEffect(() => { windowZIndexCounterRef.current = windowZIndexCounter }, [windowZIndexCounter])
  
  useEffect(() => {
    if (!moving) return
    const distance = pointer[0]
    const scaled_distance = scaleX(stagingDistance)
    if (distance > scaled_distance) {
      setRotation(0)
      setScale(1)
      setStagingXCompenstation(0)
      setStagingYCompenstation(0)
    } else if (stagedSize[0] && !stagedSize[1]) {
      const scale_to_staged = (size[1] > size[0]) ? stagedSize[0] / size[1]: stagedSize[0] / size[0]
      const x_compensation = pointer[0] - position[0]
      const y_compensation = pointer[1] - position[1]

      setRotation(90 * (1 - distance / scaled_distance))
      setScale(scale_to_staged)
      setStagingXCompenstation(x_compensation)
      setStagingYCompenstation(y_compensation)
    } else if (!stagedSize[0] && stagedSize[1]) {
      const scale_to_staged = (size[0] > size[1]) ? stagedsWidth / size[0]: stagedSize[1] / size[1]
      const x_compensation = pointer[0] - position[0]
      const y_compensation = pointer[1] - position[1]

      setRotation(90 * (1 - distance / scaled_distance))
      setScale(scale_to_staged)
      setStagingXCompenstation(x_compensation)
      setStagingYCompenstation(y_compensation)
    } else if (stagedSize[0] && stagedSize[1]) {
      if (size[0] > size[1]) {
        const scale_to_staged = stagedSize[0] / size[0]
        const x_compensation = pointer[0] - position[0]
        const y_compensation = pointer[1] - position[1]

        setRotation(90 * (1 - distance / scaled_distance))
        setScale(scale_to_staged)
        setStagingXCompenstation(x_compensation)
        setStagingYCompenstation(y_compensation)
      } else {
        const scale_to_staged = stagedSize[1] / size[1]
        const x_compensation = pointer[0] - position[0]
        const y_compensation = pointer[1] - position[1]

        setRotation(90 * (1 - distance / scaled_distance))
        setScale(scale_to_staged)
        setStagingXCompenstation(x_compensation)
        setStagingYCompenstation(y_compensation)
      }
    }
  }, [pointer, moving, stagingDistance, position, size, stagedSize, scaleX, stagedsWidth])

  useEffect(() => moving ? onMoveStart(): onMoveEnd(), [moving, onMoveStart, onMoveEnd])

  useEffect(() => {
    if (allowOutside)
      return
    if (position[0] + size[0] > managerSize[0])
      onPositionChange([managerSize[0] - size[0], position[1]], 'system')
    if (position[1] + size[1] > managerSize[1])
      onPositionChange([position[0], managerSize[1] - size[1]], 'system')
    if (position[0] < 0)
      onPositionChange([0, position[1]], 'system')
    if (position[1] < 0)
      onPositionChange([position[0], 0], 'system')
  }, [allowOutside, position, size, managerSize, onPositionChange])

  useEffect(() => {
    if (!compensatePositionOnViewportResize) return
    if (managerSize[0] === prevManagerSize[0] && managerSize[1] === prevManagerSize[1]) return

    const [right, bottom] = [position[0] + size[0], position[1] + size[1]]
    let [x, y] = [position[0], position[1]]
    
    if (right > managerSize[0])
      x = managerSize[0] - size[0]
    if (bottom > managerSize[1])
      y = managerSize[1] - size[1]
    
    if (x !== position[0] || y !== position[1])
      onPositionChange([x, y], 'system')
    
    setPrevManagerSize(managerSize)
  }, [managerSize, prevManagerSize, position, size, onPositionChange, compensatePositionOnViewportResize]);

  useEffect(() => {
    if (!(managerSize[0] !== prevManagerSize[0] || managerSize[1] !== prevManagerSize[1])) return

    onPositionChange && onPositionChange(nonZeroPosition(position), 'system')
    setSpaceLastWindowPosition(nonZeroPosition(position))
    setPrevManagerSize(managerSize)
  }, [managerSize, prevManagerSize, position, onPositionChange, setSpaceLastWindowPosition])

  useEffect(() => {
    if (!isMobileDevice()) return
    if (!showResizers) return
    clearTimeout(hideResizersTimeoutRef.current as unknown as number)
    hideResizersTimeoutRef.current = setTimeout(() => setShowResizers(false), 2500)
  }, [showResizers])

  useEffect(() => {
    if ((prevPositionRef.current[0] === position[0]) && (prevPositionRef.current[1] === position[1]) && (prevSizeRef.current[0] === size[0]) && (prevSizeRef.current[1] === size[1]))
      return
    onWindowBoundsChanged(kittenId, position, size, moving, resizing, staged)
  }, [kittenId, position, size, moving, resizing, staged, onWindowBoundsChanged])

  useEffect(() => {
    if (!toSnap?.newPosition || !toSnap?.newSize) return
    if (toSnap.target.id != kittenId) return
    const currentAndOthers = toSnap.getCurrentAndOthers(kittenId)
    if (!currentAndOthers) return
    const [current, others] = currentAndOthers
    if (!current || !others) return

    onPositionChange(toSnap.newPosition, 'system')
    onSizeChange(toSnap.newSize, 'system')
  }, [toSnap, kittenId, onPositionChange, onSizeChange, snapMargin])

  const moveStartEventCallback = useCallback((event: SpaceEvent<WindowEvent>) => {
    if (event.target.id !== kittenId) return
    setSnapMoving(true)
  }, [kittenId, setSnapMoving])

  const moveEndEventCallback = useCallback((event: SpaceEvent<WindowEvent>) => {
    if (event.target.id !== kittenId) return
    setSnapMoving(false)
  }, [kittenId, setSnapMoving])
  
  const moveEventCallback = useCallback((event: SpaceEvent<MoveEvent>) => {
    if (event.target.id !== kittenId) return
    const newPosition: [number, number] = [position[0] + event.positionDelta[0], position[1] + event.positionDelta[1]]
    onPositionChange(newPosition, 'user')
    setSpaceLastWindowPosition(newPosition)
  }, [kittenId, position, onPositionChange, setSpaceLastWindowPosition])
  
  const resizeEventCallback = useCallback((event: SpaceEvent<ResizeEvent>) => {
    if (event.target.id !== kittenId) return
    const newSize: [number, number] = [size[0] + event.sizeDelta[0], size[1] + event.sizeDelta[1]]
    if (minSize) {
      if (newSize[0] < minSize[0]) newSize[0] = minSize[0]
      if (newSize[1] < minSize[1]) newSize[1] = minSize[1]
    }
    if (maxSize) {
      if (newSize[0] > maxSize[0]) newSize[0] = maxSize[0]
      if (newSize[1] > maxSize[1]) newSize[1] = maxSize[1]
    }
    onSizeChange([newSize[0], newSize[1]], 'user')
  }, [kittenId, size, onSizeChange, minSize, maxSize])
  
  useEffect(() => {
    if (!spaceEventDispatcher) return
    
    spaceEventDispatcher.removeListener('move-start', moveStartEventCallback)
    spaceEventDispatcher.removeListener('move-end', moveEndEventCallback)
    spaceEventDispatcher.removeListener('move', moveEventCallback)
    spaceEventDispatcher.removeListener('resize', resizeEventCallback)

    spaceEventDispatcher.setListener('move-start', moveStartEventCallback)
    spaceEventDispatcher.setListener('move-end', moveEndEventCallback)
    spaceEventDispatcher.setListener('move', moveEventCallback)
    spaceEventDispatcher.setListener('resize', resizeEventCallback)

  }, [kittenId, spaceEventDispatcher, moveEventCallback, resizeEventCallback, moveStartEventCallback, moveEndEventCallback])

  const onResize = useCallback((size: [number, number], delta: [number, number]) => {
    const new_size: [number, number] = [size[0] + delta[0], size[1] + delta[1]]
    
    if (minSize) {
      if (new_size[0] < minSize[0]) new_size[0] = minSize[0]
      if (new_size[1] < minSize[1]) new_size[1] = minSize[1]
    }
    if (maxSize) {
      if (new_size[0] > maxSize[0]) new_size[0] = maxSize[0]
      if (new_size[1] > maxSize[1]) new_size[1] = maxSize[1]
    }

    if (size[0] !== new_size[0] || size[1] !== new_size[1])
      onSizeChange(new_size, 'user')
  }, [onSizeChange, minSize, maxSize])

  const onMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isMobileDevice()) return
    clearTimeout(resizerMouseMoveTimeoutRef.current as unknown as number)
    if (!resizable) return
    const rect = event.currentTarget.getBoundingClientRect()

    resizerMouseMoveTimeoutRef.current = setTimeout(() => {
      const x_threshold = scaleX(resizerThreshold)
      const y_threshold = scaleY(resizerThreshold)

      const x = event.clientX - rect.x
      const y = event.clientY - rect.y

      setShowResizers(x < x_threshold ||
                      y < x_threshold ||
                      x > rect.width - x_threshold ||
                      y > rect.height - y_threshold)
    }, 100)
  }, [resizable, resizerThreshold, scaleX, scaleY])

  const onMouseLeave = useCallback(() => {
    if (isMobileDevice()) return
    clearTimeout(resizerMouseMoveTimeoutRef.current as unknown as number)
    setShowResizers(false)
  }, [])

  const onMoveStartCallback = useCallback(() => {
    setMoving(true)
    onWindowMoveStart(kittenId, position, size, true, resizing, staged)
  }, [onWindowMoveStart, kittenId, position, size, resizing, staged])
  const onMoveEndCallback = useCallback(() => {
    setMoving(false)
    onWindowMoveEnd(kittenId, position, size, false, resizing, staged)
    onUserBoundsChangeEnd(kittenId, position, size, false, resizing, staged)
  }, [onWindowMoveEnd, onUserBoundsChangeEnd, kittenId, position, size, resizing, staged])
  
  const onResizeStartCallback = useCallback(() => {}, [])

  const onResizeEndCallback = useCallback(() => {
    onUserBoundsChangeEnd(kittenId, position, size, moving, false, staged)
  }, [onUserBoundsChangeEnd, kittenId, position, size, moving, staged])

  useEffect(() => {
    if (!prevResizingRef.current && resizing)
      onResizeStartCallback()
    else if (prevResizingRef.current && !resizing)
      onResizeEndCallback()
    prevResizingRef.current = resizing
  }, [resizing, onResizeStartCallback, onResizeEndCallback])

  useEffect(() => { prevPositionRef.current = position }, [position])
  useEffect(() => { prevSizeRef.current = size }, [size])
  
  const contextProps = useMemo(() => ({
    size, position, minSize, maxSize, moving, resizing, setResizing, focused, setFocused, staging, staged, showResizers, setShowResizers,
    onResizeStart: onResizeStartCallback, onResizeEnd: onResizeEndCallback, onMoveStart: onMoveStartCallback, onMoveEnd: onMoveEndCallback,
  }), [size, position, minSize, maxSize, moving, resizing, setResizing, focused, staging, staged, showResizers, setShowResizers, onResizeStartCallback, onResizeEndCallback, onMoveStartCallback, onMoveEndCallback])
  
  const resizersOnMoveCallback = useCallback((position: [number, number]) => {
    onPositionChange(position, 'user')
  }, [onPositionChange])
  
  const window = <div
      {...(attrs as HTMLAttributes<HTMLDivElement>)}
      className={classNames([
        styles.Window,
        { [styles.Window__showResizers]: !moving && !staged && showResizers },
        { [styles.Window__mayResize]: mayResize },
        { [styles.Window__moving]: moving },
        { [styles.Window__staging]: staging },
        { [styles.Window__staged]: staged },
        { [styles.Window__focused]: focused },
        { [styles.Window__snapMoving]: snapMoving },
      ])}
      draggable={false}
      style={{
        width: size[0],
        height: size[1],
        transformOrigin: (staged || staging) ? 'top left': undefined,
        transform: staged ? `
          scale(${stagedScale[0]}, ${stagedScale[1]}) 
          translate(0, 0)
        `: (staging ? `
          rotate3d(0, 1, 0, ${rotation}deg) 
          scale(${scale})
        `: undefined),
        translate: staged ? undefined: (
          staging ? `${revertScaleX(position[0]) + revertScaleX(stagingXCompenstation)}px ${revertScaleY(position[1]) + revertScaleY(stagingYCompenstation)}px`
                  : `${revertScaleX(position[0])}px ${revertScaleY(position[1])}px`),
        zIndex: zIndex + (snapMoving ? 10000: 0),
        ...attrs.style
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
      {resizable && <Resizers
        onMayResize={setMayResize}
        onResize={onResize}
        onMove={resizersOnMoveCallback}
      />}
      <div
        className={classNames([styles.Window_stagedLayer])}
        onClick={() => {
          onStagedChange(false)
          if (stagedBy == 'move')
            onPositionChange(movingStartPosition, 'user')
          setFocused(true)
        }}
      ></div>
    </div>
  
  return <WindowContext.Provider value={contextProps}>
    {stagedsRef.current && staged && <>
      {createPortal(<div
        className={classNames([styles.Window_stagedWindow])}
        style={{
          width: scaledStagedSize[0],
          height: scaledStagedSize[1],
          transform: staged ? `
          `: undefined,
        }}
        onMouseOver={() => setWheelBusy(true)}
        onMouseLeave={() => setWheelBusy(false)}
        onTouchStart={() => setWheelBusy(true)}
        onTouchEnd={() => setWheelBusy(false)}
        onClick={() => {
          onStagedChange(false)
          if (stagedBy == 'move')
            onPositionChange(movingStartPosition, 'user')
          setFocused(true)
        }}
      >
        {window}
      </div>, stagedsRef.current)}
    </>}
    {!staged && windowsRef.current && <>{createPortal(window, windowsRef.current)}</>}
  </WindowContext.Provider>
}

interface ResizersProps extends React.PropsWithChildren {
  onMayResize: OnMayResize
  onResize?: (size: [number, number], delta: [number, number]) => void
  onMove?: (position: [number, number]) => void
}

function Resizers({
  onMayResize,
  onResize = () => {},
  onMove = () => {},
}: Readonly<ResizersProps>) {
  const onResizeCallback = useCallback((size: [number, number], delta: [number, number]) => {
    onResize(size, delta)
  }, [onResize])

  return (
    <div className={classNames([styles.Resizers])}>
      {['top', 'right', 'bottom', 'left', 'top-right', 'top-left', 'bottom-right', 'bottom-left'].map(direction => (
        <Resizer key={direction}
                 direction={direction as ResizerDirection}
                 onMayResize={onMayResize}
                 onResize={onResizeCallback}
                 onMove={onMove} />
      ))}
    </div>
  );
}

interface ResizerProps extends React.PropsWithChildren {
  direction: ResizerDirection
  onMayResize: (may_resize: boolean) => void
  onResize: (size: [number, number], delta: [number, number]) => void
  onMove: (position: [number, number]) => void
}

function Resizer({
  direction,
  onMayResize,
  onResize,
  onMove
}: Readonly<ResizerProps>) {
  const { position: managerPosition, scaleX, scaleY, revertScaleX, revertScaleY, setWheelBusy } = useContext(ManagerContext)
  const { lmb, pointer, setPointer } = useContext(SpaceContext)
  const { size, position, setResizing } = useContext(WindowContext)
  const [dragging, setDragging] = useState(false)
  const sizeRef = useRef(size)
  const positionRef = useRef(position)
  const prevDragPositionRef = useRef([0, 0])

  useEffect(() => {
    setResizing(dragging)
  }, [dragging, setResizing])

  const onResizeCallback = useCallback((size: [number, number], delta: [number, number]) => {
    onResize(size, delta)
  }, [onResize])

  useEffect(() => {
    if (!dragging) return
    
    const delta = [pointer[0] - prevDragPositionRef.current[0], pointer[1] - prevDragPositionRef.current[1]]

    if (direction === 'bottom') {
      onResizeCallback(sizeRef.current, [0, revertScaleX(delta[1])])
    } else if (direction === 'right') {
      onResizeCallback(sizeRef.current, [revertScaleX(delta[0]), 0])
    } else if (direction === 'bottom-right') {
      onResizeCallback(sizeRef.current, [revertScaleX(delta[0]), revertScaleY(delta[1])])
    } else if (direction === 'top') {
      onResizeCallback(sizeRef.current, [0, -revertScaleY(delta[1])])
      onMove([positionRef.current[0], positionRef.current[1] + delta[1]])
    } else if (direction === 'left') {
      onResizeCallback(sizeRef.current, [-revertScaleX(delta[0]), 0])
      onMove([positionRef.current[0] + delta[0], positionRef.current[1]])
    } else if (direction === 'top-left') {
      onResizeCallback(sizeRef.current, [-revertScaleX(delta[0]), -revertScaleY(delta[1])])
      onMove([positionRef.current[0] + delta[0], positionRef.current[1] + delta[1]])
    } else if (direction === 'top-right') {
      onResizeCallback(sizeRef.current, [revertScaleX(delta[0]), -revertScaleY(delta[1])])
      onMove([positionRef.current[0], positionRef.current[1] + delta[1]])
    } else if (direction === 'bottom-left') {
      onResizeCallback(sizeRef.current, [-revertScaleX(delta[0]), revertScaleY(delta[1])])
      onMove([positionRef.current[0] + delta[0], positionRef.current[1]])
    } else throw new Error('Invalid direction')
  }, [pointer, dragging, direction, onResizeCallback, onMove, scaleX, scaleY, revertScaleX, revertScaleY])

  useEffect(() => { !lmb && setDragging(false) }, [lmb])
  useEffect(() => { sizeRef.current = size }, [size])
  useEffect(() => { prevDragPositionRef.current = pointer }, [pointer])
  useEffect(() => { positionRef.current = position }, [position])

  const onMouseDown = useCallback(() => {
    onMayResize(true)
    setDragging(true)
  }, [onMayResize])

  const onMouseLeave = useCallback(() => {
    onMayResize(false)
  }, [onMayResize])

  const onTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return
    const new_pointer: [number, number] = [event.touches[0].clientX - managerPosition[0], event.touches[0].clientY - managerPosition[1]]
    setDragging(true)
    onMayResize(true)
    setWheelBusy(true)
    setPointer(new_pointer)
    prevDragPositionRef.current = new_pointer
  }, [onMayResize, setWheelBusy, setPointer, managerPosition])

  const onTouchEnd = useCallback(() => {
    setDragging(false)
    onMayResize(false)
    setWheelBusy(false)
  }, [onMayResize, setWheelBusy])

  return <div
    className={classNames([
      styles.Resizer,
      { [styles.Resizer__top]: direction === 'top' },
      { [styles.Resizer__right]: direction === 'right' },
      { [styles.Resizer__bottom]: direction === 'bottom' },
      { [styles.Resizer__left]: direction === 'left' },
      { [styles.Resizer__topRight]: direction === 'top-right' },
      { [styles.Resizer__topLeft]: direction === 'top-left' },
      { [styles.Resizer__bottomRight]: direction === 'bottom-right' },
      { [styles.Resizer__bottomLeft]: direction === 'bottom-left' },
    ])}
    draggable={false}
    onMouseDown={onMouseDown}
    onMouseLeave={onMouseLeave}
    onTouchStart={onTouchStart}
    onTouchEnd={onTouchEnd}
  ></div>
}

interface TitleBarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  onMove?: ([x, y]: [number, number]) => void
}

/**
 * @description TitleBar component, moves the window when dragged.
 */
function TitleBar({
  children = null,
  onMove = () => {},
  ...attrs
}: Readonly<TitleBarProps>) {
  const { position: managerPosition, setWheelBusy, setPointer } = useContext(ManagerContext)
  const { lmb, pointer } = useContext(SpaceContext)
  const { position, setFocused, onMoveStart, onMoveEnd, setShowResizers } = useContext(WindowContext)
  const [dragging, setDragging] = useState(false)
  const [movingPosition, setMovingPosition] = useState<[number, number]>(position)
  const moveStartPointerRef = useRef<[number, number]>([0, 0])
  const onMoveStartRef = useRef(onMoveStart)
  const onMoveEndRef = useRef(onMoveEnd)

  useEffect(() => {
    onMoveStartRef.current = onMoveStart
    onMoveEndRef.current = onMoveEnd
  }, [onMoveStart, onMoveEnd])

  useEffect(() => {
    if (dragging) {
      onMoveStartRef.current()
    } else {
      onMoveEndRef.current()
    }
  }, [dragging])
  useEffect(() => onMove([movingPosition[0], movingPosition[1]]), [movingPosition, onMove])

  useEffect(() => {
    if (!dragging) return
    setMovingPosition([pointer[0] - moveStartPointerRef.current[0], pointer[1] - moveStartPointerRef.current[1]])
  }, [dragging, pointer, moveStartPointerRef])
  
  useEffect(() => {
    if (!dragging) return
    if (lmb) return
    setDragging(false)
  }, [lmb, dragging])

  const onMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    setFocused(true)
    setDragging(true)
    const rect = event.currentTarget.getBoundingClientRect()
    moveStartPointerRef.current = [event.clientX - rect.x, event.clientY - rect.y]
  }, [setFocused])

  const onMouseUp = useCallback(() => {
    setDragging(false)
  }, [])

  const onTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return
    const touch = event.touches[0]
    const rect = event.currentTarget.getBoundingClientRect()
    const new_pointer: [number, number] = [touch.clientX - managerPosition[0], touch.clientY - managerPosition[1]]
    moveStartPointerRef.current = [touch.clientX - rect.x, touch.clientY - rect.y]
    setPointer(new_pointer)
    setWheelBusy(true)
    setDragging(true)
    setFocused(true)
    setShowResizers(true)
  }, [setWheelBusy, setFocused, setShowResizers, setPointer, managerPosition])

  const onTouchEnd = useCallback(() => setDragging(false), [])
  
  return <div
    {...(attrs as React.HTMLAttributes<HTMLDivElement>)}
    className={`${classNames([styles.TitleBar, dragging && styles.TitleBar__dragging])} ${typeof attrs.className !== 'undefined' ? attrs.className : ''}`}
    draggable={false}
    onMouseDown={onMouseDown}
    onMouseUp={onMouseUp}
    onTouchStart={onTouchStart}
    onTouchEnd={() => onTouchEnd}
    >
    {children}
    <div
      className={classNames([styles.TitleBar_stagingLayer])}
      onMouseUp={onMouseUp}
      onTouchEnd={() => onTouchEnd()}
    ></div>
  </div>
}

/**
 * @description Title component, for the title of the window.
 */
function Title({ children = null, ...attrs }: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return <div
    {...(attrs as HTMLAttributes<HTMLDivElement>)}
    className={`${classNames([styles.Title])} ${typeof attrs.className !== 'undefined' ? attrs.className : ''}`}
    draggable={false}
  >
    {children}
  </div>
}

/**
 * @description Buttons component, for the buttons of the window.
 */
function Buttons({ children = null, ...attrs }: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return <div
    {...(attrs as HTMLAttributes<HTMLDivElement>)}
    className={`${classNames([styles.Buttons])} ${typeof attrs.className !== 'undefined' ? attrs.className : ''}`}
    onClick={event => event.stopPropagation()}
    draggable={false}
  >
    {children}
  </div>
}

interface CloseButtonProps extends React.PropsWithChildren {
  children?: React.ReactNode
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}

/**
 * @description CloseButton component, for the close button of the window.
 */
function CloseButton({
  children = <div
    className={classNames([styles.Button, styles.CloseButton])}
    onClick={event => {
      event.stopPropagation()
      onClick(event)
    }}
    onMouseDown={event => event.stopPropagation()}
    onMouseUp={event => event.stopPropagation()}
    onTouchStart={event => event.stopPropagation()}
    onTouchEnd={event => event.stopPropagation()}
  >
    <div className={classNames([styles.Button_content])}>
      <span style={{ fontSize: 10 }}>✕</span>
    </div>
  </div>,
  onClick = () => {},
}: Readonly<CloseButtonProps>) {
  return children
}

interface StageButtonProps extends React.PropsWithChildren {
  children?: React.ReactNode
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}

/**
 * @description StageButton component, for minimizing the window.
 */
function StageButton({
  children = <div
    className={classNames([styles.Button, styles.StageButton])}
    onClick={event => {
      event.stopPropagation()
      onClick(event)
    }}
    onMouseDown={event => event.stopPropagation()}
    onMouseUp={event => event.stopPropagation()}
    onTouchStart={event => event.stopPropagation()}
    onTouchEnd={event => event.stopPropagation()}
  >
    <div className={classNames([styles.Button_content])}>
      <span style={{ fontSize: 10 }}>—</span>
    </div>
  </div>,
  onClick = () => {},
}: Readonly<StageButtonProps>) {
  return children
}

interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode,
  onUnfocusedWheel?: (event: React.WheelEvent<HTMLDivElement>) => boolean
}

const DEFAULT_ON_UNFOCUSED_WHEEL = (): boolean => true

/**
 * @description Content component, for the content of the window.
 */
function Content({
  children = null,
  onUnfocusedWheel = DEFAULT_ON_UNFOCUSED_WHEEL,
  ...attrs
}: Readonly<ContentProps>) {
  const { setWheelBusy } = useContext(ManagerContext)
  const { setFocused } = useContext(WindowContext)
  const fluidRef = useRef<HTMLDivElement>(null)
  
  return <div
    {...(attrs as HTMLAttributes<HTMLDivElement>)}
    className={`${classNames([styles.Content])} ${typeof attrs.className !== 'undefined' ? attrs.className : ''}`}
    onWheel={event => event.stopPropagation()}
  >
    <div className={classNames([styles.Content_fluid])} ref={fluidRef}>
      {children}
    </div>
    <div
        className={classNames([styles.Content_unfocusedLayer])}
        onClick={() => setFocused(true)}
        onWheel={event => {
          if (!onUnfocusedWheel(event)) return
          fluidRef.current?.scrollBy({ top: event.deltaY, left: 0 })
        }}
        onTouchStart={() => setWheelBusy(true)}
        onTouchEnd={() => setWheelBusy(false)}
      ></div>
  </div>
}

interface BasicWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  title?: string,
  initialSize?: [number, number],
  initialPosition?: [number, number] | 'random' | 'auto',
  opened?: boolean,
  onClose?: () => void | undefined
}

/**
 * @description BasicWindow component is a wrapper for Window component for simpler usage without having states for size and position.
 * 
 * You can use this component for simpler things, but if you need to have your own states for size and position, you should use Window component.
 */
function BasicWindow({
  children = null,
  title = 'Window',
  initialSize = [500, 400],
  initialPosition = 'auto',
  opened = true,
  onClose,
  ...attrs
}: Readonly<BasicWindowProps>) {
  const [position, setPosition] = usePosition(initialPosition)
  const [size, setSize] = useState(initialSize)
  const [openedState, setOpenedState] = useState(opened)
  const [staged, setStaged] = useState(false)
  const [kittenId,] = useKittenId()

  useEffect(() => setOpenedState(opened), [opened])

  return <>
    {openedState ? <Window
      kittenId={kittenId}
      staged={staged}
      position={position}
      size={size}
      onPositionChange={setPosition}
      onSizeChange={setSize}
      onStagedChange={setStaged}
      className={typeof attrs.className !== 'undefined' ? attrs.className : ''}
      style={attrs.style}
    >
      <TitleBar onMove={setPosition}>
        <Buttons>
          <CloseButton onClick={() => {
            setOpenedState(false)
            onClose && onClose()
          }} />
          <StageButton onClick={() => setStaged(true)} />
        </Buttons>
        <Title>{title}</Title>
      </TitleBar>
      <Content>
        {children}
      </Content>
    </Window>: null}
  </>
}

export { Window, BasicWindow, TitleBar, Title, Buttons, CloseButton, StageButton, Content }