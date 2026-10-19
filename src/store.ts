import { arrayMove } from '@dnd-kit/sortable'
import { DEFAULT_CUT, sameTarget, timing, uid } from './board'
import type { Cut, Frame, Layer, Message, Mode, Phase, Pin, Storyboard, Target } from './types'

export type State = {
  phase: Phase
  board: Storyboard
  selection: Target | null
  mode: Mode
  pins: Pin[]
  composing: string | null // pin whose popover is open
  messages: Message[]
  working: boolean
  preview: boolean
  previewFrom: string | null // frame to start the preview at
  playhead: number // ms
  playing: boolean // the timeline is playing
}

export type Action =
  | { type: 'phase'; phase: Phase }
  | { type: 'load'; board: Storyboard }
  | { type: 'messageUpdate'; id: string; patch: Partial<Message> }
  | { type: 'select'; target: Target | null }
  | { type: 'mode'; mode: Mode }
  | { type: 'preview'; open: boolean; from?: string }
  | { type: 'layer'; frameId: string; layerId: string; patch: Partial<Layer> }
  | { type: 'frame'; frameId: string; patch: Partial<Frame> }
  | { type: 'cut'; key: string; patch: Partial<Cut> }
  | { type: 'reorder'; actId: string; from: number; to: number }
  | { type: 'duplicate'; frameId: string }
  | { type: 'remove'; frameId: string }
  | { type: 'pinAdd'; pin: Pin }
  | { type: 'pinUpdate'; id: string; patch: Partial<Pin> }
  | { type: 'pinRemove'; id: string }
  | { type: 'compose'; id: string | null }
  | { type: 'message'; message: Message }
  | { type: 'working'; on: boolean }
  | { type: 'playhead'; ms: number }
  | { type: 'playing'; on: boolean }

export const initialState: State = {
  phase: 'empty',
  board: { acts: [], frames: {}, cuts: {} },
  selection: null,
  mode: 'select',
  pins: [],
  composing: null,
  messages: [],
  working: false,
  preview: false,
  previewFrom: null,
  playhead: 0,
  playing: false,
}

const dropDrafts = (pins: Pin[]) => pins.filter((p) => p.status !== 'draft')

export function reducer(state: State, action: Action): State {
  const { board } = state
  switch (action.type) {
    case 'phase':
      return { ...state, phase: action.phase }
    case 'load':
      return { ...state, board: action.board }
    case 'messageUpdate':
      return { ...state, messages: state.messages.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)) }
    case 'select': {
      // Selecting a frame (or something in it) moves the playhead to the moment that frame lands.
      const t = action.target
      const at = t && (t.kind === 'frame' || t.kind === 'layer') ? timing(board).frames.find((f) => f.id === t.frameId) : undefined
      return { ...state, selection: t, playhead: at ? at.start : state.playhead }
    }
    case 'mode':
      // Leaving comment mode throws away a half-typed comment.
      return { ...state, mode: action.mode, pins: dropDrafts(state.pins), composing: null }
    case 'preview':
      return { ...state, preview: action.open, previewFrom: action.open ? (action.from ?? null) : null }
    case 'layer': {
      const fr = board.frames[action.frameId]
      if (!fr) return state
      const layers = fr.layers.map((l) => (l.id === action.layerId ? { ...l, ...action.patch } : l))
      return reducer(state, { type: 'frame', frameId: fr.id, patch: { layers } })
    }
    case 'frame':
      return {
        ...state,
        board: { ...board, frames: { ...board.frames, [action.frameId]: { ...board.frames[action.frameId], ...action.patch } } },
      }
    case 'cut':
      return {
        ...state,
        board: { ...board, cuts: { ...board.cuts, [action.key]: { ...(board.cuts[action.key] ?? DEFAULT_CUT), ...action.patch } } },
      }
    case 'reorder':
      return {
        ...state,
        board: {
          ...board,
          acts: board.acts.map((a) => (a.id === action.actId ? { ...a, frameIds: arrayMove(a.frameIds, action.from, action.to) } : a)),
        },
      }
    case 'duplicate': {
      // Same layer ids, so the copy animates from the original: tweak it and it's a new moment.
      const id = uid('f')
      const src = board.frames[action.frameId]
      return {
        ...state,
        selection: { kind: 'frame', frameId: id },
        board: {
          ...board,
          frames: { ...board.frames, [id]: { ...src, id, layers: src.layers.map((l) => ({ ...l })) } },
          acts: board.acts.map((a) => {
            const i = a.frameIds.indexOf(action.frameId)
            if (i === -1) return a
            const frameIds = [...a.frameIds]
            frameIds.splice(i + 1, 0, id)
            return { ...a, frameIds }
          }),
        },
      }
    }
    case 'remove': {
      const frames = { ...board.frames }
      delete frames[action.frameId]
      const onFrame = (t: Target) =>
        ((t.kind === 'layer' || t.kind === 'frame') && t.frameId === action.frameId) ||
        (t.kind === 'cut' && t.key.split('->').includes(action.frameId))
      return {
        ...state,
        selection: state.selection && onFrame(state.selection) ? null : state.selection,
        pins: state.pins.filter((p) => !onFrame(p.target)),
        board: { ...board, frames, acts: board.acts.map((a) => ({ ...a, frameIds: a.frameIds.filter((f) => f !== action.frameId) })) },
      }
    }
    case 'pinAdd':
      return { ...state, pins: [...dropDrafts(state.pins), action.pin], composing: action.pin.id }
    case 'pinUpdate':
      return { ...state, pins: state.pins.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)) }
    case 'pinRemove':
      return { ...state, pins: state.pins.filter((p) => p.id !== action.id), composing: state.composing === action.id ? null : state.composing }
    case 'compose':
      // Closing an empty draft discards it.
      return { ...state, composing: action.id, pins: state.pins.filter((p) => p.status !== 'draft' || p.id === action.id || p.text.trim()) }
    case 'message':
      return { ...state, messages: [...state.messages, action.message] }
    case 'working':
      return { ...state, working: action.on }
    case 'playhead':
      return { ...state, playhead: action.ms }
    case 'playing':
      return { ...state, playing: action.on }
  }
}

export const pinsFor = (pins: Pin[], t: Target) => pins.filter((p) => sameTarget(p.target, t))
