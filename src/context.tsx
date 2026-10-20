import { createContext, useCallback, useContext, useReducer, useRef, type ReactNode } from 'react'
import { FRAME_H, FRAME_W, order, targetLabel, timing, uid } from './board'
import { agentRespond } from './mock/agent'
import { mockDraft } from './mock/draft'
import { withRecordings } from './mock/productDemoDraft'
import { initialState, reducer, type Action, type State } from './store'
import type { Answer, Message, Pin, Target } from './types'

type Ctx = {
  state: State
  dispatch: React.Dispatch<Action>
  startComment: (target: Target, at?: { x: number; y: number }) => void
  send: (note?: string) => void
  sendPin: (pinId: string, text: string) => void
  chat: (text: string) => void
  answer: (messageId: string, question: number, answer: Answer) => void
}

const AppContext = createContext<Ctx | null>(null)

// DOM id of whatever a target lives in, so we can scroll the canvas to it.
export const domId = (t: Target) =>
  t.kind === 'chapter' ? `chapter-${t.chapterId}` : t.kind === 'cut' ? `cut-${t.key}` : t.kind === 'time' ? 'timeline' : `frame-${t.frameId}`

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
      questions: [{ text: "I've created the storyboard. Can I continue and add the animation?", options: ['Yes, add animation', 'No, request changes'] }],
    })
  }, [say])

  // Blank project → the agent reads the site, captures screens, outlines the
  // narrative arc and drafts the storyboard chapter by chapter, then asks for approval.
  // Mocked: the draft is src/mock/draft.ts.
  const startProject = useCallback(
    async (prompt: string) => {
      const url = prompt.match(/https?:\/\/[^\s,]+|\bwww\.[^\s,]+|\b[\w-]+\.(?:app|com|io|dev|co|ai|so|design)\b[^\s,]*/i)?.[0] ?? 'your site'
      const draft = mockDraft(prompt)
      say({ author: 'you', text: prompt })
      dispatch({ type: 'phase', phase: 'drafting' })
      await sleep(500)
      say({ author: 'agent', text: `On it. I'll read ${url}, pull screens of the product, and draft a storyboard from your outline.` })
      dispatch({ type: 'rename', name: 'Agent Demo Reel' })
      await step(`Reading ${url}`, 'Pages, product copy and features', 1300)
      const shots = [...new Set(Object.values(draft.frames).flatMap((f) => f.layers.filter((l) => l.kind === 'image').map((l) => l.src!)))]
      await step('Capturing screens', `${shots.length} screens at 1440 × 900`, 1300)
      say({
        author: 'agent',
        kind: 'shots',
        text: 'Screens from your site',
        shots,
      })
      await sleep(500)
      await step('Outlining the narrative arc', draft.chapters.map((a) => a.name).join(' → '), 1200)

      // Draft the storyboard one chapter at a time so it fills in on the canvas.
      const id = say({ author: 'agent', kind: 'step', text: 'Drafting storyboard frames', status: 'running' })
      for (let n = 1; n <= draft.chapters.length; n++) {
        dispatch({ type: 'load', board: { ...draft, chapters: draft.chapters.slice(0, n) } })
        document.getElementById(`chapter-${draft.chapters[n - 1].id}`)?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
        await sleep(700)
      }
      dispatch({ type: 'messageUpdate', id, patch: { status: 'done', detail: `${order(draft).length} frames with copy and screenshots` } })
      document.getElementById('canvas')?.scrollTo({ left: 0, behavior: 'smooth' })
      await sleep(400)
      say({
        author: 'agent',
        text: `Here's the first storyboard: ${draft.chapters.length} chapters and ${order(draft).length} frames. Have a look on the canvas. You can comment on any frame, cut or chapter (C or @). Once you approve, I'll record the screen flows and animate the frames together.`,
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
    const middle = latest.current.board.chapters.slice(1, -1).map((a) => a.name)
    await step('Recording screen flows', middle.join(', '), 1600)
    // Swap the storyboard's still screens for the real recordings.
    const recorded = withRecordings(latest.current.board)
    const swapped = Object.keys(recorded.frames).filter((id) => recorded.frames[id] !== latest.current.board.frames[id]).length
    if (swapped) {
      dispatch({ type: 'load', board: recorded })
      say({ author: 'agent', text: `Swapped ${swapped} frames from screenshots to screen recordings.` })
    }
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
          text: "What should change? Point at a frame, a cut or a chapter (press C or type @) and leave a comment, or describe it here. When you're happy, tell me to continue and I'll add the animation.",
        })
      else if (a !== 'skip') {
        // "Something else": treat it as feedback on the storyboard.
        setTimeout(() => say({ author: 'agent', text: "Noted. I'll fold that into the storyboard. Tell me to continue when you want the animation." }), 700)
      } else say({ author: 'agent', text: 'No problem. Tell me when you want me to continue and add the animation.' })
    },
    [animate, say],
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
  // The agent works through a set of comments; each one edits only its own target.
  const execute = useCallback(
    (pins: Pin[], youSaid: string) => {
      dispatch({ type: 'working', on: true })
      say({ author: 'you', text: youSaid })
      setTimeout(() => {
        let s = latest.current
        const lines: string[] = []
        for (const pin of pins) {
          const res = agentRespond(pin, s.board)
          for (const a of res.actions) {
            s = reducer(s, a)
            dispatch(a)
          }
          dispatch({ type: 'pinUpdate', id: pin.id, patch: { status: 'sent', reply: res.reply, inFlight: false } })
          lines.push(pins.length > 1 ? `${targetLabel(pin.target, s.board)}: ${res.reply}` : res.reply)
        }
        say({ author: 'agent', text: lines.join('\n') })
        dispatch({ type: 'working', on: false })
      }, 1100)
    },
    [say],
  )

  // Send the comments attached to the agent input. `note` is anything typed alongside them.
  const send = useCallback(
    (note?: string) => {
      const pending = latest.current.pins.filter((p) => p.status === 'pending' && !p.inFlight)
      if (!pending.length) return
      const count = `${pending.length} annotation${pending.length > 1 ? 's' : ''}`
      execute(pending, note ? `${note}\n(${count} attached)` : `Sent ${count}`)
    },
    [execute],
  )

  // Send one comment straight from its pin: the agent applies it right away.
  const sendPin = useCallback(
    (pinId: string, text: string) => {
      const pin = latest.current.pins.find((p) => p.id === pinId)
      if (!pin || !text.trim()) return
      const sent = { ...pin, text: text.trim(), status: 'pending' as const }
      dispatch({ type: 'pinUpdate', id: pinId, patch: { text: sent.text, status: 'pending', inFlight: true } })
      dispatch({ type: 'compose', id: null })
      execute([sent], `${targetLabel(pin.target, latest.current.board)}: ${sent.text}`)
    },
    [execute],
  )

  const chat = useCallback(
    (text: string) => {
      const phase = latest.current.phase
      if (phase === 'empty') return void startProject(text)
      if (phase === 'drafting' || phase === 'animating') return
      // Reviewing the storyboard: a go-ahead in chat starts the animation.
      if (phase === 'review' && /\b(continue|go ahead|animat\w*|looks good|lgtm|approve\w*)\b|^(yes|yep|ok(ay)?)\b/i.test(text.trim())) {
        say({ author: 'you', text })
        return void animate()
      }
      say({ author: 'you', text })
      dispatch({ type: 'working', on: true })
      setTimeout(() => {
        dispatch({ type: 'working', on: false })
        if (phase === 'review') {
          say({ author: 'agent', text: "Noted. I'll fold that into the storyboard. Tell me to continue when you want the animation." })
        } else {
          say({
            author: 'agent',
            text: 'To change something specific, point at it: type @ or press C, click an element, a gap between frames or a chapter title, and I’ll edit only that.',
          })
        }
      }, 1600)
    },
    [startProject, animate, say],
  )

  return <AppContext.Provider value={{ state, dispatch, startComment, send, sendPin, chat, answer }}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
