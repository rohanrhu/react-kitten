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

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'

import { ManagerContext, SpaceContext } from '../../contexts'

import styles from './Space.module.css'

const DEFAULT_AUTO_HIDE_STAGEDS: boolean = false

export interface SpaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  autoHideStageds?: boolean
}

/**
 * @description Space component is a container for windows.
 * 
 * @param children Accepts any component as children and also accepts {@link Window} components inside
 */
function Space({
  children = null,
  autoHideStageds = DEFAULT_AUTO_HIDE_STAGEDS,
  ...attrs
}: SpaceProps) {
  const { size, pointer, setWheelBusy } = useContext(ManagerContext)
  const stagedsRef = useRef<HTMLDivElement>(null)
  const [focusedWindow, setFocusedWindow] = useState<string | null>(null)
  const [lastWindowPosition, setLastWindowPosition] = React.useState<[number, number]>([0, 0])
  const [windowZIndexCounter, setWindowZIndexCounter] = React.useState<number>(1000)
  const [showStageds, setShowStageds] = useState<boolean>(!autoHideStageds)

  useEffect(() => setShowStageds(pointer[0] <= 150), [pointer])
  
  const contextProps = useMemo(() => ({
    stagedsRef, focusedWindow, setFocusedWindow, lastWindowPosition, setLastWindowPosition, windowZIndexCounter, setWindowZIndexCounter
  }), [stagedsRef, focusedWindow, setFocusedWindow, lastWindowPosition, setLastWindowPosition, windowZIndexCounter, setWindowZIndexCounter])

  return <SpaceContext.Provider value={contextProps}>
    <div
      {...attrs}
      className={`${classNames([
        styles.Space,
        { [styles.Space__autoHideStageds]: autoHideStageds },
        { [styles.Space__showStageds]: showStageds },
      ])} ${typeof attrs.className !== 'undefined' ? attrs.className : ''}`}
      style={{
        minWidth: size[0],
        height: size[1],
        ...attrs.style
      }}
    >
      {children}
      <div
        ref={stagedsRef}
        className={classNames([styles.Space_stageds])}
        onMouseOver={() => setWheelBusy(true)}
        onMouseLeave={() => setWheelBusy(false)}
      ></div>
    </div>
  </SpaceContext.Provider>
}

export { Space }