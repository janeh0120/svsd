import { useEffect, useState } from 'react'
import { Player } from '../components/Player'
import { useApp } from '../context'
import { Canvas } from './Canvas'
import { LeftPanel } from './LeftPanel'
import { CollapsedAnimatePanel, PropertiesPanel } from './PropertiesPanel'
import { Timeline } from './Timeline'

// Both sidebars start at the same width; each can be resized on its own.
const DEFAULTS = { left: 240, right: 240, bottom: 176 }
type Sizes = typeof DEFAULTS
const KEY = 'svsd.panel-sizes.v4'

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⇧⌘S toggles annotate mode from anywhere, even while typing.
      if (e.key.toLowerCase() === 's' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (state.board.chapters.length) dispatch({ type: 'mode', mode: state.mode === 'comment' ? 'select' : 'comment' })
        return
      }
      if (e.target instanceof Element && e.target.closest('input, textarea, select')) return
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
    <div className="flex h-screen flex-col overflow-hidden bg-surface text-[12px] text-ink">
      <div className="flex min-h-0 flex-1">
        <LeftPanel width={sizes.left} />
        <Resizer axis="x" value={sizes.left} min={200} max={420} sign={1} onChange={set('left')} onReset={() => set('left')(DEFAULTS.left)} />
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
      <Resizer axis="y" value={sizes.bottom} min={150} max={400} sign={-1} onChange={set('bottom')} onReset={() => set('bottom')(DEFAULTS.bottom)} />
      <Timeline height={sizes.bottom} />
      {state.preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-10" onClick={() => dispatch({ type: 'preview', open: false })}>
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Player board={state.board} autoPlay startId={state.previewFrom} />
          </div>
        </div>
      )}
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
      className={`group relative z-30 shrink-0 ${axis === 'x' ? 'w-px cursor-col-resize bg-line' : 'h-px cursor-row-resize bg-line'}`}
    >
      <div
        className={`absolute transition-colors group-hover:bg-accent-line/50 group-active:bg-accent ${
          axis === 'x' ? 'inset-y-0 -left-[2px] w-[5px]' : 'inset-x-0 -top-[2px] h-[5px]'
        }`}
      />
    </div>
  )
}
