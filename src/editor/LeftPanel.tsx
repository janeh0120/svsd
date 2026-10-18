import { useEffect, useRef, useState } from 'react'
import { order, sameTarget, targetLabel } from '../board'
import { domId, useApp } from '../context'
import type { Layer, Message, Target } from '../types'
import { Icon } from './icons'

export function LeftPanel({ width }: { width: number }) {
  const { state, dispatch } = useApp()
  const tab = (id: 'agent' | 'layers', label: string) => (
    <button
      onClick={() => dispatch({ type: 'tab', tab: id })}
      className={`h-7 rounded-md px-2 text-[12px] ${state.tab === id ? 'bg-[#F0F0F0] font-medium' : 'text-[#8C8C8C] hover:text-[#1E1E1E]'}`}
    >
      {label}
    </button>
  )
  return (
    <aside className="flex shrink-0 flex-col bg-white" style={{ width }}>
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-[#E6E6E6] px-2">
        {tab('agent', 'Agent')}
        {tab('layers', 'Layers')}
      </div>
      {state.tab === 'agent' ? <AgentPanel /> : <LayersPanel />}
    </aside>
  )
}

function AgentPanel() {
  const { state, dispatch, send, chat } = useApp()
  const [text, setText] = useState('')
  const pending = state.pins.filter((p) => p.status === 'pending')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [state.messages.length, state.working])

  const submit = () => {
    if (!text.trim()) return
    chat(text.trim())
    setText('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {state.messages.map((m) => (
          <ChatItem key={m.id} m={m} />
        ))}
        {state.working && <p className="animate-pulse text-[11px] text-[#8C8C8C]">Working…</p>}
        <div ref={end} />
      </div>

      {pending.length > 0 && (
        <div className="mx-2 mb-2 rounded-lg border border-[#E6E6E6] p-1">
          <ul className="max-h-40 overflow-y-auto">
            {pending.map((p) => (
              <li key={p.id} className="flex items-start gap-2 rounded-md px-2 py-1 hover:bg-[#F5F5F5]">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    dispatch({ type: 'compose', id: p.id })
                    document.getElementById(domId(p.target))?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
                  }}
                >
                  <span className="block text-[11px] text-[#8C8C8C]">{targetLabel(p.target, state.board)}</span>
                  <span className="line-clamp-2">{p.text}</span>
                </button>
                <button onClick={() => dispatch({ type: 'pinRemove', id: p.id })} className="text-[11px] text-[#B3B3B3] hover:text-[#1E1E1E]">
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button onClick={send} disabled={state.working} className="mt-1 h-7 w-full rounded-md bg-[#1E1E1E] font-medium text-white disabled:opacity-50">
            Send {pending.length} comment{pending.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      <div className="px-2 pb-2">
        <div className="flex h-20 flex-col rounded-lg border border-[#E6E6E6] p-2 focus-within:border-[#B3B3B3]">
          <textarea
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
            disabled={state.phase === 'drafting' || state.phase === 'animating'}
            placeholder={state.phase === 'empty' ? 'Paste your product URL and an outline of the reel' : 'Plan, Build, / for skills, @ for context'}
            className="min-h-0 w-full flex-1 resize-none outline-none placeholder:text-[#B3B3B3]"
          />
          <div className="flex items-center justify-between">
            <button className="flex size-5 items-center justify-center rounded-full border border-[#D9D9D9] text-[#8C8C8C]">
              <Icon.Plus size={12} />
            </button>
            <button onClick={submit} className="flex size-5 items-center justify-center rounded-full bg-[#1E1E1E] text-white">
              <Icon.Send size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatItem({ m }: { m: Message }) {
  const { answer } = useApp()

  if (m.kind === 'step') {
    return (
      <div className="flex items-start gap-2 px-2">
        {m.status === 'running' ? (
          <span className="mt-0.5 size-3 shrink-0 animate-spin rounded-full border-[1.5px] border-[#D9D9D9] border-t-[#1E1E1E]" />
        ) : (
          <span className="mt-0.5 flex size-3 shrink-0 items-center justify-center rounded-full bg-[#1E1E1E] text-[8px] text-white">✓</span>
        )}
        <div className="min-w-0">
          <p className={m.status === 'running' ? '' : 'text-[#8C8C8C]'}>{m.text}</p>
          {m.detail && <p className="text-[11px] text-[#8C8C8C]">{m.detail}</p>}
        </div>
      </div>
    )
  }

  if (m.kind === 'shots') {
    return (
      <div className="grid grid-cols-3 gap-1 px-2">
        {m.shots?.map((src) => (
          <img key={src} src={src} className="aspect-[1.6] w-full rounded border border-[#E6E6E6] bg-[#F5F5F5] object-contain" />
        ))}
      </div>
    )
  }

  if (m.kind === 'approval') {
    return (
      <div className="rounded-lg border border-[#E6E6E6] p-2">
        <p className="font-medium">{m.text}</p>
        <p className="mt-0.5 text-[11px] text-[#8C8C8C]">Once you approve, I'll record the screen flows and animate the frames together.</p>
        {m.answer ? (
          <p className="mt-2 text-[11px] text-[#8C8C8C]">{m.answer === 'approved' ? '✓ Approved, continuing' : 'Changes requested'}</p>
        ) : (
          <div className="mt-2 space-y-1">
            <button onClick={() => answer(m.id, 'approved')} className="flex h-7 w-full items-center gap-2 rounded-md bg-[#1E1E1E] px-2 text-left font-medium text-white">
              <span className="text-[11px] text-white/60">1</span>
              Yes, continue
            </button>
            <button onClick={() => answer(m.id, 'changes')} className="flex h-7 w-full items-center gap-2 rounded-md border border-[#E6E6E6] px-2 text-left hover:bg-[#F5F5F5]">
              <span className="text-[11px] text-[#8C8C8C]">2</span>
              No, request changes
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`flex ${m.author === 'you' ? 'justify-end' : ''}`}>
      <p className={`max-w-[90%] rounded-lg px-2 py-1.5 whitespace-pre-line ${m.author === 'you' ? 'bg-[#F0F0F0]' : ''}`}>{m.text}</p>
    </div>
  )
}

const KIND_ICON: Record<Layer['kind'], string> = { text: 'T', image: '▣', rect: '▢' }

function LayersPanel() {
  const { state, dispatch, startComment } = useApp()
  const { board } = state
  const all = order(board)
  const comment = state.mode === 'comment'

  const pick = (target: Target) => {
    if (comment) return startComment(target)
    dispatch({ type: 'select', target })
    document.getElementById(domId(target))?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }

  const row = (target: Target, depth: number, label: React.ReactNode) => (
    <button
      key={JSON.stringify(target)}
      onClick={() => pick(target)}
      className={`flex h-7 w-full items-center gap-2 rounded-md pr-2 text-left ${
        sameTarget(state.selection, target) ? 'bg-[#E5F4FF]' : comment ? 'hover:bg-orange-50' : 'hover:bg-[#F5F5F5]'
      }`}
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      {board.acts.map((act) => (
        <div key={act.id}>
          {row({ kind: 'act', actId: act.id }, 0, <span className="font-medium">{act.name}</span>)}
          {act.frameIds.map((fid) => (
            <div key={fid}>
              {row({ kind: 'frame', frameId: fid }, 1, <><Icon.Frame size={12} className="text-[#8C8C8C]" />Frame {all.indexOf(fid) + 1}</>)}
              {[...board.frames[fid].layers].reverse().map((l) =>
                row(
                  { kind: 'layer', frameId: fid, layerId: l.id },
                  2,
                  <>
                    <span className="w-3 text-center text-[11px] text-[#8C8C8C]">{KIND_ICON[l.kind]}</span>
                    {l.name}
                  </>,
                ),
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
