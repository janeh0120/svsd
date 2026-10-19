import { useEffect, useState, type ReactNode } from 'react'
import { ANIMATIONS, DEFAULT_CAMERA, FEELS, cutEase, cutKey, cutMs, getCut, order, targetLabel } from '../board'
import { useApp } from '../context'
import type { Cut, CutAnimation, Feel } from '../types'
import { DesignPanel } from './DesignPanel'
import { Icon } from './icons'
import { BezierEditor, CameraEditor, EasePreview } from './MotionControls'

// Right sidebar: Design (properties of the selected frame or layer) and
// Animate (live preview plus motion: cuts, timing, camera).
export function PropertiesPanel({ width, onCollapse }: { width: number; onCollapse: () => void }) {
  const { state, dispatch } = useApp()
  const [tab, setTab] = useState<'design' | 'animate'>('design')

  // A connector is pure motion, so selecting one goes to Animate; a frame or layer goes to Design.
  useEffect(() => {
    const kind = state.selection?.kind
    if (kind === 'cut') setTab('animate')
    else if (kind === 'frame' || kind === 'layer') setTab('design')
  }, [state.selection])

  return (
    <aside className="flex shrink-0 flex-col bg-surface" style={{ width }}>
      <div className="flex h-10 shrink-0 items-center gap-1 px-3">
        <button onClick={onCollapse} title="Hide panel" className="-ml-1.5 flex size-7 items-center justify-center rounded-md text-muted hover:bg-control-hover">
          <Icon.PanelRight size={14} />
        </button>
        <button className="ml-auto h-7 rounded-md bg-accent px-2.5 font-medium text-on-accent hover:brightness-95" title="Coming soon">
          Export
        </button>
      </div>
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-2">
        {(['design', 'animate'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-7 rounded-md px-2 capitalize ${tab === t ? 'bg-control font-medium' : 'text-muted hover:text-ink'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'design' ? (
          <DesignPanel />
        ) : (
          <AnimateSelection />
        )}
      </div>
    </aside>
  )
}

// Animate tab, for the selection: a connector's motion, or a frame's (or its
// layer's frame's) cut in, hold time and camera.
function AnimateSelection() {
  const { state, dispatch } = useApp()
  const { board, selection: sel } = state
  if (!sel) return null

  const title = <p className="px-3 pt-3 pb-1 font-display text-[13px] font-semibold">{targetLabel(sel, board)}</p>

  if (sel.kind === 'cut') {
    const [from, to] = sel.key.split('->')
    return (
      <>
        {title}
        <MotionSection cutId={sel.key} cut={getCut(board, from, to)} />
      </>
    )
  }
  if (sel.kind !== 'frame' && sel.kind !== 'layer') return title

  const frame = board.frames[sel.frameId]
  if (!frame) return null
  const ids = order(board)
  const prev = ids[ids.indexOf(frame.id) - 1]
  return (
    <>
      {title}
      {prev && <MotionSection cutId={cutKey(prev, frame.id)} cut={getCut(board, prev, frame.id)} label="Cut in" />}
      <Section title="Timing">
        <Labeled label="Hold">
          <Field
            prefix={<Icon.Diamond size={10} />}
            value={frame.hold * 1000}
            suffix="ms"
            step={100}
            onChange={(v) => dispatch({ type: 'frame', frameId: frame.id, patch: { hold: Math.max(0.2, v / 1000) } })}
          />
        </Labeled>
      </Section>
      <CameraSection frameId={frame.id} />
    </>
  )
}

// Animation type, easing (preset or custom bezier), duration, curve and preview.
function MotionSection({ cutId, cut, label }: { cutId: string; cut: Cut; label?: string }) {
  const { dispatch } = useApp()
  const set = (patch: Partial<Cut>) => dispatch({ type: 'cut', key: cutId, patch })
  const bezier = cutEase(cut)
  const easing = cut.bezier ? 'custom' : cut.feel

  return (
    <div className="space-y-2 border-b border-line p-3 pt-2">
      {label && <p className="text-[11px] text-muted">{label}</p>}
      <Labeled label="Animation">
        <Select value={cut.animation ?? 'smart'} onChange={(v) => set({ animation: v as CutAnimation })} options={Object.entries(ANIMATIONS)} />
      </Labeled>
      <Labeled label="Easing">
        <Select
          value={easing}
          icon={<CurveGlyph />}
          onChange={(v) => (v === 'custom' ? set({ bezier }) : set({ feel: v as Feel, bezier: undefined }))}
          options={[...Object.entries(FEELS).map(([k, f]) => [k, f.label] as [string, string]), ['custom', 'Custom bezier']]}
        />
      </Labeled>
      <Labeled label="Duration">
        <Field prefix={<Icon.Loop size={11} />} value={cutMs(cut)} suffix="ms" step={50} onChange={(v) => set({ duration: Math.max(0, v) })} />
      </Labeled>
      <BezierEditor value={bezier} onChange={(b) => set({ bezier: b })} />
      <div className="flex items-center gap-1">
        <BezierInput value={bezier} onChange={(b) => set({ bezier: b })} />
        <button
          title="Copy as CSS"
          onClick={() => {
            try {
              navigator.clipboard?.writeText(`cubic-bezier(${bezier.join(', ')})`)
            } catch {
              /* clipboard unavailable */
            }
          }}
          className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-control-hover"
        >
          <Icon.Copy size={12} />
        </button>
      </div>
      <EasePreview bezier={bezier} ms={cutMs(cut)} />
    </div>
  )
}

function CameraSection({ frameId }: { frameId: string }) {
  const { state, dispatch } = useApp()
  const frame = state.board.frames[frameId]
  if (!frame) return null
  return (
    <Section title="Camera">
      <p className="text-[11px] text-muted">Pan & zoom</p>
      <CameraEditor frame={frame} camera={frame.camera ?? DEFAULT_CAMERA} onChange={(camera) => dispatch({ type: 'frame', frameId, patch: { camera } })} />
      <button
        onClick={() => dispatch({ type: 'frame', frameId, patch: { camera: DEFAULT_CAMERA } })}
        className="h-7 w-full rounded-md bg-control text-[11px] text-muted hover:bg-control-hover"
        title="Reset to the whole frame"
      >
        Adjust the area to control zoom.
      </button>
    </Section>
  )
}

// Typed "x1, y1, x2, y2" bezier values; applied when all four parse.
function BezierInput({ value, onChange }: { value: [number, number, number, number]; onChange: (b: [number, number, number, number]) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md bg-control px-2">
      <CurveGlyph />
      <input
        value={draft ?? value.join(', ')}
        onChange={(e) => {
          setDraft(e.target.value)
          const n = e.target.value.split(',').map((v) => Number(v.trim()))
          if (n.length === 4 && n.every((v) => !Number.isNaN(v))) onChange([n[0], n[1], n[2], n[3]])
        }}
        onBlur={() => setDraft(null)}
        className="w-full min-w-0 bg-transparent outline-none"
      />
    </label>
  )
}

function CurveGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 text-muted">
      <path d="M1 11 C 6 11, 6 1, 11 1" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2 border-b border-line p-3">
      <div className="flex h-5 items-center">
        <span className="font-display font-semibold">{title}</span>
        <span className="ml-auto">{action}</span>
      </div>
      {children}
    </div>
  )
}

// Label on the left, control on the right.
function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-muted">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function Field({ prefix, value, onChange, suffix, step = 1 }: { prefix: ReactNode; value: number; onChange: (v: number) => void; suffix?: string; step?: number }) {
  return (
    <label className="flex h-7 min-w-0 items-center gap-1.5 rounded-md bg-control px-2">
      <span className="flex w-3 shrink-0 justify-center text-[11px] text-muted">{prefix}</span>
      <input
        type="number"
        step={step}
        value={Number.isInteger(value) ? value : +value.toFixed(2)}
        onChange={(e) => e.target.value !== '' && onChange(+e.target.value)}
        className="w-full min-w-0 bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && <span className="text-muted">{suffix}</span>}
    </label>
  )
}

function Select({ value, onChange, options, icon }: { value: string; onChange: (v: string) => void; options: [string, string][]; icon?: ReactNode }) {
  return (
    <label className="relative flex h-7 items-center gap-1.5 rounded-md border border-line px-2 focus-within:border-accent-line">
      {icon}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 appearance-none bg-transparent font-medium outline-none">
        {options.map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      <Icon.ChevronDown size={12} className="pointer-events-none shrink-0 text-muted" />
    </label>
  )
}

// The panel folded away: just an icon button floating in the top-right corner.
export function CollapsedAnimatePanel({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="relative w-0 shrink-0">
      <button
        onClick={onExpand}
        title="Show panel"
        className="absolute top-1.5 right-2 z-30 flex size-7 items-center justify-center rounded-md border border-line bg-raised text-muted shadow-sm hover:text-ink"
      >
        <Icon.PanelRight size={14} />
      </button>
    </div>
  )
}
