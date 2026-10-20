import { motion } from 'motion/react'
import { Fragment, createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { DEFAULT_CUT, FRAME_H, FRAME_W, cutKey, cutMs, cutTransition, frameTitle, getCut, order, sameTarget, timing, UI_EASE } from '../board'
import { LayerBody, arrival, layerBox, layerStyle } from '../components/Layer'
import { onZoomRequest, publishZoom } from './canvasZoom'
import { useApp } from '../context'
import { pinsFor } from '../store'
import type { Chapter, Layer } from '../types'
import { Icon } from './icons'
import { PinMarker } from './Pin'

const CARD_W = 280
const SCALE = CARD_W / FRAME_W
const CARD_H = Math.round((CARD_W * FRAME_H) / FRAME_W)
// Card chrome: 2px border + 6px padding + 28px header + 4px gap above the frame image.
const CARD_TOP = 2 + 6 + 28 + 4
const CARD_FULL_H = CARD_TOP + CARD_H + 6 + 2
// How far a frame's image sits inside its card: 2px border + 6px padding.
const CARD_INSET = 8
const LINK_W = 64 // space between cards, where the connector runs

const MIN_ZOOM = 0.3
const MAX_ZOOM = 2
// The canvas zoom, so drags and clicks inside a frame can undo the scale.
const ZoomContext = createContext(1)

// The storyboard canvas: chapters side by side, each a row of frames. Pinch (or
// ctrl/cmd + scroll) zooms the storyboard around the middle of the view; it is
// centered whenever it fits and scrolls once it outgrows the canvas.
export function Canvas() {
  const { state, dispatch, startComment } = useApp()
  const comment = state.mode === 'comment'
  const current = currentFrameId(state)
  const scroller = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const zoomRef = useRef(1)
  const anchor = useRef<{ fx: number; fy: number } | null>(null)

  // Pointer modes: cursor (select and move), hand (pan) and AI (point and prompt: cross
  // cursor, click a thing or press and drag to lasso a section, then say what to change).
  const [hand, setHand] = useState(false)
  const pointer: PointerMode = comment ? 'ai' : hand ? 'hand' : 'select'
  const setPointer = (m: PointerMode) => {
    setHand(m === 'hand')
    dispatch({ type: 'mode', mode: m === 'ai' ? 'comment' : 'select' })
  }
  const [panning, setPanning] = useState(false)
  const [lasso, setLasso] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const swallowClick = useRef(false)

  const startPan = (e: React.PointerEvent) => {
    const el = scroller.current!
    let lx = e.clientX
    let ly = e.clientY
    setPanning(true)
    const move = (ev: PointerEvent) => {
      el.scrollLeft -= ev.clientX - lx
      el.scrollTop -= ev.clientY - ly
      lx = ev.clientX
      ly = ev.clientY
    }
    const up = () => {
      setPanning(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // A plain click still pins a comment to what is under it; dragging draws a lasso.
  const startLasso = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as Element).closest('input,textarea')) return
    const sx = e.clientX
    const sy = e.clientY
    let dragging = false
    let rect = { x0: sx, y0: sy, x1: sx, y1: sy }
    const move = (ev: PointerEvent) => {
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return
      dragging = true
      rect = { x0: sx, y0: sy, x1: ev.clientX, y1: ev.clientY }
      setLasso(rect)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (!dragging) return
      setLasso(null)
      swallowClick.current = true
      setTimeout(() => (swallowClick.current = false), 0)
      lassoTarget(rect)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // What a lasso is about: several frames of one chapter → the chapter; otherwise the frame it covers most.
  const lassoTarget = (r: { x0: number; y0: number; x1: number; y1: number }) => {
    const l = Math.min(r.x0, r.x1)
    const t = Math.min(r.y0, r.y1)
    const rr = Math.max(r.x0, r.x1)
    const b = Math.max(r.y0, r.y1)
    const hits = order(state.board)
      .map((id) => {
        const box = document.getElementById(`frame-${id}`)?.getBoundingClientRect()
        if (!box) return null
        const area = Math.max(0, Math.min(rr, box.right) - Math.max(l, box.left)) * Math.max(0, Math.min(b, box.bottom) - Math.max(t, box.top))
        return area > 0 ? { id, box, area } : null
      })
      .filter((h) => h !== null)
    if (!hits.length) return
    const chapters = new Set(hits.map((h) => state.board.chapters.find((a) => a.frameIds.includes(h.id))?.id))
    if (hits.length > 1 && chapters.size === 1) {
      startComment({ kind: 'chapter', chapterId: [...chapters][0]! })
      return
    }
    const best = hits.reduce((a, h) => (h.area > a.area ? h : a))
    const z = zoomRef.current
    const px = (v: number, origin: number, extent: number) => Math.round(Math.min(extent, Math.max(0, (v - origin) / (SCALE * z))))
    startComment(
      { kind: 'frame', frameId: best.id },
      { x: px((l + rr) / 2, best.box.left + CARD_INSET * z, FRAME_W), y: px((t + b) / 2, best.box.top + CARD_TOP * z, FRAME_H) },
    )
  }

  // The storyboard's natural size, so the scaled box takes up the room it shows.
  useLayoutEffect(() => {
    const el = content.current!
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Pinch on a trackpad arrives as a ctrl+wheel; it has to be a non-passive listener to stop the page zooming.
  useEffect(() => {
    const el = scroller.current!
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * Math.exp(-Math.max(-25, Math.min(25, e.deltaY)) * 0.01)))
      if (next === zoomRef.current) return
      // Remember what is in the middle of the view, so it stays there as the content resizes.
      anchor.current ??= { fx: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth, fy: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight }
      zoomRef.current = next
      setZoom(next)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    // The zoom menu in the right panel asks for an exact zoom.
    const stopRequests = onZoomRequest((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
      if (next === zoomRef.current) return
      anchor.current ??= { fx: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth, fy: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight }
      zoomRef.current = next
      setZoom(next)
    })
    return () => {
      el.removeEventListener('wheel', onWheel)
      stopRequests()
    }
  }, [])

  useEffect(() => publishZoom(zoom), [zoom])

  useLayoutEffect(() => {
    const el = scroller.current!
    if (anchor.current) {
      el.scrollLeft = anchor.current.fx * el.scrollWidth - el.clientWidth / 2
      el.scrollTop = anchor.current.fy * el.scrollHeight - el.clientHeight / 2
      anchor.current = null
    }
  }, [zoom])

  // Keep the frame under the playhead centered while the timeline plays or is scrubbed.
  useEffect(() => {
    if (!current || (!state.playing && state.playhead === 0)) return
    document.getElementById(`frame-${current}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative min-w-0 flex-1 bg-canvas">
      <div
        id="canvas"
        ref={scroller}
        className={`h-full overflow-auto ${
          comment
            ? 'cursor-ai select-none shadow-[inset_0_0_0_2px_var(--accent-line)] [&_*]:cursor-ai!'
            : hand
              ? `select-none ${panning ? '[&_*]:cursor-hand-grabbing!' : '[&_*]:cursor-hand!'}`
              : ''
        }`}
        onPointerDownCapture={(e) => {
          if (hand && e.button === 0) {
            e.preventDefault()
            e.stopPropagation()
            startPan(e)
          } else if (comment) startLasso(e)
        }}
        onClickCapture={(e) => {
          if (hand || swallowClick.current) e.stopPropagation()
        }}
        onClick={() => {
          if (!comment) dispatch({ type: 'select', target: null })
          else if (state.composing) dispatch({ type: 'compose', id: null })
        }}
      >
        {/* At least as big as the viewport, so the chapters sit in the middle at any zoom and scroll once they outgrow it. */}
        <div className="flex min-h-full w-max min-w-full items-center justify-center">
          <div className="shrink-0" style={size ? { width: size.w * zoom, height: size.h * zoom } : undefined}>
            <ZoomContext value={zoom}>
              <div ref={content} className="flex w-max origin-top-left items-start gap-12 px-8 py-16" style={{ transform: `scale(${zoom})` }}>
                {state.board.chapters.map((chapter, i) => (
                  <ChapterGroup key={chapter.id} chapter={chapter} prevChapter={state.board.chapters[i - 1]} />
                ))}
              </div>
            </ZoomContext>
          </div>
        </div>
      </div>
      {lasso && (
        <div
          className="pointer-events-none fixed z-40 rounded-control border border-dashed border-accent-line bg-accent/15"
          style={{ left: Math.min(lasso.x0, lasso.x1), top: Math.min(lasso.y0, lasso.y1), width: Math.abs(lasso.x1 - lasso.x0), height: Math.abs(lasso.y1 - lasso.y0) }}
        />
      )}
      <Toolbar pointer={pointer} setPointer={setPointer} />
    </div>
  )
}

// An chapter is a group of frames: label inside the top-left, thin border, and a
// blue fill and label when selected.
function ChapterGroup({ chapter, prevChapter }: { chapter: Chapter; prevChapter?: Chapter }) {
  const { state, dispatch, startComment } = useApp()
  const target = { kind: 'chapter' as const, chapterId: chapter.id }
  const selected = sameTarget(state.selection, target)
  const prevLast = prevChapter?.frameIds[prevChapter.frameIds.length - 1]

  const pick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (state.mode === 'comment') startComment(target)
    else dispatch({ type: 'select', target })
  }

  return (
    <motion.section
      id={`chapter-${chapter.id}`}
      onClick={pick}
      className="relative shrink-0 scroll-m-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: UI_EASE }}
    >
      {/* The name sits above the box in its own outlined tag. Double-click to rename; the timeline block follows. */}
      <div className="mb-2 flex h-7 items-center">
        <ChapterTag chapter={chapter} selected={selected} />
        {pinsFor(state.pins, target).map((p, i) => (
          <PinMarker key={p.id} pin={p} style={{ position: 'relative', marginLeft: i ? 4 : 8 }} />
        ))}
      </div>
      <div
        className={`relative rounded-tile border p-4 ${selected ? 'chapter-spin border-transparent' : 'border-line'} ${state.mode === 'comment' ? 'hover:border-accent-line' : ''}`}
        // Selected: no fill, just a border that runs off-white → lime → pink → off-white (the padding-box layer is the canvas colour, so only the border shows the gradient).
        style={
          selected
            ? {
                background:
                  'linear-gradient(var(--canvas), var(--canvas)) padding-box, conic-gradient(from var(--chapter-angle), var(--ink), var(--accent), var(--secondary), var(--ink)) border-box',
              }
            : undefined
        }
      >
        {/* The cut from the previous chapter runs across the space between the two groups. */}
        {prevLast && chapter.frameIds[0] && <Connector from={prevLast} to={chapter.frameIds[0]} className="absolute top-[16px] -left-12" width={48} />}
        <div className="flex">
          {chapter.frameIds.map((id, i) => (
            <Fragment key={id}>
              {i > 0 && <Connector from={chapter.frameIds[i - 1]} to={id} inset={CARD_INSET} />}
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.12, duration: 0.3, ease: UI_EASE }}>
                <FrameCard frameId={id} />
              </motion.div>
            </Fragment>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

function ChapterTag({ chapter, selected }: { chapter: Chapter; selected: boolean }) {
  const { dispatch } = useApp()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(chapter.name)
  const tone = selected ? 'border-accent-line text-accent-text' : 'border-line text-muted'
  // The serif's ink sits about 1px below the middle of its line box, so the bottom padding is 2px taller to centre it.
  const box = `h-7 rounded-tile border px-3 pb-[2px] text-center text-[13px] leading-none ${tone}`

  const commit = () => {
    const name = draft.trim()
    if (name && name !== chapter.name) dispatch({ type: 'chapterRename', chapterId: chapter.id, name })
    setEditing(false)
  }

  if (editing)
    return (
      <input
        autoFocus
        value={draft}
        size={Math.max(draft.length, 4)}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className={`${box} bg-transparent font-display font-normal outline-none`}
      />
    )
  return (
    <h2
      title="Double-click to rename"
      onDoubleClick={(e) => {
        e.stopPropagation()
        setDraft(chapter.name)
        setEditing(true)
      }}
      className={`${box} flex items-center justify-center font-normal`}
    >
      {chapter.name}
    </h2>
  )
}

// The cut between two frames, drawn in the chapter-border colour until selected, then as a gradient wire (off-white → pink → lime
// → off-white) from a solid nub on the outgoing frame to a ring on the incoming
// one. Select the wire or the ring to edit the animation between the shots (or
// comment on it in annotate mode).
// The wire runs `inset` px past each end of the gap, so the arrow's tip lands on the edge of the box it points at.
function Connector({
  from,
  to,
  className = 'relative shrink-0',
  width = LINK_W,
  inset = 0,
}: {
  from: string
  to: string
  className?: string
  width?: number
  inset?: number
}) {
  const { state, dispatch, startComment } = useApp()
  const gradient = useId()
  const key = cutKey(from, to)
  const target = { kind: 'cut' as const, key }
  const selected = sameTarget(state.selection, target)
  const comment = state.mode === 'comment'
  const y = CARD_TOP + CARD_H / 2
  const mid = width / 2
  const y0 = y - 8
  const y1 = y + 8
  const x0 = -inset
  const x1 = width + inset
  // Starts at the middle of the nub, so the wire never pokes out past it.
  // The tip stops short of the box edge by the card's 1px ring plus half the stroke (round join), so its outer edge just touches.
  const sw = 1
  const tip = x1 - 1 - sw / 2
  const wire = `M${x0 + 2} ${y0} C ${mid} ${y0}, ${mid} ${y1}, ${tip} ${y1}`

  const pick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (comment) startComment(target)
    else dispatch({ type: 'select', target })
  }

  return (
    <div id={`cut-${key}`} className={`${className} group/link`} style={{ width, height: CARD_FULL_H }}>
      <svg
        width={width}
        height={CARD_FULL_H}
        className="pointer-events-none absolute inset-0 overflow-visible"
      >
        <defs>
          <linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1={x0} y1={0} x2={x1} y2={0}>
            <stop offset="0" stopColor="var(--ink)" />
            <stop offset="0.38" stopColor="var(--secondary)" />
            <stop offset="0.7" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--ink)" />
          </linearGradient>
        </defs>
        <path d={wire} fill="none" stroke={selected ? `url(#${gradient})` : 'var(--line)'} strokeWidth={sw} />
        {/* Wide invisible stroke so the whole wire is easy to hit. */}
        <path d={wire} fill="none" stroke="transparent" strokeWidth={16} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} onClick={pick}>
          <title>Edit the animation between these shots</title>
        </path>
        <rect x={x0} y={y0 - 5} width={4} height={10} rx={2} fill={selected ? 'var(--ink)' : 'var(--line)'} />
        {/* Every cut ends in an arrowhead. */}
        <path
          d={`M${tip - 6} ${y1 - 5} L${tip} ${y1} L${tip - 6} ${y1 + 5}`}
          fill="none"
          stroke={selected ? 'var(--ink)' : 'var(--line)'}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <button
        onClick={pick}
        title="Edit the animation between these shots"
        className="absolute z-10 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ left: x1, top: y1 }}
      />
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
  const zoom = useContext(ZoomContext)
  const [hover, setHover] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null) // a text layer being edited in place (double-click)
  const comment = state.mode === 'comment'
  const sel = state.selection
  const frameSelected = sel?.kind === 'frame' && sel.frameId === frameId
  const selectedLayer = sel?.kind === 'layer' && sel.frameId === frameId ? sel.layerId : null
  const t = timing(state.board).frames.find((f) => f.id === frameId)
  // The frame under the timeline's playhead: highlighted, with its progress, and playing.
  const isCurrent = currentFrameId(state) === frameId && (state.playing || state.playhead > 0)
  const playing = isCurrent && state.playing
  const lit = frameSelected || isCurrent // the header text turns green instead of the card getting a box

  const toFrame = (e: React.MouseEvent) => {
    const r = inner.current!.getBoundingClientRect()
    return { x: Math.round((e.clientX - r.left) / (SCALE * zoom)), y: Math.round((e.clientY - r.top) / (SCALE * zoom)) }
  }

  // Select tool: press to select, drag to move.
  const onLayerDown = (l: Layer) => (e: React.PointerEvent) => {
    e.stopPropagation()
    if (comment || editing === l.id) return
    dispatch({ type: 'select', target: { kind: 'layer', frameId, layerId: l.id } })
    const sx = e.clientX
    const sy = e.clientY
    let moved = false
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / (SCALE * zoom)
      const dy = (ev.clientY - sy) / (SCALE * zoom)
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
      className="group/card shrink-0 rounded-tile border-2 border-transparent p-1.5 pt-0"
    >
      <div className="mb-1 flex h-7 cursor-default items-center gap-1.5 px-0.5 text-[12px] select-none" style={{ width: CARD_W }}>
        <span className={`font-medium transition-colors ${lit ? 'text-accent-text' : 'text-muted group-hover/card:text-accent-text'}`}>{n}</span>
        <span className={`mr-3 min-w-0 flex-1 truncate transition-colors ${lit ? 'text-accent-text' : 'text-ink group-hover/card:text-accent-text'}`}>{frameTitle(frame)}</span>
        {span && (
          <span className={`shrink-0 text-[11px] tabular-nums transition-colors ${lit ? 'text-accent-text' : 'text-muted group-hover/card:text-accent-text'}`}>
            {`${span.from.toFixed(1)}\u00a0–\u00a0${span.to.toFixed(1)}s\u00a0\u00a0\u00a0·\u00a0\u00a0\u00a0${(span.to - span.from).toFixed(1)}s`}
          </span>
        )}
        {(state.phase === 'animating' || state.phase === 'ready') && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ type: 'preview', open: true, from: frameId, loop: true })
            }}
            title="Loop this shot's animation"
            className={`flex size-4 shrink-0 items-center justify-center rounded-full ${lit ? 'bg-accent text-on-accent' : 'bg-secondary-container text-on-secondary-container group-hover/card:bg-accent group-hover/card:text-on-accent'} transition-colors`}
          >
            <Icon.Play size={7} fill="currentColor" className="ml-px" />
          </button>
        )}
      </div>
      <div className="relative" style={{ width: CARD_W, height: CARD_H }}>
        <div className="absolute inset-0 overflow-hidden rounded-control">
          <div
            ref={inner}
            className="absolute top-0 left-0 origin-top-left"
            style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${SCALE})`, background: frame.background }}
          >
            {playing && <CutIn key={frameId} frameId={frameId} />}
            {!playing && frame.layers.map((l) => (
              <div
                key={l.id}
                style={layerStyle(l)}
                onPointerDown={onLayerDown(l)}
                onClick={onLayerClick(l)}
                onDoubleClick={l.kind === 'text' && !comment ? (e) => {
                  e.stopPropagation()
                  setEditing(l.id)
                } : undefined}
                onPointerEnter={() => setHover(l.id)}
                onPointerLeave={() => setHover((h) => (h === l.id ? null : h))}
              >
                <LayerBody
                  layer={l}
                  edit={
                    editing === l.id
                      ? {
                          onCommit: (text) => {
                            setEditing(null)
                            if (text !== (l.text ?? '')) dispatch({ type: 'layer', frameId, layerId: l.id, patch: { text } })
                          },
                          onCancel: () => setEditing(null),
                        }
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
          {/* The ring is drawn over the image with the thumbnail's own radius, so the two always match. */}
          <div className={`pointer-events-none absolute inset-0 rounded-control ring-inset transition-shadow ${frameSelected ? 'ring-2 ring-accent' : 'ring-1 ring-line group-hover/card:ring-2 group-hover/card:ring-accent'}`} />
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

// The frame's own shot, played in its card: its layers move in from where the
// previous frame left them over the cut's duration, and typed text types itself.
// Mounted while the timeline plays through the frame, so it restarts each pass.
function CutIn({ frameId }: { frameId: string }) {
  const { state } = useApp()
  const board = state.board
  const ids = order(board)
  const idx = ids.indexOf(frameId)
  const frame = board.frames[frameId]
  const prev = idx > 0 ? board.frames[ids[idx - 1]] : undefined
  const cut = prev ? getCut(board, prev.id, frameId) : DEFAULT_CUT
  const instant = !prev || cut.animation === 'instant'
  const dissolve = cut.animation === 'dissolve'
  const transition = instant ? { duration: 0 } : cutTransition(cut)

  return (
    <>
      {frame.layers.map((l) => {
        // The same layer in the previous frame morphs; a recording or a new picture arrives fresh.
        const before = prev?.layers.find((p) => p.id === l.id && l.kind !== 'video' && (l.kind !== 'image' || p.src === l.src))
        const initial = instant ? layerBox(l) : before
            ? layerBox(before)
            : (arrival(l) ?? { ...layerBox(l), opacity: 0, top: dissolve ? l.y : l.y + 24 })
        const from = l.text?.startsWith(before?.text ?? '') ? (before?.text ?? '') : ''
        const chars = (l.text?.length ?? 0) - from.length
        const window = prev ? cutMs(cut) : frame.hold * 1000 * 0.75
        const typing = l.typing ? { from, delay: 100, duration: Math.min(Math.max(300, window - 200), chars * 70) } : undefined
        return (
          <motion.div key={l.id} className="pointer-events-none absolute" initial={initial} animate={layerBox(l)} transition={l.delay ? { ...transition, delay: l.delay } : transition}>
            <LayerBody layer={l} playing typing={typing} />
          </motion.div>
        )
      })}
    </>
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
  // A hovered layer that (nearly) fills the shot would draw a thin square box on top of the card's rounded ring.
  if (tone === 'hover' && ((x1 - x0) * (y1 - y0)) / (FRAME_W * FRAME_H) >= 0.9) return null
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

type PointerMode = 'select' | 'hand' | 'ai'
const POINTER_MODES: { id: PointerMode; label: string; hint: string; key?: string; icon: (typeof Icon)[keyof typeof Icon] }[] = [
  { id: 'select', label: 'Cursor', hint: 'Select and move things', key: 'V', icon: Icon.Cursor },
  { id: 'hand', label: 'Hand', hint: 'Drag to pan the canvas', icon: Icon.Hand },
  { id: 'ai', label: 'AI', hint: 'Point at something, or drag to lasso a section, and say what to change', key: 'C', icon: Icon.Sparkle },
]

// Bottom-center tool bar, as in the reference: pointer (cursor, hand or AI), frame, shape, pen, text.
function Toolbar({ pointer, setPointer }: { pointer: PointerMode; setPointer: (m: PointerMode) => void }) {
  const [tool, setTool] = useState('pointer')
  const [menu, setMenu] = useState(false)
  const tools = [
    { id: 'frame', icon: Icon.Frame },
    { id: 'rect', icon: Icon.Square },
    { id: 'pen', icon: Icon.Pen },
    { id: 'text', icon: Icon.Text },
  ]
  const active = pointer === 'ai' ? 'pointer' : tool
  const current = POINTER_MODES.find((m) => m.id === pointer)!
  const Current = current.icon
  // Anchored to the middle of the viewport, not the canvas: the side panels resize the canvas but not the bar.
  const bar = useRef<HTMLDivElement>(null)
  const [left, setLeft] = useState<number | null>(null)
  useLayoutEffect(() => {
    const host = bar.current?.parentElement
    if (!host) return
    const place = () => setLeft(window.innerWidth / 2 - host.getBoundingClientRect().left)
    place()
    const ro = new ResizeObserver(place)
    ro.observe(host)
    window.addEventListener('resize', place)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [])
  return (
    <div ref={bar} style={left === null ? undefined : { left }} className="absolute bottom-3 left-1/2 z-30 flex h-8 -translate-x-1/2 items-center gap-0.5 rounded-tile bg-raised px-1 shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
      <div className="relative flex items-center">
        <button
          onClick={() => setTool('pointer')}
          title={current.label}
          className={`flex size-6 items-center justify-center rounded-control ${active === 'pointer' ? 'bg-accent text-on-accent' : 'hover:bg-control-hover'}`}
        >
          <Current size={14} />
        </button>
        <button onClick={() => setMenu((m) => !m)} title="Cursor, hand or AI" className="flex h-6 w-4 items-center justify-center rounded-control hover:bg-control-hover">
          <Icon.ChevronDown size={12} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-tile bg-raised p-1 shadow-xl ring-1 ring-line">
              {POINTER_MODES.map(({ id, label, hint, key, icon: I }) => (
                <button
                  key={id}
                  onClick={() => {
                    setPointer(id)
                    setTool('pointer')
                    setMenu(false)
                  }}
                  className="flex w-full items-start gap-2 rounded-control p-2 text-left hover:bg-control-hover"
                >
                  <I size={14} className={`mt-0.5 shrink-0 ${pointer === id ? 'text-accent-text' : 'text-muted'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{label}</span>
                      {key && <kbd className="ml-auto text-[11px] text-subtle">{key}</kbd>}
                    </span>
                    <span className="block text-[11px] leading-snug text-subtle">{hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {tools.map(({ id, icon: I }) => (
        <button
          key={id}
          onClick={() => {
            setTool(id)
            if (pointer !== 'select') setPointer('select')
          }}
          className={`flex size-6 items-center justify-center rounded-control ${active === id ? 'bg-accent text-on-accent' : 'hover:bg-control-hover'}`}
        >
          <I size={14} />
        </button>
      ))}
    </div>
  )
}
