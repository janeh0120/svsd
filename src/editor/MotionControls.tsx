import { useEffect, useRef, useState } from 'react'
import { FRAME_H, FRAME_W, clampCamera } from '../board'
import { LayerBody, layerStyle } from '../components/Layer'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import type { Camera, CutAnimation, Frame } from '../types'

type Bezier = [number, number, number, number]

// Curve editor for a cubic bezier: drag the two handles. x stays within 0–1,
// y may overshoot (for bouncy curves).
export function BezierEditor({ value, onChange }: { value: Bezier; onChange: (b: Bezier) => void }) {
  const svg = useRef<SVGSVGElement>(null)
  const [x1, y1, x2, y2] = value
  // Graph space: x 0→1 maps to 15→85, y 0→1 maps to 75→25 (room above and below for overshoot).
  const px = (x: number) => 15 + x * 70
  const py = (y: number) => 75 - y * 50

  const drag = (handle: 1 | 2) => (e: React.PointerEvent) => {
    e.preventDefault()
    const r = svg.current!.getBoundingClientRect()
    const move = (ev: PointerEvent) => {
      const gx = ((ev.clientX - r.left) / r.width) * 100
      const gy = ((ev.clientY - r.top) / r.height) * 100
      const x = Math.min(1, Math.max(0, (gx - 15) / 70))
      const y = Math.min(1.5, Math.max(-0.5, (75 - gy) / 50))
      const round = (n: number) => Math.round(n * 100) / 100
      onChange(handle === 1 ? [round(x), round(y), x2, y2] : [x1, y1, round(x), round(y)])
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="rounded-tile bg-control">
      <svg ref={svg} viewBox="0 0 100 100" className="block aspect-square w-full touch-none select-none">
        {/* Guide lines at start and end values */}
        <line x1={px(0)} y1={py(1)} x2={px(1)} y2={py(1)} style={{ stroke: 'var(--line-strong)' }} strokeWidth={0.6} />
        <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(0)} style={{ stroke: 'var(--line-strong)' }} strokeWidth={0.6} />
        {/* Handle arms */}
        <line x1={px(0)} y1={py(0)} x2={px(x1)} y2={py(y1)} style={{ stroke: 'var(--accent-line)' }} strokeWidth={0.8} />
        <line x1={px(1)} y1={py(1)} x2={px(x2)} y2={py(y2)} style={{ stroke: 'var(--accent-line)' }} strokeWidth={0.8} />
        <path
          d={`M ${px(0)} ${py(0)} C ${px(x1)} ${py(y1)}, ${px(x2)} ${py(y2)}, ${px(1)} ${py(1)}`}
          fill="none"
          style={{ stroke: 'var(--ink)' }}
          strokeWidth={1.4}
        />
        {[
          [x1, y1, 1],
          [x2, y2, 2],
        ].map(([x, y, h]) => (
          <circle
            key={h}
            cx={px(x)}
            cy={py(y)}
            r={2.6}
            style={{ fill: 'var(--raised)', stroke: 'var(--accent-line)' }}
            strokeWidth={1}
            className="cursor-hand active:cursor-hand-grabbing"
            onPointerDown={drag(h as 1 | 2)}
          />
        ))}
      </svg>
    </div>
  )
}

// A mini cut between two frames that loops with the chosen transition, easing and duration:
// Smart animate moves and scales the same block (so back easings overshoot), Dissolve crossfades
// two different frames, and Instant swaps them with no blend.
export function EasePreview({ bezier, ms, animation }: { bezier: Bezier; ms: number; animation: CutAnimation }) {
  const p = useMotionValue(0)
  const curve = bezier.join(',')

  useEffect(() => {
    p.set(0)
    const controls =
      animation === 'instant'
        ? animate(p, 1, { duration: 1.4, ease: 'linear', repeat: Infinity, repeatType: 'reverse' })
        : animate(p, 1, { duration: Math.max(0.15, ms / 1000), ease: bezier, repeat: Infinity, repeatType: 'reverse', repeatDelay: 0.6 })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curve, ms, animation, p])

  // Not clamped, so an overshooting curve visibly overshoots.
  const free = { clamp: false }
  const x = useTransform(p, [0, 1], [-62, 62], free)
  const scale = useTransform(p, [0, 1], [1, 1.5], free)
  const radius = useTransform(p, [0, 1], [4, 14], free)
  const barScale = useTransform(p, [0, 1], [1, 20 / 56], free)
  const toB = useTransform(p, (v) => (animation === 'instant' ? (v < 0.5 ? 0 : 1) : Math.min(1, Math.max(0, v))))
  const toA = useTransform(toB, (v) => 1 - v)

  const block = 'absolute top-1/2 left-1/2 size-8 -mt-4 -ml-4 bg-secondary'
  return (
    <div className="relative h-24 overflow-hidden rounded-tile bg-control">
      {animation === 'smart' ? (
        <>
          <motion.div className={block} style={{ x, scale, borderRadius: radius }} />
          <motion.div className="absolute bottom-3 left-1/2 -ml-8 h-1.5 w-16 origin-center rounded-full bg-line-strong" style={{ scaleX: barScale }} />
        </>
      ) : (
        <>
          <motion.div className="absolute inset-0" style={{ opacity: toA }}>
            <div className={block} style={{ transform: 'translateX(-62px)', borderRadius: 4 }} />
            <div className="absolute bottom-3 left-1/2 -ml-8 h-1.5 w-16 rounded-full bg-line-strong" />
          </motion.div>
          <motion.div className="absolute inset-0 bg-raised" style={{ opacity: toB }}>
            <div className={block} style={{ transform: 'translateX(62px) scale(1.5)', borderRadius: 14 }} />
            <div className="absolute bottom-3 left-1/2 -ml-2.5 h-1.5 w-5 rounded-full bg-line-strong" />
          </motion.div>
        </>
      )}
      <span className="absolute top-1.5 left-2 text-[10px] text-subtle">{animation === 'instant' ? 'Instant' : `${Math.round(ms)} ms`}</span>
    </div>
  )
}

// Pan & zoom: the whole frame with the camera box on top. Drag to move, drag a
// corner to resize; the box keeps the frame's aspect ratio.
export function CameraEditor({ frame, camera, onChange }: { frame: Frame; camera: Camera; onChange: (c: Camera) => void }) {
  const box = useRef<HTMLDivElement>(null)

  const start = (mode: 'move' | 'tl' | 'tr' | 'bl' | 'br') => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const r = box.current!.getBoundingClientRect()
    const sx = e.clientX
    const sy = e.clientY
    const c0 = camera
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / r.width
      const dy = (ev.clientY - sy) / r.height
      if (mode === 'move') return onChange(clampCamera({ ...c0, x: c0.x + dx, y: c0.y + dy }))
      // Resize from a corner; the opposite corner stays put.
      const grow = mode === 'br' || mode === 'tr' ? dx : -dx
      const w = Math.min(1, Math.max(0.2, c0.w + grow))
      const x = mode === 'tl' || mode === 'bl' ? c0.x + c0.w - w : c0.x
      const y = mode === 'tl' || mode === 'tr' ? c0.y + c0.w - w : c0.y
      onChange(clampCamera({ w, x, y }))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const corner = 'absolute size-2.5 rounded-full border border-raised bg-muted shadow'
  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-tile select-none" style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}>
      <FrameView frame={frame} />
      <div className="absolute inset-0 bg-black/30" style={{ clipPath: holePath(camera) }} />
      <div
        onPointerDown={start('move')}
        className="absolute cursor-move border-2 border-accent-line"
        style={{ left: `${camera.x * 100}%`, top: `${camera.y * 100}%`, width: `${camera.w * 100}%`, height: `${camera.w * 100}%` }}
      >
        <span onPointerDown={start('tl')} className={`${corner} -top-1.5 -left-1.5 cursor-nwse-resize`} />
        <span onPointerDown={start('tr')} className={`${corner} -top-1.5 -right-1.5 cursor-nesw-resize`} />
        <span onPointerDown={start('bl')} className={`${corner} -bottom-1.5 -left-1.5 cursor-nesw-resize`} />
        <span onPointerDown={start('br')} className={`${corner} -right-1.5 -bottom-1.5 cursor-nwse-resize`} />
      </div>
    </div>
  )
}

// Dim everything outside the camera box.
function holePath(c: Camera) {
  const l = c.x * 100
  const t = c.y * 100
  const r = (c.x + c.w) * 100
  const b = (c.y + c.w) * 100
  return `polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${l}% ${t}%, ${l}% ${b}%, ${r}% ${b}%, ${r}% ${t}%, ${l}% ${t}%)`
}

// The frame drawn to fill its container width.
function FrameView({ frame }: { frame: Frame }) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className="absolute inset-0">
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: FRAME_W, height: FRAME_H, background: frame.background, transform: `scale(${w / FRAME_W})` }}
      >
        {frame.layers.map((l) => (
          <div key={l.id} style={layerStyle(l)}>
            <LayerBody layer={l} />
          </div>
        ))}
      </div>
    </div>
  )
}
