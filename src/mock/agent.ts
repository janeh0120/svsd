import { cutKey, getCut, resolveTime, scaleLayer, zoomLayer } from '../board'
import type { Action } from '../store'
import type { Feel, Layer, Pin, Storyboard } from '../types'

export type AgentResult = { reply: string; actions: Action[] }

const FEEL_WORDS: [RegExp, Feel][] = [
  [/snappy|punchy|quick cut/, 'snappy'],
  [/bounc|playful/, 'bouncy'],
  [/cinematic|dramatic|epic/, 'cinematic'],
  [/smooth|calm|gentle/, 'smooth'],
]

// Stand-in for the agent: reads one pinned comment and edits only its target.
// Swap for a Claude call that returns the same actions.
export function agentRespond(pin: Pin, board: Storyboard): AgentResult {
  // A moment in time edits whatever was playing then: a cut, a frame or a layer.
  if (pin.target.kind === 'time') {
    const at = resolveTime(board, pin.target.ms, pin.target.layerId)
    if (at.kind === 'time') return { reply: 'There is nothing in the reel at that moment yet.', actions: [] }
    return agentRespond({ ...pin, target: at }, board)
  }
  const t = pin.text.toLowerCase()
  const feel = FEEL_WORDS.find(([re]) => re.test(t))?.[1]
  const actions: Action[] = []
  const done: string[] = []
  const target = pin.target

  const holdChange = (frameId: string) => {
    const fr = board.frames[frameId]
    if (/longer|slower|linger/.test(t)) {
      const hold = +(fr.hold + 1).toFixed(1)
      actions.push({ type: 'frame', frameId, patch: { hold } })
      done.push(`holding for ${hold}s`)
    } else if (/shorter|faster|quicker/.test(t)) {
      const hold = Math.max(0.6, +(fr.hold - 0.6).toFixed(1))
      actions.push({ type: 'frame', frameId, patch: { hold } })
      done.push(`holding for ${hold}s`)
    }
  }

  if (target.kind === 'cut') {
    actions.push({ type: 'cut', key: target.key, patch: { note: pin.text, ...(feel ? { feel, bezier: undefined, duration: undefined } : {}) } })
    return { reply: feel ? `Switched to a ${feel} cut and saved your note.` : "Saved as this cut's note. I'll follow it when animating.", actions }
  }

  if (target.kind === 'chapter') {
    const chapter = board.chapters.find((a) => a.id === target.chapterId)
    if (!chapter) return { reply: "I can't find that chapter anymore.", actions }
    const factor = /faster|shorter|tighter|quicker/.test(t) ? 0.7 : /slower|longer/.test(t) ? 1.3 : 0
    if (factor) {
      for (const id of chapter.frameIds) actions.push({ type: 'frame', frameId: id, patch: { hold: +(board.frames[id].hold * factor).toFixed(1) } })
      done.push(factor < 1 ? 'tightened every shot in this chapter' : 'gave every shot in this chapter more time')
    }
    if (feel) {
      chapter.frameIds.slice(1).forEach((id, i) => actions.push({ type: 'cut', key: cutKey(chapter.frameIds[i], id), patch: { feel, bezier: undefined, duration: undefined } }))
      done.push(`made the cuts ${feel}`)
    }
  }

  if (target.kind === 'frame') {
    const fr = board.frames[target.frameId]
    if (!fr) return { reply: "I can't find that shot anymore.", actions }
    const f = /closer|zoom in|push in/.test(t) ? 1.3 : /wider|zoom out|pull out/.test(t) ? 0.8 : 0
    if (f) {
      for (const l of fr.layers) actions.push({ type: 'layer', frameId: fr.id, layerId: l.id, patch: zoomLayer(l, f) })
      done.push(f > 1 ? 'pushed the camera in' : 'pulled the camera out')
    }
    holdChange(fr.id)
    // "make it snappy" on a frame (or a moment in it) → the cut into this frame.
    const ids = board.chapters.flatMap((a) => a.frameIds)
    const prev = ids[ids.indexOf(fr.id) - 1]
    if (feel && prev && getCut(board, prev, fr.id).feel !== feel) {
      actions.push({ type: 'cut', key: cutKey(prev, fr.id), patch: { feel, bezier: undefined, duration: undefined } })
      done.push(`made the cut into this shot ${feel}`)
    }
  }

  if (target.kind === 'layer') {
    const fr = board.frames[target.frameId]
    const l = fr?.layers.find((x) => x.id === target.layerId)
    if (!fr || !l) return { reply: "I can't find that layer anymore.", actions }
    let patch: Partial<Layer> = {}
    if (/bigger|larger|scale up|grow/.test(t)) {
      patch = scaleLayer(l, 1.25)
      done.push('made it bigger')
    } else if (/smaller|shrink|scale down/.test(t)) {
      patch = scaleLayer(l, 0.8)
      done.push('made it smaller')
    }
    const moves = { left: [-80, 0], right: [80, 0], up: [0, -60], down: [0, 60] } as const
    for (const [dir, [dx, dy]] of Object.entries(moves)) {
      if (new RegExp(`\\b${dir}\\b`).test(t)) {
        patch.x = (patch.x ?? l.x) + dx
        patch.y = (patch.y ?? l.y) + dy
        done.push(`moved it ${dir}`)
      }
    }
    if (/hide|remove|fade out/.test(t)) {
      patch.opacity = 0
      done.push('hid it in this shot')
    } else if (/fade|subtle|dim/.test(t)) {
      patch.opacity = 0.4
      done.push('faded it back')
    }
    if (/tilt|rotate/.test(t)) {
      patch.rotation = l.rotation + 6
      done.push('tilted it')
    }
    const quoted = pin.text.match(/["“](.+?)["”]/)
    if (quoted && l.kind === 'text') {
      patch.text = quoted[1]
      done.push('changed the text')
    }
    if (Object.keys(patch).length) actions.push({ type: 'layer', frameId: fr.id, layerId: l.id, patch })
    holdChange(fr.id)
    // "make it bounce in" on a layer → the cut into this frame.
    const ids = board.chapters.flatMap((a) => a.frameIds)
    const prev = ids[ids.indexOf(fr.id) - 1]
    if (feel && prev && getCut(board, prev, fr.id).feel !== feel) {
      actions.push({ type: 'cut', key: cutKey(prev, fr.id), patch: { feel, bezier: undefined, duration: undefined } })
      done.push(`made the cut into this shot ${feel}`)
    }
  }

  if (!done.length) return { reply: "Noted. I'll use this on the next draft.", actions }
  const s = done.join(', ')
  return { reply: s[0].toUpperCase() + s.slice(1) + '.', actions }
}
