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

import React, {useState, useRef, useEffect, useCallback, useContext, HTMLAttributes } from 'react'
import classNames from 'classnames'

import { ManagerContext } from '../../contexts'

import styles from './Spaces.module.css'

export interface SpacesProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  bounceDelay?: number
  scrollThreshold?: number
  swipeThreshold?: number
  space: number
  onSpaceChange: (space: number) => void
}

/**
 * @description Spaces component is a container for Space components.
 * 
 * @param children Accepts only {@link Space} components as children
 * @param bounceDelay Delay for the bounce effect
 * @param scrollThreshold Threshold for the scroll
 * @param swipeThreshold Threshold for the swipe
 * @param space Current space
 * @param onSpaceChange Callback for space change
 */
function Spaces({
  children = null,
  bounceDelay = 200,
  scrollThreshold = 200,
  swipeThreshold = 200,
  space = 0,
  onSpaceChange = () => {},
  ...attrs
}: SpacesProps) {
  const { size, wheelBusy, scaleX, scaleY, wheelSpaceSwitch } = useContext(ManagerContext)
  const [scrollX, setScrollX] = useState(0)
  const bounceTimeoutRef = useRef<Timer>()
  const touchStartRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    const total = React.Children.count(children)
    onSpaceChange(space >= total ? total - 1: space)
  }, [space, children, onSpaceChange])

  useEffect(() => setScrollX(space * size[0] * -1), [space, size])
  
  const onWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (wheelBusy) return
    if (!wheelSpaceSwitch) return

    const spaces = React.Children.count(children)
    
    const scaled_delta = [scaleX(event.deltaX), scaleY(event.deltaY)]
    const delta = scaled_delta[0] || scaled_delta[1]
    const current_x = space * size[0]

    clearTimeout(bounceTimeoutRef.current)

    if ((scrollX - delta > 0 && space > 0) || (scrollX - delta < 0 && space < spaces-1)) {
      setScrollX(scrollX - delta)
    }

    bounceTimeoutRef.current = setTimeout(() => {
      if (Math.abs(scrollX - current_x) > scaleX(scrollThreshold)) {
        onSpaceChange(Math.min(Math.max(0, space + Math.sign(delta)), spaces - 1))
      } else {
        setScrollX(space * size[0] * -1)
      }
    }, bounceDelay)
  }, [space, size, scrollThreshold, scrollX, bounceDelay, onSpaceChange, children, wheelBusy, scaleX, scaleY, wheelSpaceSwitch])

  const onTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    touchStartRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }, [])
  
  const onTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (wheelBusy) return
    if (!wheelSpaceSwitch) return

    if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLAnchorElement || event.target instanceof HTMLAreaElement ||
        event.target instanceof HTMLAudioElement || event.target instanceof HTMLVideoElement ||
        event.target instanceof HTMLDetailsElement || event.target instanceof HTMLDialogElement ||
        event.target instanceof HTMLDetailsElement || event.target instanceof HTMLDialogElement
    ) return
  
    const spaces = React.Children.count(children)
    
    const touch = event.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    const scaled_delta = [-scaleX(deltaX), -scaleY(deltaY)]
    const delta = scaled_delta[0] || scaled_delta[1]
    const current_x = space * size[0]
  
    clearTimeout(bounceTimeoutRef.current)
  
    if (((scrollX - scaled_delta[0] > 0 && space > 0) || (scrollX - scaled_delta[0] < 0 && space < spaces - 1)) && (Math.abs(scaled_delta[0]) > swipeThreshold * 0.25)) {
      setScrollX(scrollX - delta)
    } else {
      setScrollX(space * size[0] * -1)
    }
  
    bounceTimeoutRef.current = setTimeout(() => {
      if (Math.abs(scrollX - current_x) > scaleX(swipeThreshold)) {
        onSpaceChange(Math.min(Math.max(0, space + Math.sign(delta)), spaces - 1))
      } else {
        setScrollX(space * size[0] * -1)
      }
    }, bounceDelay)
  }, [space, size, swipeThreshold, scrollX, bounceDelay, onSpaceChange, children, wheelBusy, scaleX, scaleY, wheelSpaceSwitch])
  
  return <div
    {...(attrs as HTMLAttributes<HTMLDivElement>)}
    className={`${classNames([styles.Spaces])} ${typeof attrs.className !== 'undefined' ? attrs.className : ''}`}
    style={{ width: size[0], height: size[1], ...attrs.style }}
    onWheel={onWheel}
    onTouchStart={onTouchStart}
    onTouchMove={onTouchMove}
  >
    <div
      className={classNames([styles.Spaces_scrolling])}
      style={{ transform: `translateX(${scrollX}px)` }}
    >
      {children}
    </div>
  </div>
}

export { Spaces }