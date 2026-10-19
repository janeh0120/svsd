import { useSyncExternalStore } from 'react'

// The storyboard canvas owns its zoom; this lets the right panel show it and ask for a new one.
let zoom = 1
let handler: ((z: number) => void) | null = null
const listeners = new Set<() => void>()

export const publishZoom = (z: number) => {
  zoom = z
  listeners.forEach((l) => l())
}
export const onZoomRequest = (fn: (z: number) => void) => {
  handler = fn
  return () => {
    handler = null
  }
}
export const requestZoom = (z: number) => handler?.(z)
export const useCanvasZoom = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => zoom,
  )
