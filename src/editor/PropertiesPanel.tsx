import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ANIMATIONS, DEFAULT_CAMERA, DEFAULT_SPRING, FEELS, cutEase, cutKey, cutMs, exitOf, getCut, order, targetLabel } from '../board'
import { useApp } from '../context'
import type { Cut, CutAnimation, Spring, Storyboard } from '../types'
import { requestZoom, useCanvasZoom } from './canvasZoom'
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
    <aside className="flex shrink-0 flex-col bg-surface pl-2" style={{ width: width + 8 }}>
      <div className="flex h-10 shrink-0 items-center gap-1 px-3">
        <button onClick={onCollapse} title="Hide panel" className="-ml-1.5 flex size-7 items-center justify-center rounded-control text-muted hover:bg-control-hover">
          <Icon.PanelRight size={14} />
        </button>
        <button
          onClick={() => dispatch({ type: 'preview', open: true })}
          title="Preview the reel"
          className="ml-auto flex h-7 items-center gap-1.5 rounded-tile border border-line px-3 font-medium hover:bg-control-hover"
        >
          <Icon.Play size={14} className="relative -top-px" />
          Preview
        </button>
        <button className="h-7 rounded-tile bg-accent px-3 font-medium text-on-accent hover:brightness-95" title="Coming soon">
          Export
        </button>
      </div>
      <div className="flex h-10 shrink-0 items-center rule-b px-1">
        {(['design', 'animate'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-7 rounded-tile px-2 capitalize ${tab === t ? 'bg-control font-medium' : 'text-muted hover:text-ink'}`}
          >
            {t}
          </button>
        ))}
        <ZoomMenu />
      </div>
      <div className="-mr-2 -ml-2 min-h-0 flex-1 overflow-y-auto px-2">
        {tab === 'design' ? (
          <DesignPanel />
        ) : (
          <AnimateSelection />
        )}
      </div>
    </aside>
  )
}

// Zoom of the storyboard canvas, as a percentage that opens a short list of views.
function ZoomMenu() {
  const zoom = useCanvasZoom()
  return (
    <div className="ml-auto w-16">
      <PickerField
        title="Zoom"
        bare
        trigger={<span className="min-w-0 flex-1 text-right tabular-nums">{Math.round(zoom * 100)}%</span>}
      >
        {(close, row) => (
          <>
            {(
              [
                ['Zoom in', zoom * 1.25],
                ['Zoom out', zoom / 1.25],
                ['Zoom to 50%', 0.5],
                ['Zoom to 100%', 1],
                ['Zoom to 200%', 2],
              ] as const
            ).map(([label, z]) => (
              <button
                key={label}
                onClick={() => {
                  requestZoom(z)
                  close()
                }}
                className={row}
              >
                <span className="flex-1">{label}</span>
              </button>
            ))}
          </>
        )}
      </PickerField>
    </div>
  )
}

// Animate tab, for the selection: a connector's motion, or a frame's (or its
// layer's frame's) enter, camera and exit.
function AnimateSelection() {
  const { state, dispatch } = useApp()
  const { board, selection: sel } = state
  if (!sel) return null

  const title = (
    <div className="flex h-11 items-center rule-b px-3">
      <span className="font-display text-[13px] font-semibold">{targetLabel(sel, board)}</span>
    </div>
  )

  if (sel.kind === 'cut') {
    const [from, to] = sel.key.split('->')
    return (
      <>
        {title}
        <MotionSection cut={getCut(board, from, to)} onChange={(patch) => dispatch({ type: 'cut', key: sel.key, patch })} between={crossesChapters(board, from, to)} />
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
      {prev && (
        <MotionSection
          cut={getCut(board, prev, frame.id)}
          onChange={(patch) => dispatch({ type: 'cut', key: cutKey(prev, frame.id), patch })}
          label="Enter"
          between={crossesChapters(board, prev, frame.id)}
        />
      )}
      <MotionSection cut={exitOf(frame)} onChange={(patch) => dispatch({ type: 'frame', frameId: frame.id, patch: { exit: { ...frame.exit, ...patch } } })} label="Exit" noAnimation />
      <CameraSection frameId={frame.id} />
    </>
  )
}

// Animation type, easing (preset or custom bezier), duration, curve and preview.
// A cut between the last frame of one chapter and the first of the next is a transition between chapters.
const crossesChapters = (b: Storyboard, from: string, to: string) =>
  b.chapters.find((a) => a.frameIds.includes(from))?.id !== b.chapters.find((a) => a.frameIds.includes(to))?.id

type Bez = [number, number, number, number]

// Saved custom easings are a per-viewer convenience, so they live in localStorage.
type SavedEasing = { id: string; name: string; bezier?: Bez; spring?: Spring }
const SAVED_KEY = 'svsd.saved-easings'
function useSavedEasings() {
  const [list, setList] = useState<SavedEasing[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')
    } catch {
      return []
    }
  })
  const update = (next: SavedEasing[]) => {
    setList(next)
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable: it just won't be remembered */
    }
  }
  return [list, update] as const
}

// Section header, shared by every block in the Animate panel.
function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex h-5 items-center">
      <span className="font-display font-semibold">{title}</span>
    </div>
  )
}

// Animation type (cuts only), easing (preset, custom bezier or custom spring), duration and preview.
// A cut between the last frame of one chapter and the first of the next is a transition between chapters.
// An exit is the same fields, but it lives on the frame and sets how its layers leave.
function MotionSection({ cut, onChange, label, between, noAnimation }: { cut: Cut; onChange: (patch: Partial<Cut>) => void; label?: string; between?: boolean; noAnimation?: boolean }) {
  const bezier = cutEase(cut)
  const spring = cut.spring ?? DEFAULT_SPRING
  const [saved, setSaved] = useSavedEasings()

  const save = () => {
    const n = saved.length + 1
    const entry: SavedEasing = cut.custom === 'spring' ? { id: String(Date.now()), name: `Custom spring ${n}`, spring } : { id: String(Date.now()), name: `Custom bezier ${n}`, bezier }
    setSaved([...saved, entry])
  }

  return (
    <div className="space-y-3 rule-b p-3">
      {label && <SectionTitle title={label} />}
      {!noAnimation && (
        <Labeled label={between ? 'Transition' : 'Animation'}>
          <TransitionPicker value={cut.animation ?? 'smart'} onPick={(v) => onChange({ animation: v })} />
        </Labeled>
      )}
      <Labeled label="Easing">
        <EasingPicker cut={cut} saved={saved} onRemove={(id) => setSaved(saved.filter((e) => e.id !== id))} onChange={onChange} />
      </Labeled>
      <Labeled label="Duration">
        <Field prefix={<Icon.Loop size={11} />} value={cutMs(cut)} suffix="ms" step={50} onChange={(v) => onChange({ duration: Math.max(0, v) })} />
      </Labeled>
      {cut.custom === 'bezier' && (
        <>
          <BezierEditor value={bezier} onChange={(b) => onChange({ bezier: b })} />
          <div className="flex items-center gap-1">
            <BezierInput value={bezier} onChange={(b) => onChange({ bezier: b })} />
            <button
              title="Copy as CSS"
              onClick={() => {
                try {
                  navigator.clipboard?.writeText(`cubic-bezier(${bezier.join(', ')})`)
                } catch {
                  /* clipboard unavailable */
                }
              }}
              className="flex size-7 shrink-0 items-center justify-center rounded-control hover:bg-control-hover"
            >
              <Icon.Copy size={12} />
            </button>
          </div>
        </>
      )}
      {cut.custom === 'spring' && (
        <div className="space-y-1.5">
          <Labeled label="Stiffness">
            <Field prefix="K" value={spring.stiffness} step={10} onChange={(v) => onChange({ spring: { ...spring, stiffness: Math.max(1, v) } })} />
          </Labeled>
          <Labeled label="Damping">
            <Field prefix="C" value={spring.damping} step={1} onChange={(v) => onChange({ spring: { ...spring, damping: Math.max(0.1, v) } })} />
          </Labeled>
          <Labeled label="Mass">
            <Field prefix="M" value={spring.mass} step={0.1} onChange={(v) => onChange({ spring: { ...spring, mass: Math.max(0.1, v) } })} />
          </Labeled>
        </div>
      )}
      {cut.custom && (
        <button onClick={save} className="flex h-7 w-full items-center justify-center gap-1.5 rounded-tile bg-control text-[11px] text-muted hover:bg-control-hover hover:text-ink">
          <Icon.Plus size={11} />
          Save easing
        </button>
      )}
      <EasePreview bezier={bezier} spring={cut.custom === 'spring' ? spring : undefined} ms={cutMs(cut)} animation={noAnimation ? 'smart' : (cut.animation ?? 'smart')} />
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
        className="h-7 w-full rounded-tile bg-control text-[11px] text-muted hover:bg-control-hover"
        title="Reset to the whole shot"
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
    <label className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-control bg-control px-2">
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

const EASINGS: { label: string; bezier: [number, number, number, number] }[] = [
  { label: 'Linear', bezier: [0, 0, 1, 1] },
  { label: 'Ease in', bezier: [0.42, 0, 1, 1] },
  { label: 'Ease out', bezier: [0, 0, 0.58, 1] },
  { label: 'Ease in and out', bezier: [0.42, 0, 0.58, 1] },
]
const sameBezier = (a: number[], b: number[]) => a.every((n, i) => Math.abs(n - b[i]) < 0.005)
const sameSpring = (a: Spring, b: Spring) => a.stiffness === b.stiffness && a.damping === b.damping && a.mass === b.mass

// A tiny plot of a cubic bezier, for the easing list.
function CurveGlyph({ bezier = [0.65, 0, 0.35, 1] }: { bezier?: number[] }) {
  const [x1, y1, x2, y2] = bezier
  const px = (x: number) => 1.5 + x * 9
  const py = (y: number) => 10.5 - y * 9
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" className="shrink-0 text-muted">
      <path d={`M${px(0)} ${py(0)} C ${px(x1)} ${py(y1)}, ${px(x2)} ${py(y2)}, ${px(1)} ${py(1)}`} fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  )
}

// A field that opens a floating list: a titled panel with a close button, anchored under the field.
// `children` get a `close` function and the shared row style.
function PickerField({ title, trigger, bare, noChevron, children }: { title: string; trigger: ReactNode; bare?: boolean; noChevron?: boolean; children: (close: () => void, row: string) => ReactNode }) {
  const [open, setOpen] = useState(false)
  const [at, setAt] = useState({ x: 0, y: 0 })
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open])

  const toggle = () => {
    const r = button.current?.getBoundingClientRect()
    if (r) setAt({ x: r.right - 224, y: r.bottom + 6 })
    setOpen((o) => !o)
  }

  return (
    <>
      <button ref={button} onClick={toggle} className={`flex h-7 w-full items-center gap-1.5 rounded-control px-2 font-medium ${noChevron ? "justify-center" : ""} ${bare ? 'text-muted hover:text-ink' : 'border border-line focus-visible:border-accent-line'}`}>
        {trigger}
        {!noChevron && <Icon.ChevronDown size={12} className="shrink-0 text-muted" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 max-h-[70vh] w-56 overflow-y-auto rounded-tile bg-raised p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)]" style={{ left: at.x, top: at.y }}>
            <div className="flex h-8 items-center px-2">
              <span className="font-display text-[13px] font-semibold">{title}</span>
              <button onClick={() => setOpen(false)} title="Close" className="ml-auto flex size-6 items-center justify-center rounded-control text-muted hover:text-ink">
                ✕
              </button>
            </div>
            {children(() => setOpen(false), 'flex h-8 w-full items-center gap-2.5 rounded-control px-2 text-left hover:bg-control-hover')}
          </div>
        </>
      )}
    </>
  )
}

// Transition (or animation) type: Smart animate, Dissolve or Instant.
function TransitionPicker({ value, onPick }: { value: CutAnimation; onPick: (v: CutAnimation) => void }) {
  return (
    <PickerField title="Transition" trigger={<span className="min-w-0 flex-1 truncate text-left">{ANIMATIONS[value]}</span>}>
      {(close, row) =>
        (Object.entries(ANIMATIONS) as [CutAnimation, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => {
              onPick(k)
              close()
            }}
            className={row}
          >
            <span className="flex-1">{label}</span>
            {value === k && <span className="text-accent-text">✓</span>}
          </button>
        ))
      }
    </PickerField>
  )
}

// Easing field: shows the current easing, and opens a floating list of the presets, saved easings,
// Custom bezier and Custom spring.
function EasingPicker({ cut, saved, onRemove, onChange }: { cut: Cut; saved: SavedEasing[]; onRemove: (id: string) => void; onChange: (patch: Partial<Cut>) => void }) {
  const bezier = cutEase(cut)
  const bounce: Bez = [0.34, 1.56, 0.64, 1]
  const savedMatch = saved.find((e) => (cut.custom === 'spring' ? e.spring && sameSpring(e.spring, cut.spring ?? DEFAULT_SPRING) : cut.custom === 'bezier' && e.bezier && sameBezier(e.bezier, bezier)))
  const presetMatch = !cut.custom && cut.bezier ? EASINGS.find((e) => sameBezier(e.bezier, cut.bezier!)) : undefined
  const name = savedMatch?.name ?? (cut.custom === 'spring' ? 'Custom spring' : cut.custom === 'bezier' ? 'Custom bezier' : (presetMatch?.label ?? (cut.bezier ? 'Custom bezier' : FEELS[cut.feel].label)))
  const chosen = (label: string) => name === label && !savedMatch
  return (
    <PickerField
      title="Easing"
      trigger={
        <>
          <CurveGlyph bezier={cut.custom === 'spring' ? bounce : bezier} />
          <span className="min-w-0 flex-1 truncate text-left">{name}</span>
        </>
      }
    >
      {(close, row) => (
        <>
          {EASINGS.map((e) => (
            <button
              key={e.label}
              onClick={() => {
                onChange({ bezier: e.bezier, custom: undefined, spring: undefined })
                close()
              }}
              className={row}
            >
              <CurveGlyph bezier={e.bezier} />
              <span className="flex-1">{e.label}</span>
              {presetMatch?.label === e.label && <span className="text-accent-text">✓</span>}
            </button>
          ))}
          {saved.map((e) => (
            <div key={e.id} className={`${row} group/saved cursor-pointer`} onClick={() => {
              onChange(e.spring ? { custom: 'spring', spring: e.spring } : { custom: 'bezier', bezier: e.bezier, spring: undefined })
              close()
            }}>
              <CurveGlyph bezier={e.bezier ?? bounce} />
              <span className="flex-1 truncate">{e.name}</span>
              {savedMatch?.id === e.id && <span className="text-accent-text">✓</span>}
              <button
                title="Delete saved easing"
                onClick={(ev) => {
                  ev.stopPropagation()
                  onRemove(e.id)
                }}
                className="hidden text-subtle group-hover/saved:block hover:text-ink"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              onChange({ custom: 'bezier', bezier, spring: undefined })
              close()
            }}
            className={row}
          >
            <CurveGlyph bezier={bezier} />
            <span className="flex-1">Custom bezier</span>
            {chosen('Custom bezier') && <span className="text-accent-text">✓</span>}
          </button>
          <button
            onClick={() => {
              onChange({ custom: 'spring', spring: cut.spring ?? DEFAULT_SPRING })
              close()
            }}
            className={row}
          >
            <CurveGlyph bezier={bounce} />
            <span className="flex-1">Custom spring</span>
            {chosen('Custom spring') && <span className="text-accent-text">✓</span>}
          </button>
        </>
      )}
    </PickerField>
  )
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-3 rule-b p-3">
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
    <label className="flex h-7 min-w-0 items-center gap-1.5 rounded-control bg-control px-2">
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

// The panel folded away: just an icon button floating in the top-right corner.
export function CollapsedAnimatePanel({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="relative w-0 shrink-0">
      <button
        onClick={onExpand}
        title="Show panel"
        className="absolute top-1.5 right-2 z-30 flex size-7 items-center justify-center rounded-control border border-line bg-raised text-muted shadow-sm hover:text-ink"
      >
        <Icon.PanelRight size={14} />
      </button>
    </div>
  )
}
