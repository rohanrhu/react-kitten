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

import React, { useState, useMemo, useCallback, HTMLAttributes, useEffect, useRef } from 'react'
import classNames from "classnames"

import { ManagerContext } from './library'

import styles from './Manager.module.css'

const DEFAULT_SIZE: [number, number] = [800, 600]
const DEFAULT_SCALE: [number, number] = [1, 1]

interface ManagerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  size?: [number, number]
  scale?: [number, number]
  wheelSpaceSwitch?: boolean
}

/**
 * @description Manager component is the main component of the React﹤Kitten﹥.
 * @param children Accepts only {@link Spaces} component as children
 * @param size Size of the Manager
 * @param scale Scale vector of the whole Manager
 */
export function Manager({
  children = null,
  size = DEFAULT_SIZE,
  scale = DEFAULT_SCALE,
  wheelSpaceSwitch = true,
  ...attrs
}: ManagerProps) {
  const [position, setPosition] = useState<[number, number]>([0, 0])
  const [pointer, setPointer] = useState<[number, number]>([0, 0])
  const [lmb, setLmb] = useState<boolean>(false)
  const [wheelBusy, setWheelBusy] = useState<boolean>(false)
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null)
  const prevRect = useRef<DOMRect | null>(null)

  const scaleX = useCallback((x: number) => x * scale[0], [scale])
  const scaleY = useCallback((y: number) => y * scale[1], [scale])

  const revertScaleX = useCallback((x: number) => x / scale[0], [scale])
  const revertScaleY = useCallback((y: number) => y / scale[1], [scale])

  const contextProps = useMemo(() => ({ position, pointer, setPointer, lmb, size, wheelBusy, setWheelBusy, wheelSpaceSwitch, scale, scaleX, scaleY, revertScaleX, revertScaleY }),
                                      [ position, pointer, lmb, size, wheelBusy, wheelSpaceSwitch, scale, scaleX, scaleY, revertScaleX, revertScaleY ])

  useEffect(() => {!lmb && setWheelBusy(false)}, [lmb])

  const onMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const new_pointer: [number, number] = [event.clientX - rect.x, event.clientY - rect.y]
    setPointer(new_pointer)
  }, [])

  const onTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 1) return
      const touch = event.touches[0]
      const rect = event.currentTarget.getBoundingClientRect()
      const new_pointer: [number, number] = [touch.clientX - rect.x, touch.clientY - rect.y]
      setPointer(new_pointer)
  }, [])
  
  return <ManagerContext.Provider value={contextProps}>
    <div
      {...(attrs as HTMLAttributes<HTMLDivElement>)}
      ref={(ref) => {
        if (intersectionObserverRef.current) intersectionObserverRef.current.disconnect()
        if (!ref) return
        const observer = new IntersectionObserver((entries) => {
          if (entries.length === 0) return
          const entry = entries[0]
          if (!entry.isIntersecting) return

          const rect = ref.getBoundingClientRect()

          if (!prevRect.current || (prevRect.current.x == rect.x &&
                                    prevRect.current.y == rect.y)) return

          setPosition([rect.x, rect.y])
          prevRect.current = rect
        }, { threshold: 0 })
        observer.observe(ref)
        intersectionObserverRef.current = observer
      }}
      className={`${classNames([styles.Manager])} ${typeof attrs.className !== 'undefined' ? attrs.className : ''}`}
      style={{
        width: size[0], height: size[1],
        transform: `scale(${scale[0]}, ${scale[1]})`,
        ...attrs.style
      }}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      onMouseDown={() => setLmb(true)}
      onMouseUp={() => setLmb(false)}
      onTouchStart={() => setLmb(true)}
      onTouchEnd={() => setLmb(false)}
    >
      {children}
    </div>
  </ManagerContext.Provider>
}