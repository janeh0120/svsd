import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { DEFAULT_CUT, FEELS, FRAME_H, FRAME_W, getCut, order } from '../board'
import type { Storyboard } from '../types'
import { LayerBody, layerBox } from './Layer'

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

// Plays the storyboard: layers with the same id move from one frame to the
// next using the cut's feel; new layers fade in, missing ones fade out.
export function Player({ board, autoPlay = false }: { board: Storyboard; autoPlay?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const ids = order(board)
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(autoPlay)
  const idx = Math.min(i, ids.length - 1)
  const frame = board.frames[ids[idx]]
  const cut = idx > 0 ? getCut(board, ids[idx - 1], ids[idx]) : DEFAULT_CUT
  const transition = FEELS[cut.feel].transition

  useEffect(() => {
    if (!playing || !frame) return
    const wait = (idx === 0 ? 0 : FEELS[cut.feel].ms) + frame.hold * 1000
    const t = setTimeout(() => (idx < ids.length - 1 ? setI(idx + 1) : setPlaying(false)), wait)
    return () => clearTimeout(t)
  }, [playing, idx, frame, cut.feel, ids.length])

  if (!frame) return null
  const play = () => {
    if (!playing && idx === ids.length - 1) setI(0)
    setPlaying(!playing)
  }
  const total = ids.reduce((s, id) => s + board.frames[id].hold, 0)

  return (
    <div ref={ref} className="w-full">
      <div className="relative overflow-hidden rounded-xl" style={{ height: (width * FRAME_H) / FRAME_W }}>
        <motion.div
          className="absolute top-0 left-0 overflow-hidden"
          style={{ width: FRAME_W, height: FRAME_H, scale: width / FRAME_W, originX: 0, originY: 0 }}
          initial={false}
          animate={{ backgroundColor: frame.background }}
          transition={transition}
        >
          <AnimatePresence>
            {frame.layers.map((l) => (
              <motion.div
                // An image that changes source cross-fades instead of popping.
                key={l.kind === 'image' ? `${l.id}:${l.src}` : l.id}
                className="absolute"
                initial={{ ...layerBox(l), opacity: 0, y: 24 }}
                animate={{ ...layerBox(l), y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.35 } }}
                transition={transition}
              >
                <LayerBody layer={l} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

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
        <span className="w-48 shrink-0 text-right text-[11px] text-white/60">
          Frame {idx + 1}/{ids.length} · {idx > 0 ? `${FEELS[cut.feel].label} cut` : 'Opening'} · ~{total.toFixed(0)}s
        </span>
      </div>
    </div>
  )
}
