import type { ReactNode } from 'react'
import { FEELS, getCut, order } from '../board'
import { useApp } from '../context'
import type { Feel, Layer } from '../types'
import { Icon } from './icons'

export function PropertiesPanel({ width }: { width: number }) {
  const { state, dispatch } = useApp()
  const { board, selection: sel } = state

  let title = 'Design'
  let body: ReactNode = null

  if (sel?.kind === 'layer') {
    const l = board.frames[sel.frameId]?.layers.find((x) => x.id === sel.layerId)
    if (l) {
      const set = (patch: Partial<Layer>) => dispatch({ type: 'layer', frameId: sel.frameId, layerId: l.id, patch })
      title = { text: 'Text', image: 'Image', rect: 'Rectangle' }[l.kind]
      body = (
        <>
          <Section title="Animations" actions={[<Icon.Grid key="g" />, <Icon.Plus key="p" />]} />
          <Section title="Transform" actions={[<Icon.Crosshair key="c" />]}>
            <Row>
              <Field prefix="X" value={l.x} onChange={(x) => set({ x })} />
              <Field prefix="Y" value={l.y} onChange={(y) => set({ y })} />
            </Row>
            <Row link>
              <Field prefix={<Icon.ArrowsH size={12} />} value={Math.round((l.scaleX ?? 1) * 100)} suffix="%" onChange={(v) => set({ scaleX: v / 100 })} />
              <Field prefix={<Icon.ArrowsV size={12} />} value={Math.round((l.scaleY ?? 1) * 100)} suffix="%" onChange={(v) => set({ scaleY: v / 100 })} />
            </Row>
            <Row>
              <Field prefix={<Icon.Angle size={12} />} value={l.rotation} suffix="°" onChange={(rotation) => set({ rotation })} />
            </Row>
          </Section>
          <Section title="Layout">
            <Row link>
              <Field prefix="W" value={l.w} onChange={(w) => set({ w })} />
              <Field prefix="H" value={l.h} onChange={(h) => set({ h })} />
            </Row>
          </Section>
          <Section title="Appearance" actions={[<Icon.Eye key="e" />, <Icon.Droplet key="d" />]}>
            <Row trailing={<Icon.Expand size={12} />}>
              <Field prefix={<Icon.Square size={12} />} value={Math.round(l.opacity * 100)} suffix="%" onChange={(v) => set({ opacity: Math.min(1, Math.max(0, v / 100)) })} />
              <Field prefix={<Icon.Corners size={12} />} value={l.radius ?? 0} onChange={(radius) => set({ radius })} />
            </Row>
          </Section>
          {l.kind === 'text' && (
            <Section title="Text">
              <input
                value={l.text ?? ''}
                onChange={(e) => set({ text: e.target.value })}
                className="h-7 w-full rounded-md bg-[#F5F5F5] px-2 outline-none"
              />
            </Section>
          )}
          <Section title="Fill" actions={[<Icon.Sliders key="s" />, <Icon.Plus key="p" />]}>
            {(l.kind === 'text' || l.fill) && (
              <ColorRow value={l.kind === 'text' ? (l.color ?? '#000000') : l.fill!} onChange={(c) => set(l.kind === 'text' ? { color: c } : { fill: c })} />
            )}
          </Section>
        </>
      )
    }
  }

  if (sel?.kind === 'frame' && board.frames[sel.frameId]) {
    const fr = board.frames[sel.frameId]
    const ids = order(board)
    const prev = ids[ids.indexOf(fr.id) - 1]
    title = 'Frame'
    body = (
      <>
        <Section title="Animations" actions={[<Icon.Grid key="g" />, <Icon.Plus key="p" />]}>
          {prev && <FeelPicker value={getCut(board, prev, fr.id).feel} onChange={(feel) => dispatch({ type: 'cut', key: `${prev}->${fr.id}`, patch: { feel } })} />}
        </Section>
        <Section title="Layout">
          <Row>
            <Field prefix="⏱" value={fr.hold} step={0.2} suffix="s" onChange={(hold) => dispatch({ type: 'frame', frameId: fr.id, patch: { hold: Math.max(0.2, hold) } })} />
          </Row>
        </Section>
        <Section title="Fill" actions={[<Icon.Sliders key="s" />, <Icon.Plus key="p" />]}>
          <ColorRow value={fr.background} onChange={(background) => dispatch({ type: 'frame', frameId: fr.id, patch: { background } })} />
        </Section>
      </>
    )
  }

  if (sel?.kind === 'cut') {
    const [from, to] = sel.key.split('->')
    const cut = getCut(board, from, to)
    title = 'Transition'
    body = (
      <Section title="Animations" actions={[<Icon.Grid key="g" />, <Icon.Plus key="p" />]}>
        <FeelPicker value={cut.feel} onChange={(feel) => dispatch({ type: 'cut', key: sel.key, patch: { feel } })} />
      </Section>
    )
  }

  if (sel?.kind === 'act') {
    title = board.acts.find((a) => a.id === sel.actId)?.name ?? 'Act'
  }

  return (
    <aside className="flex shrink-0 flex-col bg-white" style={{ width }}>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#E6E6E6] px-3">
        <span className="flex size-6 items-center justify-center rounded-full bg-[#F24822] text-[11px] font-semibold text-white">J</span>
        <Icon.ChevronDown size={12} className="text-[#8C8C8C]" />
        <button onClick={() => dispatch({ type: 'preview', open: true })} className="ml-auto flex items-center gap-1" title="Present">
          <Icon.Play size={14} />
          <Icon.ChevronDown size={12} className="text-[#8C8C8C]" />
        </button>
        <button className="h-7 rounded-md bg-[#0D99FF] px-3 font-medium text-white">Share</button>
      </div>
      <div className="flex h-10 shrink-0 items-center border-b border-[#E6E6E6] px-3">
        <span className="text-[13px] font-semibold">{title}</span>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-[#8C8C8C]">
          34% <Icon.ChevronDown size={12} />
        </span>
      </div>
      {sel?.kind === 'layer' && (
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#E6E6E6] px-3 text-[#1E1E1E]">
          <Icon.Move size={14} />
          <Icon.Combine size={14} />
          <span className="flex items-center gap-1">
            <Icon.Copy size={14} />
            <Icon.ChevronDown size={12} className="text-[#8C8C8C]" />
          </span>
          <Icon.Expand size={14} />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
    </aside>
  )
}

function Section({ title, actions = [], children }: { title: string; actions?: ReactNode[]; children?: ReactNode }) {
  return (
    <div className="border-b border-[#E6E6E6] p-3">
      <div className={`flex h-5 items-center ${children ? 'mb-2' : ''}`}>
        <span className="font-semibold">{title}</span>
        <div className="ml-auto flex items-center gap-3 text-[#1E1E1E] [&_svg]:size-[14px]">{actions}</div>
      </div>
      {children && <div className="space-y-2">{children}</div>}
    </div>
  )
}

// Two fields side by side; `link` adds the blue lock-ratio button, `trailing` any icon.
function Row({ children, link, trailing }: { children: ReactNode; link?: boolean; trailing?: ReactNode }) {
  return (
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
  )
}

function Field({ prefix, value, onChange, suffix, step = 1 }: { prefix: ReactNode; value: number; onChange: (v: number) => void; suffix?: string; step?: number }) {
  return (
    <label className="flex h-7 min-w-0 items-center gap-1 rounded-md bg-[#F5F5F5] px-2">
      <span className="flex w-3 shrink-0 justify-center text-[11px] text-[#8C8C8C]">{prefix}</span>
      <input
        type="number"
        step={step}
        value={Number.isInteger(value) ? value : +value.toFixed(1)}
        onChange={(e) => e.target.value !== '' && onChange(+e.target.value)}
        className="w-full min-w-0 bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && <span className="text-[#8C8C8C]">{suffix}</span>}
      <Icon.Diamond size={10} className="shrink-0 text-[#8C8C8C]" />
    </label>
  )
}

function ColorRow({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <label className="flex h-7 items-center gap-2 rounded-md bg-[#F5F5F5] px-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-4 cursor-pointer rounded border-0 bg-transparent p-0" />
      {value.replace('#', '').toUpperCase()}
      <span className="ml-auto text-[#8C8C8C]">100%</span>
    </label>
  )
}

function FeelPicker({ value, onChange }: { value: Feel; onChange: (f: Feel) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1">
      {(Object.keys(FEELS) as Feel[]).map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`h-7 rounded-md ${f === value ? 'bg-[#0D99FF] text-white' : 'bg-[#F5F5F5] hover:bg-[#EBEBEB]'}`}
        >
          {FEELS[f].label}
        </button>
      ))}
    </div>
  )
}
