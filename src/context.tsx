import { createContext, useCallback, useContext, useReducer, useRef, type ReactNode } from 'react'
import { FRAME_H, FRAME_W, targetLabel, uid } from './board'
import { agentRespond } from './mock/agent'
import { initialState, reducer, type Action, type State } from './store'
import type { Target } from './types'

type Ctx = {
  state: State
  dispatch: React.Dispatch<Action>
  startComment: (target: Target, at?: { x: number; y: number }) => void
  send: () => void
  chat: (text: string) => void
}

const AppContext = createContext<Ctx | null>(null)

// DOM id of whatever a target lives in, so we can scroll the canvas to it.
export const domId = (t: Target) =>
  t.kind === 'act' ? `act-${t.actId}` : t.kind === 'cut' ? `cut-${t.key}` : `frame-${t.frameId}`

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const latest = useRef(state)
  latest.current = state

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
    dispatch({
      type: 'message',
      message: { id: uid('m'), author: 'you', text: `Sent ${pending.length} comment${pending.length > 1 ? 's' : ''}` },
    })
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
      dispatch({ type: 'message', message: { id: uid('m'), author: 'agent', text: lines.join('\n') } })
      dispatch({ type: 'working', on: false })
    }, 1100)
  }, [])

  const chat = useCallback((text: string) => {
    dispatch({ type: 'message', message: { id: uid('m'), author: 'you', text } })
    setTimeout(() => {
      dispatch({
        type: 'message',
        message: {
          id: uid('m'),
          author: 'agent',
          text: 'To change something specific, point at it: type @ or press C, click an element, a gap between frames or an act title, and I’ll edit only that.',
        },
      })
    }, 700)
  }, [])

  return <AppContext.Provider value={{ state, dispatch, startComment, send, chat }}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
