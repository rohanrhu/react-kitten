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

import React, { createContext } from 'react'

export interface ManagerContextProps {
    size: [number, number]
    lmb: boolean
    pointer: [number, number]
    wheelBusy: boolean
    setWheelBusy: React.Dispatch<React.SetStateAction<boolean>>
    scale: [number, number]
    wheelSpaceSwitch: boolean
    scaleX: (x: number) => number
    scaleY: (y: number) => number
    revertScaleX: (x: number) => number
    revertScaleY: (y: number) => number
}

export const ManagerContext = createContext<ManagerContextProps>({
    size: [0, 0],
    lmb: false,
    pointer: [0, 0],
    wheelBusy: false,
    setWheelBusy: () => {},
    scale: [1, 1],
    wheelSpaceSwitch: true,
    scaleX: (x: number) => x,
    scaleY: (y: number) => y,
    revertScaleX: (x: number) => x,
    revertScaleY: (y: number) => y
})

export interface SpaceContextProps {
    focusedWindow: string | null
    setFocusedWindow: React.Dispatch<React.SetStateAction<string | null>>
    windowZIndexCounter: number
    setWindowZIndexCounter: React.Dispatch<React.SetStateAction<number>>
    stagedsRef: React.RefObject<HTMLDivElement>
    lastWindowPosition: [number, number]
    setLastWindowPosition: React.Dispatch<React.SetStateAction<[number, number]>>
}

export const SpaceContext = createContext<SpaceContextProps>({
    focusedWindow: null,
    setFocusedWindow: () => {},
    windowZIndexCounter: 0,
    setWindowZIndexCounter: () => {},
    stagedsRef: { current: null },
    lastWindowPosition: [0, 0],
    setLastWindowPosition: () => {}
})

export interface WindowContextProps {
    size: [number, number]
    position: [number, number]
    minSize: [number, number] | null
    maxSize: [number, number] | null
    moving: boolean
    focused: boolean
    setFocused: React.Dispatch<React.SetStateAction<boolean>>
    onMoveStart: () => void
    onMoveEnd: () => void,
}

export const WindowContext = createContext<WindowContextProps>({
    size: [0, 0],
    position: [0, 0],
    minSize: null,
    maxSize: null,
    moving: false,
    focused: false,
    setFocused: () => {},
    onMoveStart: () => {},
    onMoveEnd: () => {}
})