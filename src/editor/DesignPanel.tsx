import { useState, type ReactNode } from 'react'
import { FRAME_H, FRAME_W } from '../board'
import { useApp } from '../context'
import type { Frame, Layer } from '../types'
import { Icon } from './icons'

// The Design tab: Figma-style properties for the selected frame or layer. The
// sections depend on what's selected (text gets Typography, shapes get Stroke…).
export function DesignPanel() {
  const { state, dispatch } = useApp()
  const sel = state.selection
  if (!sel) return <Hint>Select a frame or a layer to edit its design.</Hint>
  if (sel.kind === 'cut') return <Hint>A connector is the motion between two frames. Edit it in Animate.</Hint>
  if (sel.kind === 'act' || sel.kind === 'time') return <Hint>Select a frame or a layer to edit its design.</Hint>

  const frame = state.board.frames[sel.frameId]
  if (!frame) return null
  if (sel.kind === 'layer') {
    const layer = frame.layers.find((l) => l.id === sel.layerId)
    if (layer) return <LayerDesign frame={frame} layer={layer} />
  }
  return (
    <FrameDesign
      frame={frame}
      onPick={(layerId) => dispatch({ type: 'select', target: { kind: 'layer', frameId: frame.id, layerId } })}
    />
  )
}

const KIND_NAME: Record<Layer['kind'], string> = { text: 'Text', image: 'Image', rect: 'Rectangle', video: 'Video' }
const KIND_GLYPH: Record<Layer['kind'], string> = { text: 'T', image: '▣', rect: '▢', video: '▶' }

function LayerDesign({ frame, layer: l }: { frame: Frame; layer: Layer }) {
  const { dispatch } = useApp()
  const set = (patch: Partial<Layer>) => dispatch({ type: 'layer', frameId: frame.id, layerId: l.id, patch })
  const [sizing, setSizing] = useState<'width' | 'height' | 'fixed'>('height')

  return (
    <>
      <Header title={KIND_NAME[l.kind]} />

      <Section title="Position">
        <div className="grid grid-cols-2 gap-1">
          <Seg>
            <SegBtn title="Align left" onClick={() => set({ x: 0 })} icon={<Icon.AlignLeft size={13} />} />
            <SegBtn title="Align center" onClick={() => set({ x: Math.round((FRAME_W - l.w) / 2) })} icon={<Icon.AlignCenterH size={13} />} />
            <SegBtn title="Align right" onClick={() => set({ x: FRAME_W - l.w })} icon={<Icon.AlignRight size={13} />} />
          </Seg>
          <Seg>
            <SegBtn title="Align top" onClick={() => set({ y: 0 })} icon={<Icon.AlignTop size={13} />} />
            <SegBtn title="Align middle" onClick={() => set({ y: Math.round((FRAME_H - l.h) / 2) })} icon={<Icon.AlignMiddleV size={13} />} />
            <SegBtn title="Align bottom" onClick={() => set({ y: FRAME_H - l.h })} icon={<Icon.AlignBottom size={13} />} />
          </Seg>
          <Num prefix="X" value={l.x} onChange={(x) => set({ x })} />
          <Num prefix="Y" value={l.y} onChange={(y) => set({ y })} />
          <Num prefix={<Icon.Angle size={12} />} value={l.rotation} suffix="°" onChange={(rotation) => set({ rotation })} />
          <Seg>
            <SegBtn title="Rotate 90°" onClick={() => set({ rotation: (l.rotation + 90) % 360 })} icon={<Icon.Rotate size={13} />} />
            <SegBtn title="Flip horizontal" onClick={() => set({ scaleX: -(l.scaleX ?? 1) })} icon={<Icon.FlipH size={13} />} />
            <SegBtn title="Flip vertical" onClick={() => set({ scaleY: -(l.scaleY ?? 1) })} icon={<Icon.FlipV size={13} />} />
          </Seg>
        </div>
      </Section>

      <Section title="Layout">
        {l.kind === 'text' && (
          <Seg className="mb-1">
            <SegBtn title="Auto width" active={sizing === 'width'} onClick={() => setSizing('width')} icon={<Icon.HugWidth size={13} />} />
            <SegBtn title="Auto height" active={sizing === 'height'} onClick={() => setSizing('height')} icon={<Icon.AlignCenterH size={13} />} />
            <SegBtn title="Fixed size" active={sizing === 'fixed'} onClick={() => setSizing('fixed')} icon={<Icon.FixedSize size={13} />} />
          </Seg>
        )}
        <div className="flex items-center gap-1">
          <div className="grid flex-1 grid-cols-2 gap-1">
            <Num prefix="W" value={l.w} onChange={(w) => set({ w })} />
            <Num prefix="H" value={l.h} onChange={(h) => set({ h })} muted={l.kind === 'text' && sizing !== 'fixed'} />
          </div>
          <IconBtn title="Resize to fit">
            <Icon.Expand size={13} />
          </IconBtn>
        </div>
      </Section>

      <Section title="Appearance" actions={[<Icon.Eye key="e" size={13} />, <Icon.Droplet key="d" size={13} />]}>
        <div className="grid grid-cols-2 gap-1 pr-8">
          <Num prefix={<Icon.Square size={12} />} value={Math.round(l.opacity * 100)} suffix="%" onChange={(v) => set({ opacity: Math.min(1, Math.max(0, v / 100)) })} />
          <Num prefix={<Icon.Corners size={12} />} value={l.radius ?? 0} onChange={(radius) => set({ radius })} muted={l.kind === 'text'} />
        </div>
      </Section>

      {l.kind === 'text' && (
        <Section title="Typography" actions={[<Icon.Styles key="s" size={13} />]}>
          <input value={l.text ?? ''} onChange={(e) => set({ text: e.target.value })} className="mb-1 h-7 w-full rounded-md bg-control px-2 outline-none" />
          <Dropdown value={l.fontFamily ?? 'Inter'} options={['Inter', 'Helvetica', 'Georgia', 'Menlo']} onChange={(fontFamily) => set({ fontFamily })} full />
          <div className="mt-1 grid grid-cols-2 gap-1">
            <Dropdown
              value={String(l.fontWeight ?? 700)}
              options={[['400', 'Regular'], ['500', 'Medium'], ['600', 'Semi Bold'], ['700', 'Bold']]}
              onChange={(v) => set({ fontWeight: +v })}
            />
            <Num value={l.fontSize ?? 32} onChange={(fontSize) => set({ fontSize })} />
            <Num prefix={<span className="text-[10px]">A͟</span>} value="Auto" />
            <Num prefix={<span className="text-[10px]">|A|</span>} value={l.letterSpacing ?? -2} suffix="%" onChange={(letterSpacing) => set({ letterSpacing })} />
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1 pr-8">
            <Seg>
              <SegBtn title="Align text left" active={l.align === 'left'} onClick={() => set({ align: 'left' })} icon={<Icon.TextLeft size={13} />} />
              <SegBtn title="Align text center" active={!l.align || l.align === 'center'} onClick={() => set({ align: 'center' })} icon={<Icon.TextCenter size={13} />} />
              <SegBtn title="Align text right" active={l.align === 'right'} onClick={() => set({ align: 'right' })} icon={<Icon.TextRight size={13} />} />
            </Seg>
            <Seg>
              <SegBtn title="Top" icon={<Icon.AlignTop size={13} />} />
              <SegBtn title="Middle" active icon={<Icon.AlignMiddleV size={13} />} />
              <SegBtn title="Bottom" icon={<Icon.AlignBottom size={13} />} />
            </Seg>
          </div>
        </Section>
      )}

      <Section title="Fill" actions={[<Icon.Styles key="s" size={13} />, <Icon.Plus key="p" size={13} />]}>
        {l.kind === 'text' ? (
          <ColorRow value={l.color ?? '#000000'} onChange={(color) => set({ color })} />
        ) : l.kind === 'rect' ? (
          l.fill ? <ColorRow value={l.fill} onChange={(fill) => set({ fill })} /> : <p className="text-[11px] text-muted">No fill</p>
        ) : (
          <MediaRow label={l.kind === 'video' ? 'Video' : 'Image'} src={l.src} />
        )}
      </Section>

      <Section
        title="Stroke"
        muted={!(l.kind === 'rect' && l.stroke)}
        actions={[
          <button
            key="p"
            title="Add stroke"
            onClick={() => l.kind === 'rect' && !l.stroke && set({ stroke: '#1E1E1E' })}
            className={l.kind === 'rect' ? '' : 'cursor-default'}
          >
            <Icon.Plus size={13} />
          </button>,
        ]}
      >
        {l.kind === 'rect' && l.stroke && <ColorRow value={l.stroke} onChange={(stroke) => set({ stroke })} onRemove={() => set({ stroke: undefined })} />}
      </Section>
      <Section title="Effects" muted actions={[<Icon.Plus key="p" size={13} />]} />
      <Section title="Export" muted actions={[<Icon.Plus key="p" size={13} />]} />
    </>
  )
}

function FrameDesign({ frame, onPick }: { frame: Frame; onPick: (layerId: string) => void }) {
  const { dispatch } = useApp()
  return (
    <>
      <Header title="Frame" />
      <Section title="Layout">
        <div className="grid grid-cols-2 gap-1 pr-8">
          <Num prefix="W" value={FRAME_W} muted />
          <Num prefix="H" value={FRAME_H} muted />
        </div>
      </Section>
      <Section title="Fill" actions={[<Icon.Styles key="s" size={13} />, <Icon.Plus key="p" size={13} />]}>
        <ColorRow value={frame.background} onChange={(background) => dispatch({ type: 'frame', frameId: frame.id, patch: { background } })} />
      </Section>
      <Section title="Layers">
        <div className="-mx-1">
          {[...frame.layers].reverse().map((l) => (
            <button key={l.id} onClick={() => onPick(l.id)} className="flex h-7 w-full items-center gap-2 rounded-md px-1 text-left hover:bg-control-hover">
              <span className="w-3 text-center text-[11px] text-muted">{KIND_GLYPH[l.kind]}</span>
              <span className="truncate">{l.name}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Export" muted actions={[<Icon.Plus key="p" size={13} />]} />
    </>
  )
}

// ---------- building blocks ----------

function Hint({ children }: { children: ReactNode }) {
  return <p className="p-3 text-[11px] leading-relaxed text-muted">{children}</p>
}

function Header({ title }: { title: string }) {
  return (
    <div className="flex h-11 items-center gap-3 border-b border-line px-3">
      <span className="flex-1 font-display text-[13px] font-semibold">{title}</span>
      <Icon.Link size={13} />
      <Icon.Target size={13} />
      <Icon.Component size={13} />
      <Icon.More size={13} />
    </div>
  )
}

function Section({ title, actions = [], muted = false, children }: { title: string; actions?: ReactNode[]; muted?: boolean; children?: ReactNode }) {
  return (
    <div className="border-b border-line p-3">
      <div className="flex h-5 items-center">
        <span className={`font-display font-semibold ${muted ? 'text-muted' : ''}`}>{title}</span>
        <div className={`ml-auto flex items-center gap-3 ${muted ? 'text-muted' : ''}`}>{actions}</div>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}

function Seg({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex h-7 rounded-md bg-control p-0.5 ${className}`}>{children}</div>
}

function SegBtn({ icon, title, active = false, onClick }: { icon: ReactNode; title: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center rounded-[5px] ${active ? 'bg-raised text-ink shadow-[0_0_0_1px_var(--line)]' : 'text-muted hover:text-ink'}`}
    >
      {icon}
    </button>
  )
}

function IconBtn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <span title={title} className="flex size-7 shrink-0 items-center justify-center text-muted">
      {children}
    </span>
  )
}

function Num({
  prefix,
  value,
  onChange,
  suffix,
  muted = false,
}: {
  prefix?: ReactNode
  value: number | string
  onChange?: (v: number) => void
  suffix?: string
  muted?: boolean
}) {
  return (
    <label className={`flex h-7 min-w-0 items-center gap-1.5 rounded-md bg-control px-2 ${muted ? 'text-subtle' : ''}`}>
      {prefix !== undefined && <span className="flex w-3 shrink-0 justify-center text-[11px] text-muted">{prefix}</span>}
      <input
        type={typeof value === 'number' ? 'number' : 'text'}
        value={typeof value === 'number' ? (Number.isInteger(value) ? value : +value.toFixed(1)) : value}
        readOnly={!onChange}
        onChange={(e) => onChange && e.target.value !== '' && onChange(+e.target.value)}
        className="w-full min-w-0 bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && <span className="text-muted">{suffix}</span>}
    </label>
  )
}

function Dropdown({ value, options, onChange, full = false }: { value: string; options: (string | [string, string])[]; onChange: (v: string) => void; full?: boolean }) {
  return (
    <label className={`relative flex h-7 items-center rounded-md border border-line px-2 focus-within:border-accent-line ${full ? 'w-full' : ''}`}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 appearance-none bg-transparent outline-none">
        {options.map((o) => {
          const [k, label] = typeof o === 'string' ? [o, o] : o
          return (
            <option key={k} value={k}>
              {label}
            </option>
          )
        })}
      </select>
      <Icon.ChevronDown size={12} className="pointer-events-none shrink-0 text-muted" />
    </label>
  )
}

function ColorRow({ value, onChange, onRemove }: { value: string; onChange: (c: string) => void; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <label className="flex h-7 flex-1 items-center gap-2 rounded-md bg-control px-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-4 cursor-pointer rounded border-0 bg-transparent p-0" />
        <span className="flex-1">{value.replace('#', '').toUpperCase()}</span>
        <span className="border-l border-line pl-2 text-ink">
          100 <span className="text-muted">%</span>
        </span>
      </label>
      <IconBtn title="Visible">
        <Icon.Eye size={13} />
      </IconBtn>
      <button title="Remove" onClick={onRemove} className="flex size-7 shrink-0 items-center justify-center text-muted">
        <Icon.Minus size={13} />
      </button>
    </div>
  )
}

function MediaRow({ label, src }: { label: string; src?: string }) {
  return (
    <div className="flex h-7 items-center gap-2 rounded-md bg-control px-2">
      <span className="size-4 shrink-0 rounded-sm bg-line-strong" />
      <span className="flex-1 truncate">{label}</span>
      <span className="truncate text-[11px] text-muted">{src?.split('/').pop()}</span>
    </div>
  )
}
