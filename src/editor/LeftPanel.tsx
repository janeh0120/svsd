import { useEffect, useRef, useState } from 'react'
import { targetFrame, targetLabel } from '../board'
import { FrameThumb } from '../components/FrameThumb'
import { domId, useApp } from '../context'
import type { Message } from '../types'
import { Icon } from './icons'
import { QuestionCard } from './QuestionCard'

export function LeftPanel({ width }: { width: number }) {
  const { state } = useApp()
  return (
    <aside className="flex shrink-0 flex-col bg-surface pr-2" style={{ width: width + 8 }}>
      {/* App bar: the Sequence logo and the file name */}
      <div className="flex h-10 shrink-0 items-center">
        <div className="flex h-full w-10 shrink-0 items-center justify-center">
          <img src="/sequence-logo.svg" alt="Sequence" title="Sequence" draggable={false} className="h-5 w-auto select-none" />
        </div>
        <button className="flex min-w-0 items-center gap-1.5 px-3 font-display text-[13px] font-semibold">
          <span className="truncate" title={state.name}>
            {state.name}
          </span>
          <Icon.ChevronDown size={12} className="shrink-0 text-muted" />
        </button>
      </div>
      <div className="flex h-10 shrink-0 items-center rule-t px-3">
        <span className="font-display text-[13px] font-semibold">Agent</span>
      </div>
      <AgentPanel />
    </aside>
  )
}

function AgentPanel() {
  const { state, dispatch, send, chat } = useApp()
  const [text, setText] = useState('')
  const pending = state.pins.filter((p) => p.status === 'pending' && !p.inFlight)
  const end = useRef<HTMLDivElement>(null)
  const busy = state.phase === 'drafting' || state.phase === 'animating'
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [state.messages.length, state.working])

  // Attached annotations go with whatever is typed; otherwise it's a plain message.
  const submit = () => {
    if (pending.length) send(text.trim() || undefined)
    else if (text.trim()) chat(text.trim())
    else return
    setText('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {state.messages.map((m) => (
          <ChatItem key={m.id} m={m} />
        ))}
        {state.working && <p className="animate-pulse text-[11px] text-muted">Working…</p>}
        <div ref={end} />
      </div>

      <div className="relative px-3 pb-3">
        {/* While the agent works, a glow rises and falls behind the chat box. */}
        <div
          aria-hidden
          className={`agent-glow pointer-events-none absolute bottom-0 left-0 -right-2 transition-opacity duration-700 ${
            busy || state.working ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div className="relative flex min-h-20 flex-col rounded-tile border border-line bg-surface p-2.5 focus-within:border-line-strong">
          {pending.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {pending.map((p) => (
                <AttachmentChip key={p.id} pinId={p.id} />
              ))}
            </div>
          )}
          <textarea
            rows={2}
            value={text}
            onChange={(e) => {
              const v = e.target.value
              // "@ for context": typing @ lets you point at something on the canvas.
              if (v.endsWith('@') && state.board.chapters.length && state.mode !== 'comment') dispatch({ type: 'mode', mode: 'comment' })
              setText(v)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            disabled={busy}
            placeholder={pending.length ? 'Add a note, or send the annotations as they are' : 'Describe what you want to change...'}
            className="min-h-0 w-full flex-1 resize-none outline-none placeholder:text-subtle"
          />
          <div className="flex items-center gap-1.5">
            <button className="flex size-5 items-center justify-center rounded-control border border-line text-muted">
              <Icon.Plus size={12} />
            </button>
            <AnnotateButton />
            <button
              onClick={submit}
              disabled={busy || state.working}
              className="ml-auto flex size-5 items-center justify-center rounded-full bg-accent text-on-accent disabled:opacity-40"
              title="Send"
            >
              <Icon.Send size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Toggles annotate mode, with a tooltip explaining what the agent receives.
function AnnotateButton() {
  const { state, dispatch } = useApp()
  const [hover, setHover] = useState(false)
  const on = state.mode === 'comment'
  const disabled = !state.board.chapters.length
  return (
    <div className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        onClick={() => !disabled && dispatch({ type: 'mode', mode: on ? 'select' : 'comment' })}
        aria-label="Select an element or annotate"
        aria-pressed={on}
        className={`flex size-5 items-center justify-center rounded-control ${
          on ? 'bg-accent-soft text-accent-text' : disabled ? 'text-subtle' : 'text-muted hover:bg-control-hover'
        }`}
      >
        <Icon.Pointer size={13} />
      </button>
      {hover && (
        <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-60 rounded-tile bg-inverse p-2.5 text-on-inverse shadow-xl">
          <div className="flex items-center gap-2">
            <span className="font-medium">{on ? 'Stop annotating' : 'Select an element or annotate'}</span>
            <kbd className="ml-auto shrink-0 text-[11px] text-on-inverse/60">⇧⌘S</kbd>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-on-inverse/60">
            Point at a layer, frame, cut or chapter, or at a moment in the preview or timeline. The agent gets a snapshot of it, its properties and where it sits in
            the reel.
          </p>
        </div>
      )}
    </div>
  )
}

// One attached annotation: a cropped snapshot of what it points at, plus its label.
function AttachmentChip({ pinId }: { pinId: string }) {
  const { state, dispatch } = useApp()
  const pin = state.pins.find((p) => p.id === pinId)
  if (!pin) return null
  const frameId = targetFrame(pin.target, state.board)
  const frame = frameId ? state.board.frames[frameId] : undefined
  return (
    <span className="flex h-6 max-w-full items-center gap-1.5 rounded-control border border-line bg-control pr-1 pl-0.5" title={pin.text}>
      <button
        className="flex min-w-0 items-center gap-1.5"
        onClick={() => {
          dispatch({ type: 'compose', id: pin.id })
          document.getElementById(domId(pin.target))?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
        }}
      >
        <span className="relative h-[18px] w-7 shrink-0 overflow-hidden rounded-thumb bg-line">
          {frame && <FrameThumb frame={frame} width={28} height={18} />}
        </span>
        <span className="truncate text-[11px]">{targetLabel(pin.target, state.board)}</span>
      </button>
      <button onClick={() => dispatch({ type: 'pinRemove', id: pin.id })} className="shrink-0 text-[11px] text-subtle hover:text-ink" title="Remove">
        ✕
      </button>
    </span>
  )
}

function ChatItem({ m }: { m: Message }) {
  if (m.kind === 'step') {
    return (
      <div className="flex items-start gap-2">
        {m.status === 'running' ? (
          <span className="mt-0.5 size-3 shrink-0 animate-spin rounded-full border-[1.5px] border-line border-t-ink" />
        ) : (
          <span className="mt-0.5 flex size-3 shrink-0 items-center justify-center rounded-full bg-secondary-container text-[8px] text-on-secondary-container">✓</span>
        )}
        <div className="min-w-0">
          <p className={m.status === 'running' ? '' : 'text-muted'}>{m.text}</p>
          {m.detail && <p className="text-[11px] text-muted">{m.detail}</p>}
        </div>
      </div>
    )
  }

  if (m.kind === 'shots') {
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {m.shots?.map((src) => (
          <img key={src} src={src} className="aspect-[1.6] w-full rounded border border-line bg-control object-contain" />
        ))}
      </div>
    )
  }

  if (m.kind === 'question') return <QuestionCard m={m} />

  return (
    <div className={`flex ${m.author === 'you' ? 'justify-end' : ''}`}>
      <p className={`max-w-[90%] rounded-tile whitespace-pre-line ${m.author === 'you' ? 'bg-control px-3 py-2' : ''}`}>{m.text}</p>
    </div>
  )
}
