import { useReducedMotion, type Transition } from 'motion/react'
import { UI_EASE } from '../board'

// Shared motion for the editor's own UI (menus, panels, chat, toolbar), not the video.
// Everything eases out hard and settles softly, and cuts to nothing under reduced motion.
const SPRING: Transition = { type: 'spring', stiffness: 520, damping: 36, mass: 0.8 }

export function useUiMotion() {
  const reduce = useReducedMotion()
  const tween = (duration: number, delay = 0): Transition => (reduce ? { duration: 0 } : { duration, delay, ease: UI_EASE })
  const spring: Transition = reduce ? { duration: 0 } : SPRING
  // A floating menu: grows out of the point it opens from (drifting down, or up when `up`),
  // and leaves a little faster than it arrives.
  const popover = (origin: string, up = false) => ({
    initial: { opacity: 0, scale: 0.94, y: up ? 6 : -6 },
    animate: { opacity: 1, scale: 1, y: 0, transition: spring },
    exit: { opacity: 0, scale: 0.97, y: up ? 3 : -3, transition: tween(0.12) },
    style: { transformOrigin: origin },
  })
  return { reduce, tween, spring, popover }
}
