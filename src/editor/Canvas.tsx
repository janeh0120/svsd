import { Fragment, useRef, useState } from 'react'
import { FRAME_H, FRAME_W, cutKey, sameTarget, timing } from '../board'
import { LayerBody, layerStyle } from '../components/Layer'
import { useApp } from '../context'
import { pinsFor } from '../store'
import type { Act, Layer } from '../types'
import { Icon } from './icons'
import { PinMarker } from './Pin'

const CARD_W = 280
const SCALE = CARD_W / FRAME_W
const CARD_H = Math.round((CARD_W * FRAME_H) / FRAME_W)

// The storyboard canvas: acts side by side, each a row of frames.
export function Canvas() {
  const { state, dispatch } = useApp()
  const comment = state.mode === 'comment'

  return (
    <div className="relative min-w-0 flex-1 bg-[#F5F5F5]">
      <div
        id="canvas"
        className={`h-full overflow-auto ${comment ? 'cursor-crosshair shadow-[inset_0_0_0_2px_#fb923c]' : ''}`}
        onClick={() => {
          if (!comment) dispatch({ type: 'select', target: null })
          else if (state.composing) dispatch({ type: 'compose', id: null })
        }}
      >
        <div className="flex w-max items-start gap-16 px-8 pt-16 pb-24">
          {state.board.acts.map((act, i) => (
            <ActGroup key={act.id} act={act} prevAct={state.board.acts[i - 1]} />
          ))}
        </div>
      </div>
      <Toolbar />
    </div>
  )
}

function ActGroup({ act, prevAct }: { act: Act; prevAct?: Act }) {
  const { state, dispatch, startComment } = useApp()
  const target = { kind: 'act' as const, actId: act.id }
  const prevLast = prevAct?.frameIds[prevAct.frameIds.length - 1]

  return (
    <section id={`act-${act.id}`} className="shrink-0 scroll-m-6">
      <div className="relative mb-3 flex items-center">
        <h2
          onClick={(e) => {
            e.stopPropagation()
            if (state.mode === 'comment') startComment(target)
            else dispatch({ type: 'select', target })
          }}
          className="cursor-default text-[22px] leading-none font-normal"
        >
          {act.name}
        </h2>
        {pinsFor(state.pins, target).map((p, i) => (
          <PinMarker key={p.id} pin={p} style={{ position: 'relative', marginLeft: i ? 4 : 8 }} />
        ))}
      </div>
      <div className="relative flex rounded-[20px] border-2 border-[#E6E6E6] bg-white p-12">
        {/* The cut from the previous act sits in this act's left padding. */}
        {prevLast && act.frameIds[0] && <Gap from={prevLast} to={act.frameIds[0]} className="absolute top-12 left-1 w-10" />}
        {act.frameIds.map((id, i) => (
          <Fragment key={id}>
            {i > 0 && <Gap from={act.frameIds[i - 1]} to={id} />}
            <FrameCard frameId={id} />
          </Fragment>
        ))}
      </div>
    </section>
  )
}

// The space between two frames is the cut: click it to select or comment on the motion.
function Gap({ from, to, className = 'relative w-10 shrink-0' }: { from: string; to: string; className?: string }) {
  const { state, dispatch, startComment } = useApp()
  const key = cutKey(from, to)
  const target = { kind: 'cut' as const, key }
  const selected = sameTarget(state.selection, target)
  const comment = state.mode === 'comment'

  return (
    <div
      id={`cut-${key}`}
      onClick={(e) => {
        e.stopPropagation()
        if (comment) startComment(target)
        else dispatch({ type: 'select', target })
      }}
      style={{ height: CARD_H }}
      className={`${className} rounded-lg ${comment ? 'hover:bg-orange-100/60' : selected ? 'bg-[#0D99FF]/10' : ''}`}
    >
      {pinsFor(state.pins, target).map((p, i) => (
        <PinMarker key={p.id} pin={p} style={{ top: CARD_H / 2, left: 8 + i * 26, transform: 'translateY(-100%)' }} />
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
  const playing = !!t && state.playhead > 0 && state.playhead >= t.start && state.playhead < t.end

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

  return (
    <div
      id={`frame-${frameId}`}
      className={`relative shrink-0 rounded-lg ${frameSelected || playing ? 'outline-2 outline-[#0D99FF]' : ''}`}
      style={{ width: CARD_W, height: CARD_H }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-lg ring-1 ring-black/5" onClick={onFrameClick}>
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
              <LayerBody layer={l} />
            </div>
          ))}
        </div>
      </div>

      {hovered && hovered.id !== selected?.id && <Outline layer={hovered} tone={comment ? 'comment' : 'hover'} label={comment ? hovered.name : undefined} />}
      {selected && <Outline layer={selected} tone="selected" />}
      {framePins.map((p) => (
        <PinMarker key={p.id} pin={p} style={{ left: p.x! * SCALE, top: p.y! * SCALE, transform: 'translateY(-100%)' }} />
      ))}
    </div>
  )
}

// Outline drawn in card space (clipped to the frame) so it stays crisp at any zoom.
function Outline({ layer, tone, label }: { layer: Layer; tone: 'hover' | 'selected' | 'comment'; label?: string }) {
  const x0 = Math.max(0, layer.x)
  const y0 = Math.max(0, layer.y)
  const x1 = Math.min(FRAME_W, layer.x + layer.w)
  const y1 = Math.min(FRAME_H, layer.y + layer.h)
  if (x1 <= x0 || y1 <= y0) return null
  const styles = {
    hover: 'border border-[#0D99FF]',
    selected: 'border border-[#0D99FF]',
    comment: 'border-2 border-dashed border-orange-500 bg-orange-500/10',
  }
  return (
    <div
      className={`pointer-events-none absolute z-10 ${styles[tone]}`}
      style={{ left: x0 * SCALE, top: y0 * SCALE, width: (x1 - x0) * SCALE, height: (y1 - y0) * SCALE }}
    >
      {label && (
        <span className="absolute -top-5 left-[-2px] rounded bg-orange-500 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-white">{label}</span>
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
    <div className="absolute bottom-3 left-1/2 z-30 flex h-8 -translate-x-1/2 items-center gap-0.5 rounded-lg bg-white px-1 shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
      {tools.map(({ id, icon: I }) => (
        <button
          key={id}
          onClick={() => {
            setTool(id)
            if (state.mode !== 'select') dispatch({ type: 'mode', mode: 'select' })
          }}
          className={`flex size-6 items-center justify-center rounded-md ${active === id ? 'bg-[#0D99FF] text-white' : 'hover:bg-[#F5F5F5]'}`}
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
