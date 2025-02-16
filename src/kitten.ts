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

export const version = '0.4.10.git'

export function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function hashKittenIds(ids: string[]): string {
  return ids.slice().sort((a, b) => a.localeCompare(b)).join('')
}

export function nonZeroPosition(position: [number, number]): [number, number] {
  const compensated: [number, number] = [
    (position[0] < 0) ? 0 : position[0],
    (position[1] < 0) ? 0 : position[1]
  ]
  return compensated
}

export class EventDispatcher<T, E> {
  private readonly listeners: Map<T, ((event?: E) => void)[]> = new Map()

  addListener<C>(type: T, listener: (event: C) => void) {
    const listeners = this.listeners.get(type)
    if (!listeners) {
      this.listeners.set(type, [listener as any]) // eslint-disable-line @typescript-eslint/no-explicit-any
      return
    }
    listeners.push(listener as any) // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  setListener<C>(type: T, listener: (event: C) => void) {
    const listeners = this.listeners.get(type)
    if (!listeners) {
      this.listeners.set(type, [listener as any]) // eslint-disable-line @typescript-eslint/no-explicit-any
      return
    }
    const index = listeners.indexOf(listener as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    if (index !== -1) listeners[index] = listener as any // eslint-disable-line @typescript-eslint/no-explicit-any
    else listeners.push(listener as any) // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  dispatch(name: T, event?: E) {
    const listeners = this.listeners.get(name as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!listeners) return
    listeners.forEach(listener => listener(event))
  }

  removeListener<C>(type: T, listener: (event: C) => void) {
    const listeners = this.listeners.get(type as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!listeners) return
    const index = listeners.indexOf(listener as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    if (index !== -1) listeners.splice(index, 1)
  }

  removeListeners(type: T) {
    this.listeners.delete(type)
  }

  removeAllListeners() {
    this.listeners.clear()
  }
}