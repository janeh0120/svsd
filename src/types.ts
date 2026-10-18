export type Feel = 'snappy' | 'smooth' | 'bouncy' | 'cinematic'

// Layers live in a 1440×900 frame. A layer keeps its id across frames, so
// playback can move it from one frame to the next (like Magic Move).
export type Layer = {
  id: string
  name: string
  kind: 'text' | 'image' | 'rect'
  x: number
  y: number
  w: number
  h: number
  rotation: number
  opacity: number
  scaleX?: number
  scaleY?: number
  text?: string
  fontSize?: number
  fontWeight?: number
  color?: string
  align?: 'left' | 'center'
  fill?: string
  radius?: number
  src?: string
  shadow?: boolean
}

export type Frame = { id: string; hold: number; background: string; layers: Layer[] }

// A cut is the motion between two frames.
export type Cut = { feel: Feel; note: string }

// `name` shows on the canvas, `label` on the timeline tabs.
export type Act = { id: string; name: string; label: string; frameIds: string[] }

export type Storyboard = {
  acts: Act[]
  frames: Record<string, Frame>
  cuts: Record<string, Cut> // keyed by `${fromId}->${toId}`
}

// Anything you can select or comment on.
export type Target =
  | { kind: 'layer'; frameId: string; layerId: string }
  | { kind: 'frame'; frameId: string }
  | { kind: 'cut'; key: string }
  | { kind: 'act'; actId: string }

// A comment pinned to a target. Drafts are being typed, pending ones wait to
// be sent to the agent as a batch.
export type Pin = {
  id: string
  target: Target
  x?: number // frame coords, for layer and frame pins
  y?: number
  text: string
  status: 'draft' | 'pending' | 'sent'
  reply?: string
}

// Agent chat items: plain text, a working step (like a tool call), captured
// screenshots, or an approval question the user answers.
export type Message = {
  id: string
  author: 'you' | 'agent'
  kind?: 'text' | 'step' | 'shots' | 'approval'
  text: string
  detail?: string
  status?: 'running' | 'done'
  shots?: string[]
  answer?: 'approved' | 'changes'
}

// Where the project is: blank → agent drafts the storyboard → user reviews it →
// agent records and animates → ready to preview and refine.
export type Phase = 'empty' | 'drafting' | 'review' | 'animating' | 'ready'

export type Mode = 'select' | 'comment'
