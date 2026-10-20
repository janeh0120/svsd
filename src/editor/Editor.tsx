import { useEffect, useState } from 'react'
import { Player, type LoopMode } from '../components/Player'
import { useApp } from '../context'
import { Icon } from './icons'
import { Canvas } from './Canvas'
import { LeftPanel } from './LeftPanel'
import { CollapsedAnimatePanel, PropertiesPanel } from './PropertiesPanel'
import { Timeline } from './Timeline'

// Both sidebars start at the same width; each can be resized on its own.
const DEFAULTS = { left: 248, right: 248, bottom: 176 }
type Sizes = typeof DEFAULTS
// While the start form is showing, the left panel opens wide enough for its buttons on one line.
const START_WIDTH = 340
const KEY = 'svsd.panel-sizes.v7'

// Panel sizes are a per-viewer convenience, so they live in localStorage.
function usePanelSizes() {
  const [sizes, setSizes] = useState<Sizes>(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
    } catch {
      return DEFAULTS
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(sizes))
    } catch {
      /* storage unavailable: sizes just won't persist */
    }
  }, [sizes])
  const set = (k: keyof Sizes) => (v: number) => setSizes((s) => ({ ...s, [k]: v }))
  return [sizes, set] as const
}

// The Animate panel starts closed; whether it's open is remembered per viewer.
function useAnimateOpen() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem('svsd.animate-open') === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('svsd.animate-open', open ? '1' : '0')
    } catch {
      /* storage unavailable: it just won't be remembered */
    }
  }, [open])
  return [open, setOpen] as const
}

export function Editor() {
  const { state, dispatch } = useApp()
  const [sizes, set] = usePanelSizes()
  const [animateOpen, setAnimateOpen] = useAnimateOpen()
  const [startWidth, setStartWidth] = useState(START_WIDTH)
  const starting = state.phase === 'empty'
  // After Generate the left panel drops back to its default width.
  const setLeft = set('left')
  useEffect(() => {
    if (!starting) setLeft(DEFAULTS.left)
  }, [starting])
  const [loopMode, setLoopMode] = useState<LoopMode>('shot')
  const [speed, setSpeed] = useState(1)
  const [timelineCollapsed, setTimelineCollapsed] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⇧⌘S toggles annotate mode from anywhere, even while typing.
      if (e.key.toLowerCase() === 's' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (state.board.chapters.length) dispatch({ type: 'mode', mode: state.mode === 'comment' ? 'select' : 'comment' })
        return
      }
      if (e.target instanceof Element && e.target.closest('input, textarea, select')) return
      // ⌘Z undoes the last storyboard edit, ⇧⌘Z (or ⌘Y) redoes it. Text fields keep their own undo.
      if ((e.metaKey || e.ctrlKey) && !e.altKey && ['z', 'y'].includes(e.key.toLowerCase())) {
        e.preventDefault()
        dispatch({ type: e.key.toLowerCase() === 'y' || e.shiftKey ? 'redo' : 'undo' })
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'c') dispatch({ type: 'mode', mode: 'comment' })
      if (e.key === 'v') dispatch({ type: 'mode', mode: 'select' })
      if (e.key === 'Escape') {
        if (state.preview) dispatch({ type: 'preview', open: false })
        else if (state.composing) dispatch({ type: 'compose', id: null })
        else if (state.mode === 'comment') dispatch({ type: 'mode', mode: 'select' })
        else dispatch({ type: 'select', target: null })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.preview, state.composing, state.mode, state.board.chapters.length, dispatch])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface p-2 text-[12px] text-ink">
      <div className="flex min-h-0 flex-1">
        <LeftPanel width={starting ? startWidth : sizes.left} />
        <Resizer
          axis="x"
          value={starting ? startWidth : sizes.left}
          min={200}
          max={420}
          sign={1}
          onChange={starting ? setStartWidth : set('left')}
          onReset={() => (starting ? setStartWidth(START_WIDTH) : set('left')(DEFAULTS.left))}
        />
        <Canvas />
        {animateOpen ? (
          <>
            <Resizer axis="x" value={sizes.right} min={200} max={420} sign={-1} onChange={set('right')} onReset={() => set('right')(DEFAULTS.right)} />
            <PropertiesPanel width={sizes.right} onCollapse={() => setAnimateOpen(false)} />
          </>
        ) : (
          <CollapsedAnimatePanel onExpand={() => setAnimateOpen(true)} />
        )}
      </div>
      {!timelineCollapsed && <Resizer axis="y" value={sizes.bottom} min={150} max={400} sign={-1} onChange={set('bottom')} onReset={() => set('bottom')(DEFAULTS.bottom)} />}
      <Timeline height={sizes.bottom} collapsed={timelineCollapsed} onToggle={() => setTimelineCollapsed((c) => !c)} />
      {state.preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-10" onClick={() => dispatch({ type: 'preview', open: false })}>
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Player key={state.previewLoop ? loopMode : 'full'} board={state.board} autoPlay startId={state.previewFrom} loop={state.previewLoop && loopMode} speed={speed} />
            {state.previewLoop && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-white/70">
                <Segmented
                  value={loopMode}
                  onChange={setLoopMode}
                  options={[
                    ['shot', 'Shot only'],
                    ['cut', 'With transition'],
                  ]}
                />
                <span className="ml-auto" title="Playback speed"><Icon.Gauge size={20} strokeWidth={1.4} /></span>
                <Segmented
                  value={speed}
                  onChange={setSpeed}
                  options={[
                    [1, '1×'],
                    [0.5, '0.5×'],
                    [0.25, '0.25×'],
                    [0.1, '0.1×'],
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// A small segmented control for the preview's loop and speed options.
function Segmented<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex rounded-tile bg-white/10 p-1">
      {options.map(([v, label]) => (
        <button
          key={String(v)}
          onClick={() => onChange(v)}
          className={`h-7 rounded-control px-3 transition-colors ${v === value ? 'bg-white/20 font-medium text-white' : 'hover:text-white'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// Drag handle on a panel edge. Double-click resets to the default size.
function Resizer({
  axis,
  value,
  min,
  max,
  sign,
  onChange,
  onReset,
}: {
  axis: 'x' | 'y'
  value: number
  min: number
  max: number
  sign: 1 | -1
  onChange: (v: number) => void
  onReset: () => void
}) {
  const down = (e: React.PointerEvent) => {
    e.preventDefault()
    const start = axis === 'x' ? e.clientX : e.clientY
    const v0 = value
    const cursor = axis === 'x' ? 'col-resize' : 'row-resize'
    document.body.style.cursor = cursor
    document.body.style.userSelect = 'none'
    const move = (ev: PointerEvent) => {
      const d = (axis === 'x' ? ev.clientX : ev.clientY) - start
      onChange(Math.round(Math.min(max, Math.max(min, v0 + sign * d))))
    }
    const up = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      onPointerDown={down}
      onDoubleClick={onReset}
      className={`group relative z-30 shrink-0 ${axis === 'x' ? '-mt-2 w-px cursor-col-resize bg-line' : '-mx-2 h-px cursor-row-resize bg-line'}`}
    >
      <div
        className={`absolute transition-colors group-hover:bg-accent-line/50 group-active:bg-accent ${
          axis === 'x' ? 'inset-y-0 -left-[2px] w-[5px]' : 'inset-x-0 -top-[2px] h-[5px]'
        }`}
      />
    </div>
  )
}
