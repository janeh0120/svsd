import { AnimatePresence, motion, type Transition } from 'motion/react'
import { useEffect, useState } from 'react'
import { DEFAULT_CAMERA, DEFAULT_CUT, FRAME_H, FRAME_W, cutMs, cutTransition, exitOf, getCut, order, UI_EASE } from '../board'
import { Icon } from '../editor/icons'
import { useApp } from '../context'
import type { Storyboard } from '../types'
import { LayerBody, arrival, departure, layerBox } from './Layer'

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
// A shot loop replays one shot: 'shot' is just its hold (the frame at rest, micro-motions
// included); 'cut' is the frame before it, the cut into it, then the hold.
export type LoopMode = 'shot' | 'cut'

export function Player({ board, autoPlay = false, compact = false, startId, loop = false, speed = 1 }: { board: Storyboard; autoPlay?: boolean; compact?: boolean; startId?: string | null; loop?: LoopMode | false; speed?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { state, startComment } = useApp()
  const comment = state.mode === 'comment'
  const ids = order(board)
  // `loop` replays just startId's animation: the frame before it, the cut in, then its hold.
  const target = Math.max(0, startId ? ids.indexOf(startId) : 0)
  const solo = loop === 'shot'
  const k = 1 / speed // slow-motion factor: every duration and delay is stretched by it
  const slow = (t: Transition): Transition => {
    const delay = (("delay" in t ? t.delay : 0) ?? 0) * k
    // A spring has no duration, so stretching time means a softer, more damped spring.
    if ('type' in t && t.type === 'spring') return { ...t, stiffness: (t.stiffness ?? 100) / (k * k), damping: (t.damping ?? 10) / k, delay }
    return { ...t, duration: (("duration" in t ? t.duration : 0) ?? 0) * k, delay }
  }
  const loopFrom = solo ? target : Math.max(0, target - 1)
  const [round, setRound] = useState(0)
  const [i, setI] = useState(() => (loop ? loopFrom : target))
  const [playing, setPlaying] = useState(autoPlay)
  const [progress, setProgress] = useState(0)
  const idx = Math.min(i, ids.length - 1)
  const frame = board.frames[ids[idx]]
  const cut = idx > 0 ? getCut(board, ids[idx - 1], ids[idx]) : DEFAULT_CUT
  const transition = slow(idx > 0 && !(loop && idx === loopFrom) ? cutTransition(cut) : { duration: 0 }) // looping back to the start snaps
  // In a shot loop the frame before the target only rests briefly, so the loop stays tight.
  const durations = ids.map((id, n) => (solo && n === target ? board.frames[id].hold * 1000 : loop && n === loopFrom && n < target ? 400 : (n > 0 ? cutMs(getCut(board, ids[n - 1], id)) : 0) + board.frames[id].hold * 1000) * k)
  const total = durations.reduce((a, b) => a + b, 0)

  useEffect(() => {
    if (!playing || !frame) return
    const wait = durations[idx]
    const t = setTimeout(() => {
      if (loop && idx >= target) {
        setI(loopFrom)
        setRound((r) => r + 1)
      } else if (idx < ids.length - 1) setI(idx + 1)
      else setPlaying(false)
    }, wait)
    return () => clearTimeout(t)
  }, [playing, idx, round, frame, durations[idx], ids.length]) // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [playing, idx, round]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!frame) return compact ? <div className="aspect-[1.6] rounded-tile bg-[#2B2B2B]" /> : null

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
      className={`group/stage relative overflow-hidden ${comment ? 'cursor-ai' : ''}`}
      style={{ height: (width * FRAME_H) / FRAME_W }}
    >
      {comment && (
        <span className="pointer-events-none absolute top-1.5 left-1.5 z-10 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-on-accent opacity-0 group-hover/stage:opacity-100">
          Click to annotate this moment
        </span>
      )}
      <motion.div
        key={solo ? round : 'stage'}
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
                className={`absolute ${comment ? 'hover:outline-2 hover:outline-dashed hover:outline-accent-line' : ''}`}
                data-layer={l.id}
                initial={arrival(l) ?? { ...layerBox(l), opacity: 0, y: dissolve ? 0 : 24 }}
                animate={{ ...layerBox(l), y: 0 }}
                // A dissolve keeps the old layer opaque underneath until the new frame has faded
                // in on top, so the crossfade never dips through the background.
                exit={{
                  opacity: 0,
                  ...departure(l),
                  transition: slow(
                    dissolve && !l.exit
                      ? { duration: 0, delay: cutMs(cut) / 1000 }
                      : l.exit && dissolve
                        ? { duration: Math.max(0.2, cutMs(cut) / 1000 - (l.exitDelay ?? 0)), delay: l.exitDelay ?? 0, ease: UI_EASE }
                        : { ...cutTransition(exitOf(frame)), delay: l.exitDelay ?? 0 },
                  ),
                }}
                transition={l.delay ? { ...transition, delay: l.delay * k } : transition}
              >
                <LayerBody layer={l} playing={playing} typing={l.typing ? typingFor(l) : undefined} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  )

  // Text marked `typing` types itself in during the cut into this frame, so it's
  // complete when the frame lands (frame 2's empty box → frame 3's full question).
  // It picks up from the previous frame's text when this text continues it.
  function typingFor(l: (typeof frame.layers)[number]) {
    const before = idx > 0 && !solo ? (board.frames[ids[idx - 1]].layers.find((p) => p.id === l.id)?.text ?? '') : ''
    const from = l.text?.startsWith(before) ? before : ''
    const chars = (l.text?.length ?? 0) - from.length
    const window = idx > 0 && !solo ? cutMs(cut) : frame.hold * 1000 * 0.75
    return { from, delay: 100 * k, duration: Math.min(Math.max(300, window - 200), chars * 70) * k }
  }

  if (compact) {
    return (
      <div>
        <div className="rounded-tile bg-[#2B2B2B] p-3">
          <div className="overflow-hidden rounded-sm">{stage}</div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button onClick={play} title={playing ? 'Pause' : 'Play'}>
            {playing ? <Icon.Pause size={10} /> : <Icon.Play size={10} fill="currentColor" />}
          </button>
          <div className="h-[3px] flex-1 rounded-full bg-line">
            <div className="h-full rounded-full bg-accent" style={{ width: `${total ? (progress / total) * 100 : 0}%` }} />
          </div>
          <span className="text-[11px] text-muted tabular-nums">{((total * speed) / 1000).toFixed(1)}s</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-tile">{stage}</div>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={play} title={playing ? 'Pause' : 'Play'} className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
          {playing ? <Icon.Pause size={12} /> : <Icon.Play size={11} fill="currentColor" />}
        </button>
        <div className="flex h-1.5 flex-1 gap-1">
          {ids.map((id, n) => (
            <button
              key={id}
              onClick={() => setI(n)}
              style={{ flexGrow: board.frames[id].hold }}
              className={`h-full rounded-full ${n < idx ? 'bg-raised/70' : n === idx ? 'bg-accent' : 'bg-raised/20'}`}
            />
          ))}
        </div>
        <span className="shrink-0 text-right text-[11px] whitespace-nowrap text-white/60">
          Shot {idx + 1}/{ids.length} · {((total * speed) / 1000).toFixed(1)}s
        </span>
      </div>
    </div>
  )
}
