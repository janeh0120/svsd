import { useEffect, useRef, useState } from 'react'
import { FRAME_H, FRAME_W, clampCamera } from '../board'
import { LayerBody, layerStyle } from '../components/Layer'
import type { Camera, Frame } from '../types'

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
    <div className="rounded-lg bg-[#F5F5F5]">
      <svg ref={svg} viewBox="0 0 100 100" className="block aspect-square w-full touch-none select-none">
        {/* Guide lines at start and end values */}
        <line x1={px(0)} y1={py(1)} x2={px(1)} y2={py(1)} stroke="#B3B3B3" strokeWidth={0.6} />
        <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(0)} stroke="#B3B3B3" strokeWidth={0.6} />
        {/* Handle arms */}
        <line x1={px(0)} y1={py(0)} x2={px(x1)} y2={py(y1)} stroke="#0D99FF" strokeWidth={0.8} />
        <line x1={px(1)} y1={py(1)} x2={px(x2)} y2={py(y2)} stroke="#0D99FF" strokeWidth={0.8} />
        <path
          d={`M ${px(0)} ${py(0)} C ${px(x1)} ${py(y1)}, ${px(x2)} ${py(y2)}, ${px(1)} ${py(1)}`}
          fill="none"
          stroke="#1E1E1E"
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
            fill="#fff"
            stroke="#0D99FF"
            strokeWidth={1}
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={drag(h as 1 | 2)}
          />
        ))}
      </svg>
    </div>
  )
}

// A square that slides back and forth with the chosen easing and duration.
export function EasePreview({ bezier, ms }: { bezier: Bezier; ms: number }) {
  const curve = `cubic-bezier(${bezier.join(',')})`
  return (
    <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-[#F5F5F5]">
      <div
        key={`${curve}-${ms}`}
        className="size-12 border border-[#1E1E1E] bg-white"
        style={{ animation: `ease-preview ${Math.max(150, ms)}ms ${curve} infinite alternate` }}
      />
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

  const corner = 'absolute size-2.5 rounded-full border border-white bg-[#8C8C8C] shadow'
  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-lg select-none" style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}>
      <FrameView frame={frame} />
      <div className="absolute inset-0 bg-black/30" style={{ clipPath: holePath(camera) }} />
      <div
        onPointerDown={start('move')}
        className="absolute cursor-move border-2 border-[#0D99FF]"
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
