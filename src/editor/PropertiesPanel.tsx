import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ANIMATIONS, DEFAULT_CAMERA, FEELS, cutEase, cutKey, cutMs, getCut, order, targetLabel } from '../board'
import { useApp } from '../context'
import type { Cut, CutAnimation, EnterPreset, Feel, Storyboard } from '../types'
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
      <div className="flex h-10 shrink-0 items-center rule-b px-2">
        {(['design', 'animate'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-7 rounded-tile px-3 capitalize ${tab === t ? 'bg-control font-medium' : 'text-muted hover:text-ink'}`}
          >
            {t}
          </button>
        ))}
        <ZoomMenu />
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
// layer's frame's) cut in, hold time and camera.
function AnimateSelection() {
  const { state, dispatch } = useApp()
  const { board, selection: sel } = state
  if (!sel) return null

  const title = <p className="px-3 pt-3 pb-2 font-display text-[13px] font-semibold">{targetLabel(sel, board)}</p>

  if (sel.kind === 'cut') {
    const [from, to] = sel.key.split('->')
    return (
      <>
        {title}
        <MotionSection cutId={sel.key} cut={getCut(board, from, to)} between={crossesChapters(board, from, to)} />
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
      {prev && <MotionSection cutId={cutKey(prev, frame.id)} cut={getCut(board, prev, frame.id)} label="Cut in" between={crossesChapters(board, prev, frame.id)} />}
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
      {sel.kind === 'layer' && <EntranceSection frameId={frame.id} layerId={sel.layerId} />}
    </>
  )
}

// Animation type, easing (preset or custom bezier), duration, curve and preview.
// A cut between the last frame of one chapter and the first of the next is a transition between chapters.
const crossesChapters = (b: Storyboard, from: string, to: string) =>
  b.chapters.find((a) => a.frameIds.includes(from))?.id !== b.chapters.find((a) => a.frameIds.includes(to))?.id

function MotionSection({ cutId, cut, label, between }: { cutId: string; cut: Cut; label?: string; between?: boolean }) {
  const { dispatch } = useApp()
  const set = (patch: Partial<Cut>) => dispatch({ type: 'cut', key: cutId, patch })
  const bezier = cutEase(cut)
  const easing = cut.bezier ? 'custom' : cut.feel

  return (
    <div className="space-y-3 rule-b p-3">
      {label && <p className="text-[11px] text-muted">{label}</p>}
      <Labeled label={between ? 'Transition' : 'Animation'}>
        <TransitionPicker value={cut.animation ?? 'smart'} onPick={(v) => set({ animation: v })} />
      </Labeled>
      <Labeled label="Easing">
        <EasingPicker bezier={bezier} custom={!!cut.bezier} feel={cut.feel} onPick={(b) => set({ bezier: b })} />
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
          className="flex size-7 shrink-0 items-center justify-center rounded-control hover:bg-control-hover"
        >
          <Icon.Copy size={12} />
        </button>
      </div>
      <EasePreview bezier={bezier} ms={cutMs(cut)} animation={cut.animation ?? 'smart'} />
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
  { label: 'Ease in back', bezier: [0.36, 0, 0.66, -0.56] },
  { label: 'Ease out back', bezier: [0.34, 1.56, 0.64, 1] },
  { label: 'Ease in and out back', bezier: [0.68, -0.6, 0.32, 1.6] },
]
const sameBezier = (a: number[], b: number[]) => a.every((n, i) => Math.abs(n - b[i]) < 0.005)

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

const PRESETS: [EnterPreset, string][] = [
  ['fade', 'Fade in'],
  ['slide-up', 'Slide up'],
  ['slide-down', 'Slide down'],
  ['slide-left', 'Slide from left'],
  ['slide-right', 'Slide from right'],
  ['grow', 'Grow in'],
  ['shrink', 'Shrink in'],
  ['spin', 'Spin in'],
  ['twist', 'Twist in'],
  ['blur', 'Blur in'],
  ['blur-scale', 'Blur and scale'],
  ['blur-slide', 'Blur and slide'],
]

// How the selected layer arrives when it is new in its frame; the presets follow Jitter's.
function PresetPicker({ value, onPick }: { value?: EnterPreset; onPick: (v: EnterPreset) => void }) {
  return (
    <PickerField title="Entrance" trigger={<span className="min-w-0 flex-1 truncate text-left">{PRESETS.find(([k]) => k === value)?.[1]}</span>}>
      {(close, row) =>
        PRESETS.map(([k, label]) => (
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

// An optional override on the selected layer: the cut in sets timing and easing for the whole frame, and
// this only changes the style this one layer arrives in. Empty by default; + adds one, − clears it.
function EntranceSection({ frameId, layerId }: { frameId: string; layerId: string }) {
  const { state, dispatch } = useApp()
  const layer = state.board.frames[frameId]?.layers.find((l) => l.id === layerId)
  if (!layer) return null
  const set = (enter: EnterPreset | undefined) => dispatch({ type: 'layer', frameId, layerId, patch: { enter } })
  return (
    <Section
      title="Entrance"
      action={
        layer.enter ? undefined : (
          <div className="w-7">
            <PickerField title="Entrance" bare noChevron trigger={<Icon.Plus size={13} />}>
              {(close, row) =>
                PRESETS.map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => {
                      set(k)
                      close()
                    }}
                    className={row}
                  >
                    {label}
                  </button>
                ))
              }
            </PickerField>
          </div>
        )
      }
    >
      {layer.enter ? (
        <div className="flex items-center gap-1">
          <Labeled label="Preset">
            <PresetPicker value={layer.enter} onPick={set} />
          </Labeled>
          <button title="Remove" onClick={() => set(undefined)} className="flex size-7 shrink-0 items-center justify-center text-muted hover:text-ink">
            <Icon.Minus size={13} />
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-muted">None. The layer arrives with the cut in.</p>
      )}
    </Section>
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

// Easing field: shows the current curve, and opens a floating list of the presets, plus Custom bezier.
function EasingPicker({ bezier, custom, feel, onPick }: { bezier: [number, number, number, number]; custom: boolean; feel: Feel; onPick: (b: [number, number, number, number]) => void }) {
  const match = custom ? EASINGS.find((e) => sameBezier(e.bezier, bezier)) : undefined
  const name = match?.label ?? (custom ? 'Custom bezier' : FEELS[feel].label)
  return (
    <PickerField
      title="Easing"
      trigger={
        <>
          <CurveGlyph bezier={bezier} />
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
                onPick(e.bezier)
                close()
              }}
              className={row}
            >
              <CurveGlyph bezier={e.bezier} />
              <span className="flex-1">{e.label}</span>
              {match?.label === e.label && <span className="text-accent-text">✓</span>}
            </button>
          ))}
          <button
            onClick={() => {
              onPick(bezier)
              close()
            }}
            className={row}
          >
            <CurveGlyph bezier={bezier} />
            <span className="flex-1">Custom bezier</span>
            {!match && custom && <span className="text-accent-text">✓</span>}
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
