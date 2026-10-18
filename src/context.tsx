import { createContext, useCallback, useContext, useReducer, useRef, type ReactNode } from 'react'
import { FRAME_H, FRAME_W, order, targetLabel, timing, uid } from './board'
import { agentRespond } from './mock/agent'
import { mockDraft } from './mock/draft'
import { initialState, reducer, type Action, type State } from './store'
import type { Answer, Message, Target } from './types'

type Ctx = {
  state: State
  dispatch: React.Dispatch<Action>
  startComment: (target: Target, at?: { x: number; y: number }) => void
  send: () => void
  chat: (text: string) => void
  answer: (messageId: string, question: number, answer: Answer) => void
}

const AppContext = createContext<Ctx | null>(null)

// DOM id of whatever a target lives in, so we can scroll the canvas to it.
export const domId = (t: Target) =>
  t.kind === 'act' ? `act-${t.actId}` : t.kind === 'cut' ? `cut-${t.key}` : `frame-${t.frameId}`

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const latest = useRef(state)
  latest.current = state

  const say = useCallback((m: Omit<Message, 'id'>) => {
    const id = uid('m')
    dispatch({ type: 'message', message: { id, ...m } })
    return id
  }, [])

  // A working step, shown running and then checked off, like a tool call in Claude.
  const step = useCallback(
    async (text: string, detail: string | undefined, ms: number) => {
      const id = say({ author: 'agent', kind: 'step', text, detail, status: 'running' })
      await sleep(ms)
      dispatch({ type: 'messageUpdate', id, patch: { status: 'done' } })
    },
    [say],
  )

  const askApproval = useCallback(() => {
    say({
      author: 'agent',
      kind: 'question',
      purpose: 'approval',
      text: '',
      questions: [{ text: 'Does this storyboard look right?', options: ['Yes, continue', 'No, request changes'] }],
    })
  }, [say])

  // Blank project → the agent reads the site, captures screens, outlines the
  // narrative arc and drafts the storyboard act by act, then asks for approval.
  // Mocked: the draft is src/mock/draft.ts.
  const startProject = useCallback(
    async (prompt: string) => {
      const url = prompt.match(/https?:\/\/[^\s,]+|\b[\w-]+\.(?:app|com|io|dev|co|ai|so|design)\b[^\s,]*/i)?.[0] ?? 'your site'
      const draft = mockDraft()
      say({ author: 'you', text: prompt })
      dispatch({ type: 'phase', phase: 'drafting' })
      await sleep(500)
      say({ author: 'agent', text: `On it. I'll read ${url}, pull screens of the product, and draft a storyboard from your outline.` })
      await step(`Reading ${url}`, 'Pages, product copy and features', 1300)
      await step('Capturing screens', '5 screens at 1440 × 900', 1300)
      say({
        author: 'agent',
        kind: 'shots',
        text: 'Screens from your site',
        shots: ['home', 'dashboard', 'review', 'pricing', 'phone'].map((s) => `/shots/${s}.svg`),
      })
      await sleep(500)
      await step('Outlining the narrative arc', draft.acts.map((a) => a.name).join(' → '), 1200)

      // Draft the storyboard one act at a time so it fills in on the canvas.
      const id = say({ author: 'agent', kind: 'step', text: 'Drafting storyboard frames', status: 'running' })
      for (let n = 1; n <= draft.acts.length; n++) {
        dispatch({ type: 'load', board: { ...draft, acts: draft.acts.slice(0, n) } })
        document.getElementById(`act-${draft.acts[n - 1].id}`)?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
        await sleep(700)
      }
      dispatch({ type: 'messageUpdate', id, patch: { status: 'done', detail: `${order(draft).length} frames with copy and screenshots` } })
      document.getElementById('canvas')?.scrollTo({ left: 0, behavior: 'smooth' })
      await sleep(400)
      say({
        author: 'agent',
        text: `Here's the first storyboard: ${draft.acts.length} acts and ${order(draft).length} frames. Have a look on the canvas. You can comment on any frame, cut or act (C or @). Once you approve, I'll record the screen flows and animate the frames together.`,
      })
      dispatch({ type: 'phase', phase: 'review' })
      askApproval()
    },
    [say, step, askApproval],
  )

  // Approved → the agent records the product flows and animates the frames.
  const animate = useCallback(async () => {
    dispatch({ type: 'phase', phase: 'animating' })
    await sleep(400)
    await step('Recording screen flows', 'Dashboard, weekly review and pricing', 1600)
    await step('Matching layers between frames', undefined, 1100)
    await step('Timing cuts to your outline', undefined, 1100)
    const t = timing(latest.current.board)
    dispatch({ type: 'phase', phase: 'ready' })
    say({
      author: 'agent',
      text: `The animated reel is ready: ${t.frames.length} frames, about ${Math.round(t.total / 1000)}s. Press ▷ to preview it, and comment on anything you want changed.`,
    })
  }, [step, say])

  // Record the answer on the card, then act on it. Only the approval
  // question has behavior today; other cards just keep the answers.
  const answer = useCallback(
    (messageId: string, question: number, a: Answer) => {
      const m = latest.current.messages.find((x) => x.id === messageId)
      if (!m) return
      const answers = [...(m.answers ?? [])]
      answers[question] = a
      dispatch({ type: 'messageUpdate', id: messageId, patch: { answers } })
      if (m.purpose !== 'approval') return

      if (a !== 'skip' && 'option' in a && a.option === 0) animate()
      else if (a !== 'skip' && 'option' in a)
        say({
          author: 'agent',
          text: 'What should change? Point at a frame, a cut or an act (press C or type @) and leave a comment, or describe it here.',
        })
      else if (a !== 'skip') {
        // "Something else": treat it as feedback on the storyboard, then ask again.
        setTimeout(() => {
          say({ author: 'agent', text: "Noted. I'll fold that into the storyboard." })
          askApproval()
        }, 700)
      } else say({ author: 'agent', text: 'No problem. Tell me when you want me to continue.' })
    },
    [animate, say, askApproval],
  )

  // Drop a draft pin on a target and open its composer.
  const startComment = useCallback((target: Target, at?: { x: number; y: number }) => {
    let point = at
    if (!point && target.kind === 'layer') {
      const l = latest.current.board.frames[target.frameId]?.layers.find((x) => x.id === target.layerId)
      if (l) {
        point = {
          x: Math.min(FRAME_W - 40, Math.max(40, l.x + l.w / 2)),
          y: Math.min(FRAME_H - 40, Math.max(60, l.y + l.h / 2)),
        }
      }
    }
    if (!point && target.kind === 'frame') point = { x: FRAME_W / 2, y: FRAME_H / 2 }
    dispatch({ type: 'pinAdd', pin: { id: uid('p'), target, ...point, text: '', status: 'draft' } })
    document.getElementById(domId(target))?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [])

  // Send every queued comment in one pass; each one only edits its own target.
  const send = useCallback(() => {
    const pending = latest.current.pins.filter((p) => p.status === 'pending')
    if (!pending.length) return
    dispatch({ type: 'working', on: true })
    say({ author: 'you', text: `Sent ${pending.length} comment${pending.length > 1 ? 's' : ''}` })
    setTimeout(() => {
      let s = latest.current
      const lines: string[] = []
      for (const pin of pending) {
        const res = agentRespond(pin, s.board)
        for (const a of res.actions) {
          s = reducer(s, a)
          dispatch(a)
        }
        dispatch({ type: 'pinUpdate', id: pin.id, patch: { status: 'sent', reply: res.reply } })
        lines.push(`${targetLabel(pin.target, s.board)}: ${res.reply}`)
      }
      say({ author: 'agent', text: lines.join('\n') })
      dispatch({ type: 'working', on: false })
      // Still reviewing the storyboard: ask again before moving on.
      if (latest.current.phase === 'review') askApproval()
    }, 1100)
  }, [say, askApproval])

  const chat = useCallback(
    (text: string) => {
      const phase = latest.current.phase
      if (phase === 'empty') return void startProject(text)
      if (phase === 'drafting' || phase === 'animating') return
      say({ author: 'you', text })
      setTimeout(() => {
        if (phase === 'review') {
          say({ author: 'agent', text: "Noted. I'll fold that into the storyboard." })
          askApproval()
        } else {
          say({
            author: 'agent',
            text: 'To change something specific, point at it: type @ or press C, click an element, a gap between frames or an act title, and I’ll edit only that.',
          })
        }
      }, 700)
    },
    [startProject, say, askApproval],
  )

  return <AppContext.Provider value={{ state, dispatch, startComment, send, chat, answer }}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
