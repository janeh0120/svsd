import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Layer } from '../types'

// What a layer draws, independent of where it sits. `playing` lets a video
// layer play (in the preview); elsewhere it shows the still at its start time.
// How a text layer types itself in: starting from `from`, after `delay` ms,
// one character at a time over `duration` ms.
export type Typing = { from: string; delay: number; duration: number }

// Set on a text layer being edited in place: Enter or blur saves, Escape cancels.
export type TextEdit = { onCommit: (text: string) => void; onCancel: () => void }

export function LayerBody({ layer, playing = false, typing, edit }: { layer: Layer; playing?: boolean; typing?: Typing; edit?: TextEdit }) {
  if (layer.kind === 'video') return <VideoBody layer={layer} playing={playing} />
  if (layer.kind === 'image') {
    return (
      <img
        src={layer.src}
        draggable={false}
        className="block h-full w-full select-none"
        style={{ borderRadius: layer.radius, boxShadow: layer.shadow ? '0 30px 80px rgba(0,0,0,0.28)' : undefined }}
      />
    )
  }
  if (layer.kind === 'rect') {
    return (
      <div
        className="h-full w-full"
        style={{ background: layer.fill, borderRadius: layer.radius, border: layer.stroke ? `4px solid ${layer.stroke}` : undefined }}
      />
    )
  }
  const justify = layer.align === 'left' ? 'flex-start' : layer.align === 'right' ? 'flex-end' : 'center'
  return (
    <div
      className={`flex h-full w-full items-center whitespace-nowrap ${edit ? 'cursor-text' : 'cursor-default select-none'}`}
      style={{
        justifyContent: justify,
        fontFamily: layer.fontFamily,
        fontWeight: layer.fontWeight ?? 700,
        lineHeight: 1.05,
        letterSpacing: `${(layer.letterSpacing ?? -2) / 100}em`,
        background: layer.fill,
        borderRadius: layer.fill ? 999 : undefined,
        padding: layer.fill ? '0 0.7em' : undefined,
      }}
    >
      {edit ? <EditableText text={layer.text ?? ''} edit={edit} /> : typing ? <TypedText text={layer.text ?? ''} typing={typing} /> : layer.text}
    </div>
  )
}

// The text itself, editable in place. It focuses with everything selected and keeps the layer's own styling.
function EditableText({ text, edit }: { text: string; edit: TextEdit }) {
  const done = useRef(false)
  const finish = (value: string | null) => {
    if (done.current) return
    done.current = true
    if (value === null) edit.onCancel()
    else edit.onCommit(value)
  }
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      ref={(el) => {
        if (!el || el === document.activeElement) return
        el.focus()
        const range = document.createRange()
        range.selectNodeContents(el)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }}
      onBlur={(e) => finish(e.currentTarget.textContent ?? '')}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          e.preventDefault()
          finish(e.currentTarget.textContent ?? '')
        }
        if (e.key === 'Escape') finish(null)
      }}
      className="min-w-[1ch] cursor-text outline-none"
    >
      {text}
    </span>
  )
}

// Text that types itself out, with a blinking caret while it's being typed.
function TypedText({ text, typing }: { text: string; typing: Typing }) {
  const [shown, setShown] = useState(typing.from.length)
  useEffect(() => {
    setShown(typing.from.length)
    const remaining = text.length - typing.from.length
    if (remaining <= 0) return
    // Fast typing adds several characters per tick (about 30 ms apart), so it re-renders less while other things animate.
    const perChar = typing.duration / remaining
    const batch = Math.max(1, Math.round(30 / perChar))
    const step = perChar * batch
    let n = typing.from.length
    let timer = 0
    const tick = () => {
      n = Math.min(text.length, n + batch)
      setShown(n)
      if (n < text.length) timer = window.setTimeout(tick, step * (0.85 + Math.random() * 0.3))
    }
    timer = window.setTimeout(tick, typing.delay)
    return () => clearTimeout(timer)
  }, [text, typing.from, typing.delay, typing.duration])
  return (
    <>
      {text.slice(0, shown)}
      <span className="ml-[0.04em] inline-block h-[1.05em] w-[0.06em] animate-[caret_1s_steps(1)_infinite] bg-current align-[-0.12em]" />
    </>
  )
}

// Where a new layer starts for each entrance preset (the names follow Jitter's): it animates from
// here to its own box over the cut. Rise, the default, is handled by the players.
export const arrival = (l: Layer) => {
  const box = layerBox(l)
  const dist = Math.min(400, Math.max(80, l.w / 2))
  const scaled = (f: number) => ({ scaleX: (l.scaleX ?? 1) * f, scaleY: (l.scaleY ?? 1) * f })
  switch (l.enter) {
    case 'fade':
      return { ...box, opacity: 0 }
    case 'slide-up':
      return { ...box, opacity: 0, top: l.y + dist }
    case 'slide-down':
      return { ...box, opacity: 0, top: l.y - dist }
    case 'slide-left':
      return { ...box, opacity: 0, left: l.x - dist }
    case 'slide-right':
      return { ...box, opacity: 0, left: l.x + dist }
    case 'grow':
      return { ...box, opacity: 0, ...scaled(0.9) }
    case 'shrink':
      return { ...box, opacity: 0, ...scaled(1.15) }
    case 'spin':
      return { ...box, opacity: 0, rotate: l.rotation - 180 }
    case 'twist':
      return { ...box, opacity: 0, rotate: l.rotation - 20, ...scaled(0.9) }
    case 'blur':
      return { ...box, opacity: 0, filter: 'blur(16px)' }
    case 'blur-scale':
      return { ...box, opacity: 0, filter: 'blur(16px)', ...scaled(1.15) }
    case 'blur-slide':
      return { ...box, opacity: 0, filter: 'blur(16px)', top: l.y + 40 }
    default:
      return undefined
  }
}

// Where a layer goes when the next frame drops it: the mirror of its entrance preset.
export const departure = (l: Layer) => {
  const dist = Math.min(400, Math.max(80, l.w / 2))
  const scaled = (f: number) => ({ scaleX: (l.scaleX ?? 1) * f, scaleY: (l.scaleY ?? 1) * f })
  switch (l.exit) {
    case 'slide-up':
      return { top: l.y - dist }
    case 'slide-down':
      return { top: l.y + dist }
    case 'slide-left':
      return { left: l.x - dist }
    case 'slide-right':
      return { left: l.x + dist }
    case 'grow':
      return scaled(1.15)
    case 'shrink':
      return scaled(0.9)
    case 'spin':
      return { rotate: l.rotation + 180 }
    case 'twist':
      return { rotate: l.rotation + 20, ...scaled(0.9) }
    case 'blur':
      return { filter: 'blur(16px)' }
    case 'blur-scale':
      return { filter: 'blur(16px)', ...scaled(1.15) }
    case 'blur-slide':
      return { filter: 'blur(16px)', top: l.y - 40 }
    default:
      return {}
  }
}

// Animatable box values (used by the player).
export const layerBox = (l: Layer) => ({
  left: l.x,
  top: l.y,
  width: l.w,
  height: l.h,
  rotate: l.rotation,
  scaleX: l.scaleX ?? 1,
  scaleY: l.scaleY ?? 1,
  opacity: l.opacity,
  ...(l.kind === 'text' ? { fontSize: l.fontSize, color: l.color } : {}),
  ...(l.enter?.startsWith('blur') || l.exit?.startsWith('blur') ? { filter: 'blur(0px)' } : {}),
})

// Static CSS for the same box (used on the canvas).
export const layerStyle = (l: Layer): CSSProperties => ({
  position: 'absolute',
  left: l.x,
  top: l.y,
  width: l.w,
  height: l.h,
  opacity: l.opacity,
  transform: `rotate(${l.rotation}deg) scale(${l.scaleX ?? 1}, ${l.scaleY ?? 1})`,
  ...(l.kind === 'text' ? { fontSize: l.fontSize, color: l.color } : {}),
  ...(l.enter?.startsWith('blur') || l.exit?.startsWith('blur') ? { filter: 'blur(0px)' } : {}),
})

// A screen recording: cued to the layer's start time, playing only when asked.
function VideoBody({ layer, playing }: { layer: Layer; playing: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const start = layer.start ?? 0

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const cue = () => {
      v.currentTime = start
    }
    if (v.readyState >= 1) cue()
    else v.addEventListener('loadedmetadata', cue, { once: true })
  }, [start, layer.src])

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (playing) v.play().catch(() => {})
    else {
      // Stopped: back to this frame's first moment, ready to play again.
      v.pause()
      if (v.readyState >= 1) v.currentTime = start
    }
  }, [playing]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative h-full w-full" style={{ borderRadius: layer.radius, overflow: 'hidden' }}>
      <video ref={ref} src={layer.src} muted playsInline preload="auto" className="block h-full w-full object-cover select-none" />
      {layer.poster && !playing && <img src={layer.poster} draggable={false} className="absolute inset-0 block h-full w-full object-cover select-none" />}
    </div>
  )
}
