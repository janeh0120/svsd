import { useEffect, useRef, useState } from 'react'
import { targetFrame, targetLabel } from '../board'
import { FrameThumb } from '../components/FrameThumb'
import { domId, useApp } from '../context'
import type { Message } from '../types'
import { Icon } from './icons'
import { QuestionCard } from './QuestionCard'
import { StartForm } from './StartForm'

export function LeftPanel({ width }: { width: number }) {
  return (
    <aside className="flex shrink-0 flex-col bg-surface" style={{ width }}>
      {/* App bar: the Sequence logo and the file name */}
      <div className="flex h-10 shrink-0 items-center">
        <div className="flex h-full w-10 shrink-0 items-center justify-center">
          <img src="/sequence-logo.svg" alt="Sequence" title="Sequence" draggable={false} className="h-5 w-auto select-none" />
        </div>
        <button className="flex min-w-0 items-center gap-1.5 px-3 font-display text-[13px] font-semibold">
          <span className="truncate">Design File</span>
          <Icon.ChevronDown size={12} className="shrink-0 text-muted" />
        </button>
      </div>
      <div className="flex h-10 shrink-0 items-center border-t border-line px-3">
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

  // A blank project starts from a brief form instead of the chat.
  if (state.phase === 'empty') return <StartForm />

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {state.messages.map((m) => (
          <ChatItem key={m.id} m={m} />
        ))}
        {state.working && <p className="animate-pulse text-[11px] text-muted">Working…</p>}
        <div ref={end} />
      </div>

      <div className="px-2 pb-2">
        <div className="flex min-h-20 flex-col rounded-lg border border-line p-2 focus-within:border-line-strong">
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
              if (v.endsWith('@') && state.board.acts.length && state.mode !== 'comment') dispatch({ type: 'mode', mode: 'comment' })
              setText(v)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            disabled={busy}
            placeholder={pending.length ? 'Add a note, or send the annotations as they are' : 'Plan, Build, / for skills, @ for context'}
            className="min-h-0 w-full flex-1 resize-none outline-none placeholder:text-subtle"
          />
          <div className="flex items-center gap-1.5">
            <button className="flex size-5 items-center justify-center rounded-full border border-line text-muted">
              <Icon.Plus size={12} />
            </button>
            <button
              title="Aspect ratio"
              className="flex h-5 items-center gap-1 rounded-md px-1 text-[11px] text-muted hover:bg-control-hover"
            >
              <span className="block h-[9px] w-4 rounded-[2px] border border-current" />
              16:9
            </button>
            <button title="Video length" className="flex h-5 items-center gap-1 rounded-md px-1 text-[11px] text-muted hover:bg-control-hover">
              <Icon.Clock size={12} />
              30s
            </button>
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

// One attached annotation: a cropped snapshot of what it points at, plus its label.
function AttachmentChip({ pinId }: { pinId: string }) {
  const { state, dispatch } = useApp()
  const pin = state.pins.find((p) => p.id === pinId)
  if (!pin) return null
  const frameId = targetFrame(pin.target, state.board)
  const frame = frameId ? state.board.frames[frameId] : undefined
  return (
    <span className="flex h-6 max-w-full items-center gap-1.5 rounded-md border border-line bg-control pr-1 pl-0.5" title={pin.text}>
      <button
        className="flex min-w-0 items-center gap-1.5"
        onClick={() => {
          dispatch({ type: 'compose', id: pin.id })
          document.getElementById(domId(pin.target))?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
        }}
      >
        <span className="relative h-[18px] w-7 shrink-0 overflow-hidden rounded-[3px] bg-line">
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
      <div className="flex items-start gap-2 px-2">
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
      <div className="grid grid-cols-3 gap-1 px-2">
        {m.shots?.map((src) => (
          <img key={src} src={src} className="aspect-[1.6] w-full rounded border border-line bg-control object-contain" />
        ))}
      </div>
    )
  }

  if (m.kind === 'question') return <QuestionCard m={m} />

  return (
    <div className={`flex ${m.author === 'you' ? 'justify-end' : ''}`}>
      <p className={`max-w-[90%] rounded-lg px-2 py-1.5 whitespace-pre-line ${m.author === 'you' ? 'bg-control' : ''}`}>{m.text}</p>
    </div>
  )
}
