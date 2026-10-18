import { useEffect, useRef, useState } from 'react'
import { timing } from '../board'
import { domId, useApp } from '../context'
import type { Layer, Storyboard, Target } from '../types'
import { Icon } from './icons'

type Track = {
  id: string
  name: string
  frameId: string // first frame it appears in
  start: number
  end: number
  props: { label: string; keys: number[] }[]
}

// One track per layer across the whole reel, with a keyframe wherever a frame sets it.
function buildTracks(b: Storyboard): Track[] {
  const t = timing(b)
  const byId = new Map<string, { layer: Layer; frameId: string; start: number; end: number }[]>()
  for (const f of t.frames) {
    for (const layer of b.frames[f.id].layers) {
      const list = byId.get(layer.id) ?? []
      list.push({ layer, frameId: f.id, start: f.start, end: f.end })
      byId.set(layer.id, list)
    }
  }
  return [...byId.entries()].map(([id, list]) => {
    const keys = list.map((x) => x.start)
    const changes = (fn: (l: Layer) => string) => list.some((x, i) => i > 0 && fn(x.layer) !== fn(list[i - 1].layer))
    const props = [
      changes((l) => `${l.x},${l.y}`) && { label: 'Position', keys },
      changes((l) => `${l.w},${l.h},${l.scaleX},${l.scaleY},${l.fontSize}`) && { label: 'Scale', keys },
      { label: 'Opacity', keys: [list[0].start, list[list.length - 1].end] },
    ].filter(Boolean) as Track['props']
    return { id, name: list[0].layer.name, frameId: list[0].frameId, start: list[0].start, end: list[list.length - 1].end, props }
  })
}

// `nameWidth` follows the left sidebar so the track names line up with it.
export function Timeline({ height, nameWidth: LEFT }: { height: number; nameWidth: number }) {
  const { state, dispatch } = useApp()
  const { board, playhead } = state
  const t = timing(board)
  const total = t.total
  const tracks = state.phase === 'ready' ? buildTracks(board) : []
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(false)
  const [width, setWidth] = useState(1200)
  const area = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!area.current) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(area.current)
    return () => ro.disconnect()
  }, [])

  // Playing moves the playhead; the canvas highlights the frame under it.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    let ms = playhead >= total ? 0 : playhead
    const tick = (now: number) => {
      ms += now - last
      last = now
      if (ms >= total) {
        if (loop) ms = 0
        else {
          dispatch({ type: 'playhead', ms: total })
          setPlaying(false)
          return
        }
      }
      dispatch({ type: 'playhead', ms })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing]) // eslint-disable-line react-hooks/exhaustive-deps

  const seconds = Math.max(5, Math.ceil(total / 5000) * 5)
  const pxPerMs = (width - 48) / Math.max(total, 5000)
  const x = (ms: number) => ms * pxPerMs
  const current = t.frames.find((f) => playhead < f.end) ?? t.frames[t.frames.length - 1]
  const sel = state.selection
  const activeAct =
    playhead > 0 && current
      ? board.acts.find((a) => a.frameIds.includes(current.id))?.id
      : sel?.kind === 'act'
        ? sel.actId
        : sel && 'frameId' in sel
          ? board.acts.find((a) => a.frameIds.includes(sel.frameId))?.id
          : board.acts[0]?.id

  const go = (target: Target) => {
    dispatch({ type: 'select', target })
    document.getElementById(domId(target))?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  }

  const seek = (e: React.PointerEvent) => {
    const r = area.current!.getBoundingClientRect()
    const set = (cx: number) => dispatch({ type: 'playhead', ms: Math.min(total, Math.max(0, (cx - r.left - 12) / pxPerMs)) })
    set(e.clientX)
    const move = (ev: PointerEvent) => set(ev.clientX)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const mmss = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <div className="relative flex shrink-0 flex-col bg-white" style={{ height }}>
      {/* Act tabs */}
      <div className="flex h-8 shrink-0 gap-px bg-[#F5F5F5] pt-1 pr-1" style={{ paddingLeft: LEFT }}>
        {board.acts.map((act) => (
          <button
            key={act.id}
            onClick={() => go({ kind: 'act', actId: act.id })}
            className={`min-w-0 flex-1 truncate rounded-t border border-b-0 px-2 ${
              act.id === activeAct ? 'border-[#BFE3FF] bg-[#DDF0FF]' : 'border-[#E6E6E6] bg-white hover:bg-[#FAFAFA]'
            }`}
          >
            {act.label}
          </button>
        ))}
      </div>

      {/* Controls + ruler */}
      <div className="flex h-8 shrink-0 border-y border-[#E6E6E6]">
        <div className="flex shrink-0 items-center gap-2 px-2" style={{ width: LEFT }}>
          <button onClick={() => total > 0 && setPlaying(!playing)} title={playing ? 'Pause' : 'Play'}>
            {playing ? <Icon.Pause size={12} /> : <Icon.Play size={12} />}
          </button>
          <Icon.Diamond size={12} />
          <span className="flex h-5 items-center gap-2 rounded bg-[#F5F5F5] px-1.5 text-[11px]">
            <span className="text-[#8C8C8C]">{mmss(playhead)}</span>
            {Math.round(total)} ms
          </span>
          <button onClick={() => setLoop(!loop)} className={loop ? 'text-[#0D99FF]' : ''} title="Loop">
            <Icon.Loop size={12} />
          </button>
          <Icon.Filter size={12} className="ml-auto" />
        </div>
        <div ref={area} className="relative min-w-0 flex-1 cursor-pointer" onPointerDown={seek}>
          {Array.from({ length: seconds / 5 + 1 }, (_, i) => (
            <div key={i} className="absolute top-0 h-full" style={{ left: 12 + x(i * 5000) }}>
              <div className="h-1.5 w-px bg-[#D9D9D9]" />
              <span className="absolute top-3 -translate-x-1/2 text-[11px] text-[#8C8C8C]">{i * 5}s</span>
            </div>
          ))}
          {Array.from({ length: seconds + 1 }, (_, s) =>
            s % 5 ? <div key={s} className="absolute top-0 h-1 w-px bg-[#E6E6E6]" style={{ left: 12 + x(s * 1000) }} /> : null,
          )}
        </div>
      </div>

      {/* Tracks */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {state.phase !== 'ready' && (
          <p className="py-3 text-[11px] text-[#B3B3B3]" style={{ paddingLeft: LEFT + 12 }}>
            {state.phase === 'animating' ? 'Animating…' : state.phase === 'empty' ? '' : 'Animation tracks appear once you approve the storyboard.'}
          </p>
        )}
        {tracks.map((tr) => (
          <div key={tr.id}>
            <div className="flex h-8 border-b border-[#F0F0F0]">
              <button
                onClick={() => go({ kind: 'layer', frameId: tr.frameId, layerId: tr.id })}
                className="flex shrink-0 items-center gap-2 truncate px-3 text-left hover:bg-[#F5F5F5]"
                style={{ width: LEFT }}
              >
                <Icon.Group size={12} className="shrink-0 text-[#8C8C8C]" />
                <span className="truncate">{tr.name}</span>
              </button>
              <div className="relative flex-1">
                <div className="absolute top-2 h-4 rounded-sm bg-[#E5E5E5]" style={{ left: 12 + x(tr.start), width: Math.max(4, x(tr.end) - x(tr.start)) }} />
              </div>
            </div>
            {tr.props.map((p) => (
              <div key={p.label} className="flex h-6 border-b border-[#F0F0F0]">
                <div className="flex shrink-0 items-center pr-3 pl-8 text-[11px] text-[#8C8C8C]" style={{ width: LEFT }}>
                  {p.label}
                  <Icon.Diamond size={10} className="ml-auto" />
                </div>
                <div className="relative flex-1">
                  {p.keys.map((k, i) => (
                    <Icon.Diamond key={i} size={10} className="absolute top-[7px] -translate-x-1/2 text-[#8C8C8C]" style={{ left: 12 + x(k) }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Playhead: from the ruler down through the tracks */}
      <div className="pointer-events-none absolute top-8 bottom-0 z-20 w-0" style={{ left: LEFT + 12 + x(playhead) }}>
        <div className="absolute -left-[5px] top-0 size-[11px] rounded-full bg-[#0D99FF]" />
        <div className="absolute top-0 bottom-0 left-0 w-px bg-[#0D99FF]" />
      </div>
      <button className="absolute right-3 bottom-3 z-30 flex size-6 items-center justify-center rounded-full border border-[#E6E6E6] bg-white text-[11px] shadow-sm">
        ?
      </button>
    </div>
  )
}
