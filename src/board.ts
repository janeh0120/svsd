import type { Transition } from 'motion/react'
import type { Camera, Cut, CutAnimation, Feel, Frame, Layer, Storyboard, Target } from './types'

export const FRAME_W = 1440
export const FRAME_H = 900

type Bezier = [number, number, number, number]

// Easing presets, all cubic beziers so the curve editor can show any of them.
export const FEELS: Record<Feel, { label: string; bezier: Bezier; ms: number }> = {
  snappy: { label: 'Snappy', bezier: [0.2, 0.9, 0.3, 1], ms: 450 },
  smooth: { label: 'Smooth', bezier: [0.65, 0, 0.35, 1], ms: 900 },
  bouncy: { label: 'Bouncy', bezier: [0.34, 1.56, 0.64, 1], ms: 1100 },
  cinematic: { label: 'Cinematic', bezier: [0.45, 0, 0.15, 1], ms: 1800 },
}

export const ANIMATIONS: Record<CutAnimation, string> = { smart: 'Smart animate', dissolve: 'Dissolve', instant: 'Instant' }

export const DEFAULT_CUT: Cut = { feel: 'smooth', note: '' }
export const DEFAULT_CAMERA: Camera = { x: 0, y: 0, w: 1 }

export const cutEase = (c: Cut): Bezier => c.bezier ?? FEELS[c.feel].bezier
export const cutMs = (c: Cut) => (c.animation === 'instant' ? 0 : (c.duration ?? FEELS[c.feel].ms))
export const cutTransition = (c: Cut): Transition => ({ duration: cutMs(c) / 1000, ease: cutEase(c) })

export function clampCamera(c: Camera): Camera {
  const w = Math.min(1, Math.max(0.2, c.w))
  return { w, x: Math.min(Math.max(0, c.x), 1 - w), y: Math.min(Math.max(0, c.y), 1 - w) }
}

export const order = (b: Storyboard) => b.chapters.flatMap((a) => a.frameIds)
export const cutKey = (from: string, to: string) => `${from}->${to}`
export const getCut = (b: Storyboard, from: string, to: string) => b.cuts[cutKey(from, to)] ?? DEFAULT_CUT
export const frameNumber = (b: Storyboard, id: string) => order(b).indexOf(id) + 1
export const chapterDuration = (b: Storyboard, chapterId: string) =>
  (b.chapters.find((a) => a.id === chapterId)?.frameIds ?? []).reduce((s, id) => s + (b.frames[id]?.hold ?? 0), 0)

export const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`

export function sameTarget(a: Target | null, b: Target | null) {
  return !!a && !!b && JSON.stringify(a) === JSON.stringify(b)
}

// Human label for what a comment points at, e.g. "Shot 2 › Title".
export function targetLabel(t: Target, b: Storyboard): string {
  switch (t.kind) {
    case 'layer': {
      const layer = b.frames[t.frameId]?.layers.find((l) => l.id === t.layerId)
      return `Shot ${frameNumber(b, t.frameId)} › ${layer?.name ?? 'layer'}`
    }
    case 'frame':
      return `Shot ${frameNumber(b, t.frameId)}`
    case 'cut': {
      const [from, to] = t.key.split('->')
      return `Cut ${frameNumber(b, from)} → ${frameNumber(b, to)}`
    }
    case 'chapter':
      return b.chapters.find((a) => a.id === t.chapterId)?.name ?? 'Chapter'
    case 'time': {
      const at = resolveTime(b, t.ms, t.layerId)
      return `${clock(t.ms)} · ${at.kind === 'time' ? 'Reel' : targetLabel(at, b)}`
    }
  }
}

// What a moment in the reel points at: the cut playing at that time, or the
// frame on screen (or a layer in it, when one was clicked in the preview).
export function resolveTime(b: Storyboard, ms: number, layerId?: string): Target {
  const t = timing(b)
  if (!t.frames.length) return { kind: 'time', ms }
  let idx = t.frames.findIndex((f) => ms < f.end)
  if (idx === -1) idx = t.frames.length - 1
  const f = t.frames[idx]
  if (idx > 0 && ms < f.start) return { kind: 'cut', key: cutKey(t.frames[idx - 1].id, f.id) }
  if (layerId && b.frames[f.id].layers.some((l) => l.id === layerId)) return { kind: 'layer', frameId: f.id, layerId }
  return { kind: 'frame', frameId: f.id }
}

// 0:07 style clock; `padMinutes` gives 00:07 for ruler labels.
export function clock(ms: number, padMinutes = false) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${padMinutes ? String(m).padStart(2, '0') : m}:${String(s % 60).padStart(2, '0')}`
}

// Scale a layer around its own center.
export function scaleLayer(l: Layer, f: number): Partial<Layer> {
  const w = Math.round(l.w * f)
  const h = Math.round(l.h * f)
  const patch: Partial<Layer> = { w, h, x: Math.round(l.x + (l.w - w) / 2), y: Math.round(l.y + (l.h - h) / 2) }
  if (l.fontSize) patch.fontSize = Math.round(l.fontSize * f)
  return patch
}

// Scale a layer around the frame's center: a camera push in or pull out.
export function zoomLayer(l: Layer, f: number): Partial<Layer> {
  const cx = FRAME_W / 2
  const cy = FRAME_H / 2
  const patch: Partial<Layer> = {
    x: Math.round(cx + (l.x - cx) * f),
    y: Math.round(cy + (l.y - cy) * f),
    w: Math.round(l.w * f),
    h: Math.round(l.h * f),
  }
  if (l.fontSize) patch.fontSize = Math.round(l.fontSize * f)
  return patch
}

// When each frame arrives and leaves, in ms. A cut plays before its frame arrives.
export function timing(b: Storyboard) {
  const ids = order(b)
  let t = 0
  const frames = ids.map((id, i) => {
    if (i > 0) t += cutMs(getCut(b, ids[i - 1], id))
    const start = t
    t += b.frames[id].hold * 1000
    return { id, start, end: t }
  })
  return { frames, total: t }
}

// The frame a target is about, for its snapshot thumbnail.
export function targetFrame(t: Target, b: Storyboard): string | undefined {
  switch (t.kind) {
    case 'layer':
    case 'frame':
      return t.frameId
    case 'cut':
      return t.key.split('->')[1]
    case 'chapter':
      return b.chapters.find((a) => a.id === t.chapterId)?.frameIds[0]
    case 'time': {
      const at = resolveTime(b, t.ms, t.layerId)
      return at.kind === 'time' ? undefined : targetFrame(at, b)
    }
  }
}

// A frame's title for its card: its name, else its caption or title text.
export function frameTitle(f: Frame): string {
  if (f.name) return f.name
  const text = (id: string) => f.layers.find((l) => l.id === id && l.kind === 'text')?.text
  return text('caption') ?? text('title') ?? f.layers.find((l) => l.kind === 'text')?.text ?? f.layers[0]?.name ?? 'Shot'
}
