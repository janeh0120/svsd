import type { Transition } from 'motion/react'
import type { Cut, Feel, Layer, Storyboard, Target } from './types'

export const FRAME_W = 1440
export const FRAME_H = 900

export const FEELS: Record<Feel, { label: string; transition: Transition; ms: number }> = {
  snappy: { label: 'Snappy', transition: { type: 'spring', stiffness: 420, damping: 34 }, ms: 450 },
  smooth: { label: 'Smooth', transition: { duration: 0.9, ease: [0.65, 0, 0.35, 1] }, ms: 900 },
  bouncy: { label: 'Bouncy', transition: { type: 'spring', stiffness: 180, damping: 11 }, ms: 1100 },
  cinematic: { label: 'Cinematic', transition: { duration: 1.8, ease: [0.45, 0, 0.15, 1] }, ms: 1800 },
}

export const DEFAULT_CUT: Cut = { feel: 'smooth', note: '' }

export const order = (b: Storyboard) => b.acts.flatMap((a) => a.frameIds)
export const cutKey = (from: string, to: string) => `${from}->${to}`
export const getCut = (b: Storyboard, from: string, to: string) => b.cuts[cutKey(from, to)] ?? DEFAULT_CUT
export const frameNumber = (b: Storyboard, id: string) => order(b).indexOf(id) + 1
export const actDuration = (b: Storyboard, actId: string) =>
  (b.acts.find((a) => a.id === actId)?.frameIds ?? []).reduce((s, id) => s + (b.frames[id]?.hold ?? 0), 0)

export const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`

export function sameTarget(a: Target | null, b: Target | null) {
  return !!a && !!b && JSON.stringify(a) === JSON.stringify(b)
}

// Human label for what a comment points at, e.g. "Frame 2 › Title".
export function targetLabel(t: Target, b: Storyboard): string {
  switch (t.kind) {
    case 'layer': {
      const layer = b.frames[t.frameId]?.layers.find((l) => l.id === t.layerId)
      return `Frame ${frameNumber(b, t.frameId)} › ${layer?.name ?? 'layer'}`
    }
    case 'frame':
      return `Frame ${frameNumber(b, t.frameId)}`
    case 'cut': {
      const [from, to] = t.key.split('->')
      return `Cut ${frameNumber(b, from)} → ${frameNumber(b, to)}`
    }
    case 'act':
      return b.acts.find((a) => a.id === t.actId)?.name ?? 'Act'
  }
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
    if (i > 0) t += FEELS[getCut(b, ids[i - 1], id).feel].ms
    const start = t
    t += b.frames[id].hold * 1000
    return { id, start, end: t }
  })
  return { frames, total: t }
}
