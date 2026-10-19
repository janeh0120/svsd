export type Feel = 'snappy' | 'smooth' | 'bouncy' | 'cinematic'

// Layers live in a 1440×900 frame. A layer keeps its id across frames, so
// playback can move it from one frame to the next (like Magic Move).
export type Layer = {
  id: string
  name: string
  kind: 'text' | 'image' | 'rect' | 'video'
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
  align?: 'left' | 'center' | 'right'
  fontFamily?: string
  letterSpacing?: number // percent of the font size
  fill?: string
  stroke?: string // outline color, for rectangles
  radius?: number
  src?: string
  start?: number // video: seconds into the clip where this frame begins
  typing?: boolean // text: types itself out in the preview, continuing from the previous frame's text
  shadow?: boolean
}

// Where the camera looks in a frame, in 0–1 units of the frame. The box keeps
// the frame's aspect ratio, so its height equals its width in these units.
export type Camera = { x: number; y: number; w: number }

export type Frame = { id: string; name?: string; hold: number; background: string; layers: Layer[]; camera?: Camera }

export type CutAnimation = 'smart' | 'dissolve' | 'instant'

// A cut is the motion between two frames. `feel` is an easing preset;
// `bezier` and `duration` override it when set.
export type Cut = {
  feel: Feel
  note: string
  animation?: CutAnimation
  bezier?: [number, number, number, number]
  duration?: number // ms
}

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
  // A moment in the reel, from the preview or the timeline ruler. `layerId` is
  // set when the click landed on a layer in the preview.
  | { kind: 'time'; ms: number; layerId?: string }

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
  inFlight?: boolean // sent straight from its pin; the agent is working on it
}

export type Question = { text: string; options: string[] }

// What the user did with a question: picked an option, typed their own
// answer, or skipped it.
export type Answer = { option: number } | { text: string } | 'skip'

// Agent chat items: plain text, a working step (like a tool call), captured
// screenshots, or a card of questions the user answers one by one.
export type Message = {
  id: string
  author: 'you' | 'agent'
  kind?: 'text' | 'step' | 'shots' | 'question'
  text: string
  detail?: string
  status?: 'running' | 'done'
  shots?: string[]
  purpose?: 'approval'
  questions?: Question[]
  answers?: Answer[]
}

// Where the project is: blank → agent drafts the storyboard → user reviews it →
// agent records and animates → ready to preview and refine.
export type Phase = 'empty' | 'drafting' | 'review' | 'animating' | 'ready'

export type Mode = 'select' | 'comment'
