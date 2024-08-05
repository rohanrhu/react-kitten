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

import { useState, useContext } from "react"

import { ManagerContext, SpaceContext } from "./contexts"

/**
 * @description Hook for generating a random Kitten IDs. Always use for {@link Window} components.
 * @returns A random Kitten ID state. No setter function.
 * @example `const id = useKittenId()` and `<Window id={id} ... />`
 */
export function useKittenId(): [string, React.Dispatch<React.SetStateAction<string>>] {
  const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  const [state, setState] = useState<string>(uuid)
  return [state, setState] as const
}

/**
 * @description Hook for setting the initial position of a window
 * 
 * @param initial_position Initial position of the window accepted as a tuple of two numbers, 'random' or 'auto'
 * @returns A tuple containing the actual first position and state setter function
 */
export function usePosition(initial_position: [number, number] | 'random' | 'auto'): [[number, number], React.Dispatch<React.SetStateAction<[number, number]>>] {
  const { size } = useContext(ManagerContext)
  const { lastWindowPosition } = useContext(SpaceContext)
  
  let position: [number, number]

  if (initial_position === 'random') {
    position = [Math.floor(Math.random() * size[0]), Math.floor(Math.random() * size[1])]
  } else if (initial_position === 'auto') {
    position = [lastWindowPosition[0] + 20, lastWindowPosition[1] + 20]
  } else {
    position = initial_position
  }

  const [state, setState] = useState<[number, number]>(position)

  return [state, setState] as const
}

/**
 * @description Hook for setting the initial size of a window
 * 
 * @param initial_size Initial size of the window accepted as a tuple of two numbers
 * @returns A tuple containing the actual first size and state setter function
 */
export function useSize(initial_size: [number, number]): [[number, number], React.Dispatch<React.SetStateAction<[number, number]>>] {
  const [state, setState] = useState<[number, number]>(initial_size)

  return [state, setState] as const
}