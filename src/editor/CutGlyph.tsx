import { DEFAULT_SPRING, cutEase } from '../board'
import type { Cut } from '../types'
import { springCurve } from './MotionControls'

// The easing a cut uses, drawn as a tiny plot: a bezier curve, a spring's response (it can overshoot),
// or a step for an instant cut. Sits on the connector between two shots.
export function CutGlyph({ cut, size = 14 }: { cut: Cut; size?: number }) {
  const lo = 2
  const hi = 12 // plot area inside the 14 × 14 view box
  let d: string
  if (cut.animation === 'instant') {
    d = `M${lo} ${hi} H7 V${lo} H${hi}`
  } else if (cut.custom === 'spring') {
    const pts = springCurve(cut.spring ?? DEFAULT_SPRING, 90).filter((_, i) => i % 3 === 0)
    const top = Math.max(1, ...pts)
    const px = (i: number) => lo + (i / (pts.length - 1)) * (hi - lo)
    const py = (y: number) => hi - (y / top) * (hi - lo)
    d = pts.map((y, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(y).toFixed(1)}`).join(' ')
  } else {
    const [x1, y1, x2, y2] = cutEase(cut)
    const px = (x: number) => lo + x * (hi - lo)
    const py = (y: number) => hi - y * (hi - lo)
    d = `M${px(0)} ${py(0)} C ${px(x1).toFixed(2)} ${py(y1).toFixed(2)}, ${px(x2).toFixed(2)} ${py(y2).toFixed(2)}, ${px(1)} ${py(1)}`
  }
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d={d} />
    </svg>
  )
}
