import { useEffect, useRef, useState } from 'react'
import { clock, cutKey, cutMs, getCut, order, timing } from '../board'
import { FrameThumb } from '../components/FrameThumb'
import { domId, useApp } from '../context'
import type { Target } from '../types'
import { Icon } from './icons'
import { PinMarker } from './Pin'

const ACCENT = 'var(--accent)' // lime: the act under the playhead
const ACCENT_LINE = 'var(--accent-line)' // lime strokes: playhead, selected clip
const THUMB_H = 28

// Transport, ruler, act blocks and frame thumbnails. Every width is time:
// a frame's thumbnail spans its cut-in plus its hold, an act spans its frames.
// It spans the full width of the window.
export function Timeline({ height }: { height: number }) {
  const { state, dispatch, startComment } = useApp()
  const comment = state.mode === 'comment'
  const content = useRef<HTMLDivElement>(null)
  const { board, playhead } = state
  const t = timing(board)
  const total = t.total
  const playing = state.playing
  const setPlaying = (on: boolean) => dispatch({ type: 'playing', on })
  const [zoom, setZoom] = useState(1)
  const [width, setWidth] = useState(800)
  const area = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!area.current) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(area.current)
    return () => ro.disconnect()
  }, [])

  // Playing moves the playhead; the canvas outlines the frame under it.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    let ms = playhead >= total ? 0 : playhead
    const tick = (now: number) => {
      ms += now - last
      last = now
      if (ms >= total) {
        dispatch({ type: 'playhead', ms: total })
        setPlaying(false)
        return
      }
      dispatch({ type: 'playhead', ms })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing]) // eslint-disable-line react-hooks/exhaustive-deps

  // Segments: each frame owns the time from the end of the previous frame to its own end.
  const segments = t.frames.map((f, i) => ({ ...f, from: i === 0 ? 0 : t.frames[i - 1].end }))
  const acts = board.acts.map((act) => {
    const own = segments.filter((s) => act.frameIds.includes(s.id))
    return { act, from: own[0]?.from ?? 0, to: own[own.length - 1]?.end ?? 0 }
  })

  // While trimming, the scale is frozen so the edge stays under the pointer.
  const [lockSpan, setLockSpan] = useState<number | null>(null)
  const [readout, setReadout] = useState<{ x: number; text: string; row: 'act' | 'frame' } | null>(null)
  const span = lockSpan ?? Math.max(total, 4000)
  const pxPerMs = (width / span) * zoom
  const x = (ms: number) => ms * pxPerMs
  const atPlayhead = acts.find((a) => playhead >= a.from && playhead < a.to) ?? (playhead >= total ? acts[acts.length - 1] : acts[0])

  const seekTo = (ms: number) => dispatch({ type: 'playhead', ms: Math.min(total, Math.max(0, ms)) })
  const go = (target: Target, ms: number) => {
    seekTo(ms)
    dispatch({ type: 'select', target })
    document.getElementById(domId(target))?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }
  const prevFrame = () => seekTo([...segments].reverse().find((s) => s.from < playhead - 50)?.from ?? 0)
  const nextFrame = () => seekTo(segments.find((s) => s.from > playhead + 50)?.from ?? total)

  // Annotate mode: clicking the ruler or a thumbnail pins a comment to that moment.
  const msAt = (clientX: number) => {
    const r = content.current!.getBoundingClientRect()
    return Math.min(total, Math.max(0, Math.round((clientX - r.left) / pxPerMs)))
  }
  const annotateAt = (e: React.MouseEvent) => {
    e.stopPropagation()
    startComment({ kind: 'time', ms: msAt(e.clientX) })
  }

  const scrub = (e: React.PointerEvent) => {
    if (comment) {
      // Keep the browser from moving focus off the comment box that just opened.
      e.preventDefault()
      return annotateAt(e)
    }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const set = (cx: number) => seekTo((cx - r.left) / pxPerMs)
    set(e.clientX)
    const move = (ev: PointerEvent) => set(ev.clientX)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Trim like a video editor. Ripple edits: everything after the clip shifts.
  //  - frame end   → how long the frame holds
  //  - frame start → how long the cut into it lasts
  //  - act end     → stretches every frame in the act proportionally
  //  - act start   → the cut into the act's first frame
  const ids = order(board)
  const trim = (kind: 'frame' | 'act', id: string, edge: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const sx = e.clientX
    const ppm = pxPerMs
    setLockSpan(span)
    const act = kind === 'act' ? board.acts.find((a) => a.id === id)! : undefined
    const frameId = act ? act.frameIds[0] : id
    const prev = ids[ids.indexOf(frameId) - 1]
    const holds0 = (act ? act.frameIds : [id]).map((f) => board.frames[f].hold * 1000)
    const cut0 = prev ? cutMs(getCut(board, prev, frameId)) : 0
    const snap = (ms: number) => Math.round(ms / 50) * 50

    const move = (ev: PointerEvent) => {
      const d = (ev.clientX - sx) / ppm
      if (edge === 'start') {
        if (!prev) return
        const duration = Math.min(4000, Math.max(0, snap(cut0 - d)))
        dispatch({ type: 'cut', key: cutKey(prev, frameId), patch: { duration } })
        setReadout({ x: ev.clientX, text: `Cut in ${(duration / 1000).toFixed(2)}s`, row: kind })
      } else if (act) {
        const total0 = holds0.reduce((a, b) => a + b, 0)
        const f = Math.max(0.1, (total0 + d) / total0)
        act.frameIds.forEach((fid, i) => dispatch({ type: 'frame', frameId: fid, patch: { hold: Math.max(0.2, snap(holds0[i] * f) / 1000) } }))
        setReadout({ x: ev.clientX, text: `${act.label} ${((total0 * f) / 1000).toFixed(1)}s`, row: 'act' })
      } else {
        const hold = Math.max(200, snap(holds0[0] + d))
        dispatch({ type: 'frame', frameId: id, patch: { hold: hold / 1000 } })
        setReadout({ x: ev.clientX, text: `Hold ${(hold / 1000).toFixed(2)}s`, row: 'frame' })
      }
    }
    const up = () => {
      setLockSpan(null)
      setReadout(null)
      document.body.style.cursor = ''
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    document.body.style.cursor = 'ew-resize'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Edge grips shown on hover (and while selected); hidden in annotate mode.
  const handles = (kind: 'frame' | 'act', id: string, first: boolean, show: boolean) =>
    comment ? null : (
      <>
        {!first && (
          <span
            onPointerDown={trim(kind, id, 'start')}
            onClick={(e) => e.stopPropagation()}
            title={kind === 'act' ? 'Drag to change the cut into this act' : 'Drag to change the cut into this frame'}
            className={`absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize rounded-l-[3px] bg-inverse/70 after:absolute after:inset-y-[30%] after:left-[3px] after:w-px after:bg-raised ${show ? 'opacity-100' : 'opacity-0 group-hover/clip:opacity-100'}`}
          />
        )}
        <span
          onPointerDown={trim(kind, id, 'end')}
          onClick={(e) => e.stopPropagation()}
          title={kind === 'act' ? 'Drag to stretch the whole act' : 'Drag to change how long this frame holds'}
          className={`absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize rounded-r-[3px] bg-inverse/70 after:absolute after:inset-y-[30%] after:right-[3px] after:w-px after:bg-raised ${show ? 'opacity-100' : 'opacity-0 group-hover/clip:opacity-100'}`}
        />
      </>
    )

  // Ruler: a labeled tick every `step` seconds, at least ~90px apart, with minor ticks between.
  const pxPerSec = pxPerMs * 1000
  const step = [1, 2, 5, 10, 15, 30].find((s) => s * pxPerSec >= 90) ?? 60
  const minor = step / 10
  const contentW = Math.max(width, x(span))
  const ticks = Array.from({ length: Math.floor(contentW / (minor * pxPerSec)) + 1 }, (_, i) => +(i * minor).toFixed(2))

  return (
    <div id="timeline" className="flex shrink-0 flex-col bg-surface px-4" style={{ height }}>
      {/* Transport */}
      <div className="relative flex h-10 shrink-0 items-center">
        <span className="text-[11px] tabular-nums">
          {clock(playhead)} / {clock(total)}
        </span>
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3 text-muted">
          <button onClick={() => seekTo(0)} title="Go to start" className="hover:text-ink">
            <Icon.SkipBack size={12} />
          </button>
          <button onClick={prevFrame} title="Previous frame" className="hover:text-ink">
            <Icon.Rewind size={12} />
          </button>
          <button
            onClick={() => total > 0 && setPlaying(!playing)}
            title={playing ? 'Pause' : 'Play'}
            className="flex size-7 items-center justify-center rounded-full bg-secondary text-on-secondary"
          >
            {playing ? <Icon.Pause size={12} /> : <Icon.Play size={11} fill="currentColor" />}
          </button>
          <button onClick={nextFrame} title="Next frame" className="hover:text-ink">
            <Icon.FastForward size={12} />
          </button>
          <button onClick={() => seekTo(total)} title="Go to end" className="hover:text-ink">
            <Icon.SkipForward size={12} />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))} title="Zoom out">
            <Icon.Minus size={12} />
          </button>
          <input
            type="range"
            min={1}
            max={4}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(+e.target.value)}
            className="h-1 w-14 cursor-pointer accent-[var(--accent-line)]"
            title="Zoom"
          />
          <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.5).toFixed(1)))} title="Zoom in">
            <Icon.Plus size={12} />
          </button>
          <button onClick={() => dispatch({ type: 'preview', open: true })} title="Preview" className="ml-3">
            <Icon.Monitor size={14} />
          </button>
        </div>
      </div>

      {/* Ruler, acts and thumbnails share one horizontal scroll */}
      <div ref={area} className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div ref={content} className="relative" style={{ width: contentW }}>
          <div className={`relative h-8 ${comment ? 'cursor-ai hover:bg-accent-soft' : 'cursor-pointer'}`} onPointerDown={scrub}>
            {ticks.map((s) => {
              const major = Math.abs(s / step - Math.round(s / step)) < 1e-6
              return (
                <div key={s} className="absolute bottom-1" style={{ left: s * pxPerSec }}>
                  {major && <span className="absolute bottom-2 left-0 text-[11px] text-subtle tabular-nums">{clock(s * 1000, true)}</span>}
                  <div className={`w-px ${major ? 'h-2.5 bg-line-strong' : 'h-1.5 bg-line'}`} />
                </div>
              )
            })}
          </div>

          <div className="relative mt-2 h-9">
            {acts.map(({ act, from, to }) => {
              const active = act.id === atPlayhead?.act.id
              return (
                <button
                  key={act.id}
                  onClick={() => (comment ? startComment({ kind: 'act', actId: act.id }) : go({ kind: 'act', actId: act.id }, from))}
                  className="group/clip absolute top-0 h-full truncate rounded-md border px-2 text-[12px]"
                  style={{
                    left: x(from),
                    width: Math.max(8, x(to) - x(from) - 2),
                    background: active ? ACCENT : 'var(--raised)',
                    borderColor: active ? 'var(--on-accent)' : 'var(--subtle)', // same grey as the ruler labels
                    color: active ? 'var(--on-accent)' : 'var(--ink)',
                  }}
                >
                  {act.label}
                  {handles('act', act.id, act.id === board.acts[0].id, false)}
                </button>
              )
            })}
          </div>

          <div className="relative mt-2" style={{ height: THUMB_H }}>
            {segments.map((s, i) => {
              const selected = state.selection?.kind === 'frame' && state.selection.frameId === s.id
              return (
                <button
                  key={s.id}
                  onClick={(e) => (comment ? annotateAt(e) : go({ kind: 'frame', frameId: s.id }, s.from))}
                  className="group/clip absolute top-0 h-full overflow-hidden rounded-[3px] bg-line"
                  style={{
                    left: x(s.from),
                    width: Math.max(2, x(s.end) - x(s.from) - 2),
                    boxShadow: selected ? `inset 0 0 0 2px ${ACCENT_LINE}` : undefined,
                  }}
                  title={`Frame ${i + 1} · ${((s.end - s.from) / 1000).toFixed(1)}s`}
                >
                  <FrameThumb frame={board.frames[s.id]} width={Math.max(2, x(s.end) - x(s.from) - 2)} height={THUMB_H} />
                  {handles('frame', s.id, i === 0, selected)}
                </button>
              )
            })}
          </div>

          {/* Duration readout while trimming */}
          {readout && content.current && (
            <span
              className="pointer-events-none absolute z-30 -translate-x-1/2 rounded bg-inverse px-1.5 py-0.5 text-[11px] whitespace-nowrap text-on-inverse tabular-nums"
              style={{ left: readout.x - content.current.getBoundingClientRect().left, top: readout.row === 'act' ? 22 : 66 }}
            >
              {readout.text}
            </span>
          )}

          {/* Moments annotated on the ruler or in the preview */}
          {state.pins.map((p) =>
            p.target.kind === 'time' ? <PinMarker key={p.id} pin={p} style={{ left: x(p.target.ms), top: 4, transform: 'translateX(-2px)' }} /> : null,
          )}

          {/* Playhead: a pill with the time sits on the ruler, and the line runs down through the clips. */}
          {total > 0 && (
            <div className="pointer-events-none absolute top-0 bottom-0" style={{ left: x(playhead) }}>
              <div
                className="absolute top-1 flex h-5 -translate-x-1/2 items-center rounded-full bg-accent px-2 text-[11px] font-medium text-on-accent tabular-nums"
                style={{ marginLeft: x(playhead) < 22 ? 22 - x(playhead) : x(playhead) > contentW - 22 ? contentW - 22 - x(playhead) : 0 }}
              >
                {(playhead / 1000).toFixed(2)}
              </div>
              <div className="absolute top-[22px] bottom-0 left-0 w-px" style={{ background: ACCENT_LINE }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
