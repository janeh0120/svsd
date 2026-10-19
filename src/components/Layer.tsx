import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Layer } from '../types'

// What a layer draws, independent of where it sits. `playing` lets a video
// layer play (in the preview); elsewhere it shows the still at its start time.
// How a text layer types itself in: starting from `from`, after `delay` ms,
// one character at a time over `duration` ms.
export type Typing = { from: string; delay: number; duration: number }

export function LayerBody({ layer, playing = false, typing }: { layer: Layer; playing?: boolean; typing?: Typing }) {
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
      className="flex h-full w-full items-center whitespace-nowrap select-none"
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
      {typing ? <TypedText text={layer.text ?? ''} typing={typing} /> : layer.text}
    </div>
  )
}

// Text that types itself out, with a blinking caret while it's being typed.
function TypedText({ text, typing }: { text: string; typing: Typing }) {
  const [shown, setShown] = useState(typing.from.length)
  useEffect(() => {
    setShown(typing.from.length)
    const remaining = text.length - typing.from.length
    if (remaining <= 0) return
    const step = typing.duration / remaining
    let n = typing.from.length
    let timer = 0
    const tick = () => {
      n += 1
      setShown(n)
      if (n < text.length) timer = window.setTimeout(tick, step * (0.6 + Math.random() * 0.8))
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
    <video
      ref={ref}
      src={layer.src}
      muted
      playsInline
      preload="auto"
      className="block h-full w-full object-cover select-none"
      style={{ borderRadius: layer.radius }}
    />
  )
}
