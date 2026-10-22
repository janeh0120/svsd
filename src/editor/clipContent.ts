import { useSyncExternalStore } from 'react'

// Editor-only view option: clip each shot's content to its frame or let it show
// past the edge, so off-canvas layers are easy to grab. The rendered video
// always clips. Persists per viewer, like the panel sizes.
const KEY = 'svsd:clip-content'
const read = () => {
  try {
    return localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}

let clip = read()
const listeners = new Set<() => void>()

export const setClipContent = (v: boolean) => {
  clip = v
  try {
    localStorage.setItem(KEY, v ? '1' : '0')
  } catch {
    /* storage unavailable: the choice just lasts this session */
  }
  listeners.forEach((l) => l())
}

export const useClipContent = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => clip,
  )
