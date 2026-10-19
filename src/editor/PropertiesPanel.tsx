import { useState, type ReactNode } from 'react'
import { ANIMATIONS, DEFAULT_CAMERA, FEELS, cutEase, cutKey, cutMs, getCut, order, targetLabel } from '../board'
import { Player } from '../components/Player'
import { useApp } from '../context'
import type { Cut, CutAnimation, Feel, Layer } from '../types'
import { Icon } from './icons'
import { BezierEditor, CameraEditor, EasePreview } from './MotionControls'

// Right sidebar: the Animate panel, a live preview plus the selection's properties.
export function PropertiesPanel({ width }: { width: number }) {
  const { state } = useApp()

  return (
    <aside className="flex shrink-0 flex-col bg-white" style={{ width }}>
      <div className="flex h-10 shrink-0 items-center gap-1 px-3">
        <span className="flex size-6 items-center justify-center rounded-full bg-[#F24822] text-[11px] font-semibold text-white">J</span>
        <Icon.ChevronDown size={12} className="text-[#8C8C8C]" />
        <button className="ml-auto h-7 rounded-md border border-[#E6E6E6] px-2.5 font-medium">Share</button>
        <button className="h-7 rounded-md bg-[#1E1E1E] px-2.5 font-medium text-white" title="Coming soon">
          Export
        </button>
      </div>
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-[#E6E6E6] px-2">
        <span className="flex h-7 items-center rounded-md bg-[#F0F0F0] px-2 font-medium">Animate</span>
        <span className="ml-auto flex items-center gap-1 pr-1 font-medium">
          39% <Icon.ChevronDown size={12} />
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-[#E6E6E6] p-3">
          <p className="mb-2 text-[13px] font-semibold">Preview</p>
          <Player board={state.board} compact />
        </div>
        <Selection />
      </div>
    </aside>
  )
}

function Selection() {
  const { state, dispatch } = useApp()
  const { board, selection: sel } = state
  if (!sel) return null

  const title = <p className="px-3 pt-3 pb-1 text-[13px] font-semibold">{targetLabel(sel, board)}</p>
  const ids = order(board)

  if (sel.kind === 'cut') {
    const [from, to] = sel.key.split('->')
    return (
      <>
        {title}
        <MotionSection cutId={sel.key} cut={getCut(board, from, to)} />
        <CameraSection frameId={to} />
      </>
    )
  }

  if (sel.kind === 'frame' && board.frames[sel.frameId]) {
    const prev = ids[ids.indexOf(sel.frameId) - 1]
    return (
      <>
        {title}
        {prev && <MotionSection cutId={cutKey(prev, sel.frameId)} cut={getCut(board, prev, sel.frameId)} label="Cut in" />}
        <Section title="Timing">
          <Labeled label="Hold">
            <Field
              prefix={<Icon.Diamond size={10} />}
              value={board.frames[sel.frameId].hold * 1000}
              suffix="ms"
              step={100}
              onChange={(v) => dispatch({ type: 'frame', frameId: sel.frameId, patch: { hold: Math.max(0.2, v / 1000) } })}
            />
          </Labeled>
        </Section>
        <CameraSection frameId={sel.frameId} />
      </>
    )
  }

  if (sel.kind === 'layer') {
    const l = board.frames[sel.frameId]?.layers.find((x) => x.id === sel.layerId)
    if (!l) return null
    const set = (patch: Partial<Layer>) => dispatch({ type: 'layer', frameId: sel.frameId, layerId: l.id, patch })
    return (
      <>
        {title}
        <Section title="Transform" action={<Icon.Crosshair size={14} />}>
          <Group label="Position">
            <Row>
              <Field prefix="X" value={l.x} onChange={(x) => set({ x })} />
              <Field prefix="Y" value={l.y} onChange={(y) => set({ y })} />
            </Row>
          </Group>
          <Group label="Scale">
            <Row link>
              <Field prefix={<Icon.ArrowsH size={12} />} value={Math.round((l.scaleX ?? 1) * 100)} suffix="%" onChange={(v) => set({ scaleX: v / 100 })} />
              <Field prefix={<Icon.ArrowsV size={12} />} value={Math.round((l.scaleY ?? 1) * 100)} suffix="%" onChange={(v) => set({ scaleY: v / 100 })} />
            </Row>
          </Group>
          <Group label="Rotation">
            <Row>
              <Field prefix={<Icon.Angle size={12} />} value={l.rotation} suffix="°" onChange={(rotation) => set({ rotation })} />
            </Row>
          </Group>
        </Section>
        <Section title="Appearance" action={<Icon.Eye size={14} />}>
          <Row trailing={<Icon.Expand size={12} />} labels={['Opacity', 'Corner radius']}>
            <Field prefix={<Icon.Square size={12} />} value={Math.round(l.opacity * 100)} suffix="%" onChange={(v) => set({ opacity: Math.min(1, Math.max(0, v / 100)) })} />
            <Field prefix={<Icon.Expand size={12} />} value={l.radius ?? 0} onChange={(radius) => set({ radius })} />
          </Row>
          {l.kind === 'text' && (
            <Group label="Text">
              <input value={l.text ?? ''} onChange={(e) => set({ text: e.target.value })} className="h-7 w-full rounded-md bg-[#F5F5F5] px-2 outline-none" />
            </Group>
          )}
        </Section>
      </>
    )
  }

  return title
}

// Animation type, easing (preset or custom bezier), duration, curve and preview.
function MotionSection({ cutId, cut, label }: { cutId: string; cut: Cut; label?: string }) {
  const { dispatch } = useApp()
  const set = (patch: Partial<Cut>) => dispatch({ type: 'cut', key: cutId, patch })
  const bezier = cutEase(cut)
  const easing = cut.bezier ? 'custom' : cut.feel

  return (
    <div className="space-y-2 border-b border-[#E6E6E6] p-3 pt-2">
      {label && <p className="text-[11px] text-[#8C8C8C]">{label}</p>}
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
          className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-[#F5F5F5]"
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
      <p className="text-[11px] text-[#8C8C8C]">Pan & zoom</p>
      <CameraEditor frame={frame} camera={frame.camera ?? DEFAULT_CAMERA} onChange={(camera) => dispatch({ type: 'frame', frameId, patch: { camera } })} />
      <button
        onClick={() => dispatch({ type: 'frame', frameId, patch: { camera: DEFAULT_CAMERA } })}
        className="h-7 w-full rounded-md bg-[#F5F5F5] text-[11px] text-[#6B6B6B] hover:bg-[#EBEBEB]"
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
    <label className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md bg-[#F5F5F5] px-2">
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
    <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 text-[#8C8C8C]">
      <path d="M1 11 C 6 11, 6 1, 11 1" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2 border-b border-[#E6E6E6] p-3">
      <div className="flex h-5 items-center">
        <span className="font-semibold">{title}</span>
        <span className="ml-auto">{action}</span>
      </div>
      {children}
    </div>
  )
}

// A small grey label above its controls.
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] text-[#8C8C8C]">{label}</p>
      {children}
    </div>
  )
}

// Label on the left, control on the right.
function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[#8C8C8C]">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

// Two fields side by side; `link` adds the blue lock-ratio button, `trailing` any icon.
function Row({ children, link, trailing, labels }: { children: ReactNode; link?: boolean; trailing?: ReactNode; labels?: [string, string] }) {
  return (
    <div>
      {labels && (
        <div className="mb-1 grid grid-cols-2 gap-1 pr-8 text-[11px] text-[#8C8C8C]">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1">{children}</div>
        {link ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#E5F4FF] text-[#0D99FF]">
            <Icon.LinkOut size={12} />
          </span>
        ) : (
          <span className="flex size-7 shrink-0 items-center justify-center">{trailing}</span>
        )}
      </div>
    </div>
  )
}

function Field({ prefix, value, onChange, suffix, step = 1 }: { prefix: ReactNode; value: number; onChange: (v: number) => void; suffix?: string; step?: number }) {
  return (
    <label className="flex h-7 min-w-0 items-center gap-1.5 rounded-md bg-[#F5F5F5] px-2">
      <span className="flex w-3 shrink-0 justify-center text-[11px] text-[#8C8C8C]">{prefix}</span>
      <input
        type="number"
        step={step}
        value={Number.isInteger(value) ? value : +value.toFixed(2)}
        onChange={(e) => e.target.value !== '' && onChange(+e.target.value)}
        className="w-full min-w-0 bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && <span className="text-[#8C8C8C]">{suffix}</span>}
    </label>
  )
}

function Select({ value, onChange, options, icon }: { value: string; onChange: (v: string) => void; options: [string, string][]; icon?: ReactNode }) {
  return (
    <label className="relative flex h-7 items-center gap-1.5 rounded-md border border-[#E6E6E6] px-2 focus-within:border-[#0D99FF]">
      {icon}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 appearance-none bg-transparent font-medium outline-none">
        {options.map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      <Icon.ChevronDown size={12} className="pointer-events-none shrink-0 text-[#8C8C8C]" />
    </label>
  )
}
