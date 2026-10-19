import { motion } from 'motion/react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { FRAME_H, FRAME_W, cutKey, cutMs, frameTitle, getCut, order, sameTarget, timing } from '../board'
import { LayerBody, layerStyle } from '../components/Layer'
import { useApp } from '../context'
import { pinsFor } from '../store'
import type { Act, Layer } from '../types'
import { Icon } from './icons'
import { PinMarker } from './Pin'

const CARD_W = 280
const SCALE = CARD_W / FRAME_W
const CARD_H = Math.round((CARD_W * FRAME_H) / FRAME_W)
// Card chrome: 2px border + 6px padding + 28px header above the frame image.
const CARD_TOP = 2 + 6 + 28
const CARD_FULL_H = CARD_TOP + CARD_H + 6 + 2
const LINK_W = 44 // space between cards, where the connector runs

// The storyboard canvas: acts side by side, each a row of frames.
export function Canvas() {
  const { state, dispatch } = useApp()
  const comment = state.mode === 'comment'
  const current = currentFrameId(state)

  // Keep the frame under the playhead centered while the timeline plays or is scrubbed.
  useEffect(() => {
    if (!current || (!state.playing && state.playhead === 0)) return
    document.getElementById(`frame-${current}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative min-w-0 flex-1 bg-canvas">
      <div
        id="canvas"
        className={`h-full overflow-auto ${comment ? 'cursor-crosshair shadow-[inset_0_0_0_2px_var(--accent-line)]' : ''}`}
        onClick={() => {
          if (!comment) dispatch({ type: 'select', target: null })
          else if (state.composing) dispatch({ type: 'compose', id: null })
        }}
      >
        <div className="flex w-max items-start gap-12 px-8 pt-16 pb-24">
          {state.board.acts.map((act, i) => (
            <ActGroup key={act.id} act={act} prevAct={state.board.acts[i - 1]} />
          ))}
        </div>
      </div>
      <Toolbar />
    </div>
  )
}

// An act is a group of frames: label inside the top-left, thin border, and a
// blue fill and label when selected.
function ActGroup({ act, prevAct }: { act: Act; prevAct?: Act }) {
  const { state, dispatch, startComment } = useApp()
  const target = { kind: 'act' as const, actId: act.id }
  const selected = sameTarget(state.selection, target)
  const prevLast = prevAct?.frameIds[prevAct.frameIds.length - 1]

  const pick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (state.mode === 'comment') startComment(target)
    else dispatch({ type: 'select', target })
  }

  return (
    <motion.section
      id={`act-${act.id}`}
      onClick={pick}
      className={`relative shrink-0 scroll-m-6 rounded-xl border p-2 pt-0 ${
        selected ? 'border-accent-line bg-accent-soft' : 'border-line'
      } ${state.mode === 'comment' ? 'hover:border-accent-line' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex h-7 items-center px-0.5">
        <h2 className={`text-[12px] leading-none font-normal ${selected ? 'text-accent-text' : 'text-muted'}`}>{act.name}</h2>
        {pinsFor(state.pins, target).map((p, i) => (
          <PinMarker key={p.id} pin={p} style={{ position: 'relative', marginLeft: i ? 4 : 8 }} />
        ))}
      </div>
      {/* The cut from the previous act runs across the space between the two groups. */}
      {prevLast && act.frameIds[0] && <Connector from={prevLast} to={act.frameIds[0]} className="absolute top-7 -left-[50px]" width={58} />}
      <div className="flex">
        {act.frameIds.map((id, i) => (
          <Fragment key={id}>
            {i > 0 && <Connector from={act.frameIds[i - 1]} to={id} />}
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.12, duration: 0.3 }}>
              <FrameCard frameId={id} />
            </motion.div>
          </Fragment>
        ))}
      </div>
    </motion.section>
  )
}

// The cut between two frames, drawn as a line with a node. Select the node to
// edit the animation between the frames (or comment on it in annotate mode).
function Connector({ from, to, className = 'relative shrink-0', width = LINK_W }: { from: string; to: string; className?: string; width?: number }) {
  const { state, dispatch, startComment } = useApp()
  const key = cutKey(from, to)
  const target = { kind: 'cut' as const, key }
  const selected = sameTarget(state.selection, target)
  const comment = state.mode === 'comment'
  const y = CARD_TOP + CARD_H / 2
  const mid = width / 2

  return (
    <div id={`cut-${key}`} className={`${className} group/link`} style={{ width, height: CARD_FULL_H }}>
      <svg width={width} height={CARD_FULL_H} className="pointer-events-none absolute inset-0 overflow-visible">
        <path
          d={`M0 ${y - 6} C ${mid} ${y - 6}, ${mid} ${y + 6}, ${width} ${y + 6}`}
          fill="none"
          style={{ stroke: selected ? 'var(--accent-line)' : 'var(--line-strong)' }}
          strokeWidth={selected ? 2 : 1.5}
        />
      </svg>
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (comment) startComment(target)
          else dispatch({ type: 'select', target })
        }}
        title="Edit the animation between these frames"
        className="absolute z-10 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ left: mid, top: y }}
      >
        <span
          className={`block rounded-full border-2 transition-all ${
            selected
              ? 'size-3.5 border-canvas bg-accent shadow-[0_0_0_2px_var(--accent-line)]'
              : comment
                ? 'size-3 border-canvas bg-line-strong group-hover/link:bg-accent'
                : 'size-3 border-canvas bg-line-strong group-hover/link:size-3.5 group-hover/link:bg-muted'
          }`}
        />
      </button>
      {pinsFor(state.pins, target).map((p) => (
        <PinMarker key={p.id} pin={p} style={{ left: mid, top: y }} />
      ))}
    </div>
  )
}

function FrameCard({ frameId }: { frameId: string }) {
  const { state, dispatch, startComment } = useApp()
  const frame = state.board.frames[frameId]
  const inner = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<string | null>(null)
  const comment = state.mode === 'comment'
  const sel = state.selection
  const frameSelected = sel?.kind === 'frame' && sel.frameId === frameId
  const selectedLayer = sel?.kind === 'layer' && sel.frameId === frameId ? sel.layerId : null
  const t = timing(state.board).frames.find((f) => f.id === frameId)
  // The frame under the timeline's playhead: highlighted, with its progress, and playing.
  const isCurrent = currentFrameId(state) === frameId && (state.playing || state.playhead > 0)
  const playing = isCurrent && state.playing

  const toFrame = (e: React.MouseEvent) => {
    const r = inner.current!.getBoundingClientRect()
    return { x: Math.round((e.clientX - r.left) / SCALE), y: Math.round((e.clientY - r.top) / SCALE) }
  }

  // Select tool: press to select, drag to move.
  const onLayerDown = (l: Layer) => (e: React.PointerEvent) => {
    e.stopPropagation()
    if (comment) return
    dispatch({ type: 'select', target: { kind: 'layer', frameId, layerId: l.id } })
    const sx = e.clientX
    const sy = e.clientY
    let moved = false
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / SCALE
      const dy = (ev.clientY - sy) / SCALE
      if (!moved && Math.hypot(dx, dy) < 6) return
      moved = true
      dispatch({ type: 'layer', frameId, layerId: l.id, patch: { x: Math.round(l.x + dx), y: Math.round(l.y + dy) } })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const onLayerClick = (l: Layer) => (e: React.MouseEvent) => {
    e.stopPropagation()
    if (comment) startComment({ kind: 'layer', frameId, layerId: l.id }, toFrame(e))
  }

  const onFrameClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (comment) startComment({ kind: 'frame', frameId }, toFrame(e))
    else dispatch({ type: 'select', target: { kind: 'frame', frameId } })
  }

  const hovered = frame.layers.find((l) => l.id === hover)
  const selected = frame.layers.find((l) => l.id === selectedLayer)
  const framePins = state.pins.filter(
    (p) => (p.target.kind === 'layer' || p.target.kind === 'frame') && p.target.frameId === frameId && p.x !== undefined,
  )

  const n = order(state.board).indexOf(frameId) + 1
  const span = t ? { from: (t.start - (n > 1 ? cutInMs(state, frameId) : 0)) / 1000, to: t.end / 1000 } : null

  return (
    <div
      id={`frame-${frameId}`}
      onClick={onFrameClick}
      className={`shrink-0 rounded-xl border-2 p-1.5 pt-0 transition-colors ${
        frameSelected ? 'border-accent-line bg-accent-soft' : isCurrent ? 'border-accent-line' : 'border-transparent hover:border-line'
      }`}
    >
      <div className="flex h-7 items-center gap-1.5 px-0.5 text-[12px]" style={{ width: CARD_W }}>
        <span className={`font-medium ${frameSelected ? 'text-accent-text' : 'text-muted'}`}>{n}</span>
        <span className={`min-w-0 flex-1 truncate ${frameSelected ? 'text-accent-text' : 'text-ink'}`}>{frameTitle(frame)}</span>
        {span && (
          <span className={`shrink-0 text-[11px] tabular-nums ${frameSelected ? 'text-accent-text' : 'text-muted'}`}>
            {span.from.toFixed(1)}–{span.to.toFixed(1)}s · {(span.to - span.from).toFixed(1)}s
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'preview', open: true, from: frameId })
          }}
          title="Preview from this frame"
          className={`flex size-4 shrink-0 items-center justify-center rounded-full ${frameSelected ? 'bg-accent text-on-accent' : 'bg-ink text-surface'}`}
        >
          <Icon.Play size={7} fill="currentColor" className="ml-px" />
        </button>
      </div>
      <div className="relative" style={{ width: CARD_W, height: CARD_H }}>
        <div className="absolute inset-0 overflow-hidden rounded-md ring-1 ring-line">
          <div
            ref={inner}
            className="absolute top-0 left-0 origin-top-left"
            style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${SCALE})`, background: frame.background }}
          >
            {frame.layers.map((l) => (
              <div
                key={l.id}
                style={layerStyle(l)}
                onPointerDown={onLayerDown(l)}
                onClick={onLayerClick(l)}
                onPointerEnter={() => setHover(l.id)}
                onPointerLeave={() => setHover((h) => (h === l.id ? null : h))}
              >
                <LayerBody layer={l} playing={playing} />
              </div>
            ))}
          </div>
          {isCurrent && span && (
            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/20">
              <div
                className="h-full bg-accent"
                style={{ width: `${Math.min(100, Math.max(0, ((state.playhead / 1000 - span.from) / (span.to - span.from)) * 100))}%` }}
              />
            </div>
          )}
        </div>

        {hovered && hovered.id !== selected?.id && <Outline layer={hovered} tone={comment ? 'comment' : 'hover'} label={comment ? hovered.name : undefined} />}
        {selected && <Outline layer={selected} tone="selected" />}
        {framePins.map((p) => (
          <PinMarker key={p.id} pin={p} style={{ left: p.x! * SCALE, top: p.y! * SCALE, transform: 'translateY(-100%)' }} />
        ))}
      </div>
    </div>
  )
}

// The frame whose span (its cut in plus its hold) contains the playhead.
function currentFrameId(state: ReturnType<typeof useApp>['state']) {
  const frames = timing(state.board).frames
  return (frames.find((f) => state.playhead < f.end) ?? frames[frames.length - 1])?.id
}

// How long the cut into a frame takes, so its span starts where the previous frame ends.
function cutInMs(state: ReturnType<typeof useApp>['state'], frameId: string) {
  const ids = order(state.board)
  const prev = ids[ids.indexOf(frameId) - 1]
  return prev ? cutMs(getCut(state.board, prev, frameId)) : 0
}

// Outline drawn in card space (clipped to the frame) so it stays crisp at any zoom.
function Outline({ layer, tone, label }: { layer: Layer; tone: 'hover' | 'selected' | 'comment'; label?: string }) {
  const x0 = Math.max(0, layer.x)
  const y0 = Math.max(0, layer.y)
  const x1 = Math.min(FRAME_W, layer.x + layer.w)
  const y1 = Math.min(FRAME_H, layer.y + layer.h)
  if (x1 <= x0 || y1 <= y0) return null
  const styles = {
    hover: 'border border-accent-line',
    selected: 'border border-accent-line',
    comment: 'border-2 border-dashed border-accent-line bg-accent/15',
  }
  return (
    <div
      className={`pointer-events-none absolute z-10 ${styles[tone]}`}
      style={{ left: x0 * SCALE, top: y0 * SCALE, width: (x1 - x0) * SCALE, height: (y1 - y0) * SCALE }}
    >
      {label && (
        <span className="absolute -top-5 left-[-2px] rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-on-accent">{label}</span>
      )}
    </div>
  )
}

// Bottom-center tool bar, as in the reference: select, frame, shape, pen, text.
function Toolbar() {
  const { state, dispatch } = useApp()
  const [tool, setTool] = useState('select')
  const tools = [
    { id: 'select', icon: Icon.Cursor },
    { id: 'frame', icon: Icon.Frame },
    { id: 'rect', icon: Icon.Square },
    { id: 'pen', icon: Icon.Pen },
    { id: 'text', icon: Icon.Text },
  ]
  const active = state.mode === 'comment' ? null : tool
  return (
    <div className="absolute bottom-3 left-1/2 z-30 flex h-8 -translate-x-1/2 items-center gap-0.5 rounded-lg bg-raised px-1 shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
      {tools.map(({ id, icon: I }) => (
        <button
          key={id}
          onClick={() => {
            setTool(id)
            if (state.mode !== 'select') dispatch({ type: 'mode', mode: 'select' })
          }}
          className={`flex size-6 items-center justify-center rounded-md ${active === id ? 'bg-accent text-on-accent' : 'hover:bg-control-hover'}`}
        >
          <I size={14} />
        </button>
      ))}
      <button className="flex h-6 w-4 items-center justify-center">
        <Icon.ChevronDown size={12} />
      </button>
    </div>
  )
}
