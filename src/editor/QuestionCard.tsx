import { useEffect, useState } from 'react'
import { useApp } from '../context'
import type { Answer, Message } from '../types'
import { Icon } from './icons'

const answerLabel = (a: Answer, options: string[]) =>
  a === 'skip' ? 'Skipped' : 'option' in a ? options[a.option] : a.text

// The agent's questions, one at a time: numbered options, your own answer, or skip.
// Number keys pick an option while the card is waiting.
export function QuestionCard({ m }: { m: Message }) {
  const { answer } = useApp()
  const questions = m.questions ?? []
  const answers = m.answers ?? []
  const firstOpen = answers.length
  const [view, setView] = useState(firstOpen)
  const [active, setActive] = useState(0)
  const [text, setText] = useState('')
  const done = answers.length >= questions.length

  // Move to the next question once this one is answered.
  useEffect(() => {
    setView(Math.min(firstOpen, questions.length - 1))
    setActive(0)
    setText('')
  }, [firstOpen, questions.length])

  const q = questions[view]
  const answered = answers[view]
  const open = !done && view === firstOpen

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, select')) return
      const n = Number(e.key)
      if (n >= 1 && n <= q.options.length) {
        e.preventDefault()
        answer(m.id, view, { option: n - 1 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, q, view, m.id, answer])

  if (!q) return null

  if (done && questions.length === 1) {
    return (
      <div className="rounded-xl border border-line px-3 py-2">
        <p className="font-medium">{q.text}</p>
        <p className="mt-0.5 text-muted">{answerLabel(answers[0], q.options)}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-line bg-raised p-1 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex h-9 items-center gap-2 px-2">
        <p className="min-w-0 flex-1 font-medium">{q.text}</p>
        {questions.length > 1 && (
          <div className="flex shrink-0 items-center gap-1 text-muted">
            <button onClick={() => setView(Math.max(0, view - 1))} disabled={view === 0} className="disabled:opacity-30">
              <Icon.ChevronLeft size={12} />
            </button>
            <span className="text-[11px] tabular-nums">
              {view + 1} of {questions.length}
            </span>
            <button onClick={() => setView(Math.min(firstOpen, questions.length - 1, view + 1))} disabled={view >= Math.min(firstOpen, questions.length - 1)} className="disabled:opacity-30">
              <Icon.ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {answered !== undefined ? (
        <p className="px-2 pb-2 text-muted">{answerLabel(answered, q.options)}</p>
      ) : (
        <>
          <div className="divide-y divide-line">
            {q.options.map((opt, i) => (
              <button
                key={opt}
                onMouseEnter={() => setActive(i)}
                onClick={() => answer(m.id, view, { option: i })}
                className={`flex h-9 w-full items-center gap-2 rounded-lg px-1.5 text-left ${active === i ? 'border-transparent bg-control text-ink' : 'text-muted'}`}
              >
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] ${active === i ? 'bg-control-hover text-ink' : 'bg-control'}`}>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{opt}</span>
                {active === i && <Icon.ArrowRight size={12} className="shrink-0 text-muted" />}
              </button>
            ))}
            <div className="flex h-9 items-center gap-2 px-1.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-control text-muted">
                <Icon.Pencil size={12} />
              </span>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => setActive(-1)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && text.trim()) answer(m.id, view, { text: text.trim() })
                }}
                placeholder="Something else"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle"
              />
              <button onClick={() => answer(m.id, view, 'skip')} className="h-6 shrink-0 rounded-md bg-control px-2 text-[11px] text-muted hover:bg-control-hover">
                Skip
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
