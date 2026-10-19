import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { DEFAULT_CAMERA, DEFAULT_CUT, FRAME_H, FRAME_W, cutMs, cutTransition, getCut, order } from '../board'
import { Icon } from '../editor/icons'
import { useApp } from '../context'
import type { Storyboard } from '../types'
import { LayerBody, layerBox } from './Layer'

// Width of an element that may mount later (the stage only exists once there are frames).
function useWidth<T extends HTMLElement>() {
  const [el, ref] = useState<T | null>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [ref, w] as const
}

// Plays the storyboard. With Smart animate, layers with the same id move from
// one frame to the next; Dissolve cross-fades whole frames; Instant cuts. The
// camera pans and zooms to each frame's camera box using the cut's easing.
// `compact` is the small preview in the sidebar; otherwise it's the full-screen player.
export function Player({ board, autoPlay = false, compact = false }: { board: Storyboard; autoPlay?: boolean; compact?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { state, startComment } = useApp()
  const comment = state.mode === 'comment'
  const ids = order(board)
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(autoPlay)
  const [progress, setProgress] = useState(0)
  const idx = Math.min(i, ids.length - 1)
  const frame = board.frames[ids[idx]]
  const cut = idx > 0 ? getCut(board, ids[idx - 1], ids[idx]) : DEFAULT_CUT
  const transition = idx > 0 ? cutTransition(cut) : { duration: 0 }
  const durations = ids.map((id, n) => (n > 0 ? cutMs(getCut(board, ids[n - 1], id)) : 0) + board.frames[id].hold * 1000)
  const total = durations.reduce((a, b) => a + b, 0)

  useEffect(() => {
    if (!playing || !frame) return
    const wait = durations[idx]
    const t = setTimeout(() => (idx < ids.length - 1 ? setI(idx + 1) : setPlaying(false)), wait)
    return () => clearTimeout(t)
  }, [playing, idx, frame, durations[idx], ids.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Smooth progress bar while playing.
  useEffect(() => {
    const before = durations.slice(0, idx).reduce((a, b) => a + b, 0)
    if (!playing) return setProgress(before)
    const start = performance.now()
    let raf = 0
    const tick = () => {
      setProgress(Math.min(before + performance.now() - start, before + durations[idx]))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, idx]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!frame) return compact ? <div className="aspect-[1.6] rounded-lg bg-[#2B2B2B]" /> : null

  const play = () => {
    if (!playing && idx === ids.length - 1) setI(0)
    setPlaying(!playing)
  }
  const cam = frame.camera ?? DEFAULT_CAMERA
  const s = 1 / cam.w
  const dissolve = cut.animation === 'dissolve'

  // Annotate mode: clicking the preview pauses it and pins a comment to this
  // moment, and to the layer under the pointer if there is one.
  const annotate = (e: React.MouseEvent) => {
    if (!comment) return
    e.stopPropagation()
    setPlaying(false)
    const layerId = (e.target as Element).closest('[data-layer]')?.getAttribute('data-layer') ?? undefined
    startComment({ kind: 'time', ms: Math.round(progress), layerId })
  }

  const stage = (
    <div
      ref={ref}
      onClick={annotate}
      className={`group/stage relative overflow-hidden ${comment ? 'cursor-crosshair' : ''}`}
      style={{ height: (width * FRAME_H) / FRAME_W }}
    >
      {comment && (
        <span className="pointer-events-none absolute top-1.5 left-1.5 z-10 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 group-hover/stage:opacity-100">
          Click to annotate this moment
        </span>
      )}
      <motion.div
        className="absolute top-0 left-0 overflow-hidden"
        style={{ width: FRAME_W, height: FRAME_H, scale: width / FRAME_W, originX: 0, originY: 0 }}
        initial={false}
        animate={{ backgroundColor: frame.background }}
        transition={transition}
      >
        {/* Camera: scale up and shift so the camera box fills the stage. */}
        <motion.div
          className="absolute inset-0"
          style={{ originX: 0, originY: 0 }}
          initial={false}
          animate={{ scale: s, x: -cam.x * FRAME_W * s, y: -cam.y * FRAME_H * s }}
          transition={transition}
        >
          <AnimatePresence>
            {frame.layers.map((l) => (
              <motion.div
                // Same key across frames = the layer moves (Smart animate). Dissolve keys
                // layers per frame so the old frame fades out as the new one fades in.
                key={dissolve ? `${frame.id}:${l.id}` : l.kind === 'image' ? `${l.id}:${l.src}` : l.kind === 'video' ? `${frame.id}:${l.id}` : l.id}
                className={`absolute ${comment ? 'hover:outline-2 hover:outline-dashed hover:outline-orange-500' : ''}`}
                data-layer={l.id}
                initial={{ ...layerBox(l), opacity: 0, y: dissolve ? 0 : 24 }}
                animate={{ ...layerBox(l), y: 0 }}
                exit={{ opacity: 0, transition: { duration: dissolve ? cutMs(cut) / 1000 : 0.35 } }}
                transition={transition}
              >
                <LayerBody layer={l} playing={playing} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  )

  if (compact) {
    return (
      <div>
        <div className="rounded-lg bg-[#2B2B2B] p-3">
          <div className="overflow-hidden rounded-sm">{stage}</div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button onClick={play} title={playing ? 'Pause' : 'Play'}>
            {playing ? <Icon.Pause size={10} /> : <Icon.Play size={10} fill="currentColor" />}
          </button>
          <div className="h-[3px] flex-1 rounded-full bg-[#E6E6E6]">
            <div className="h-full rounded-full bg-[#1E1E1E]" style={{ width: `${total ? (progress / total) * 100 : 0}%` }} />
          </div>
          <span className="text-[11px] text-[#8C8C8C] tabular-nums">{(total / 1000).toFixed(1)}s</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-xl">{stage}</div>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={play} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[12px] text-[#1E1E1E]">
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="flex h-1.5 flex-1 gap-1">
          {ids.map((id, n) => (
            <button
              key={id}
              onClick={() => setI(n)}
              style={{ flexGrow: board.frames[id].hold }}
              className={`h-full rounded-full ${n < idx ? 'bg-white/70' : n === idx ? 'bg-sky-400' : 'bg-white/20'}`}
            />
          ))}
        </div>
        <span className="w-24 shrink-0 text-right text-[11px] text-white/60">
          Frame {idx + 1}/{ids.length} · {(total / 1000).toFixed(1)}s
        </span>
      </div>
    </div>
  )
}
