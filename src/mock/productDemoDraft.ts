import type { Frame, Layer, Storyboard } from '../types'

// A view `s`× zoomed around (cx, cy) of a 1440×900 screen, kept covering the frame.
function place(cx: number, cy: number, s: number) {
  const w = 1440 * s
  const h = 900 * s // the screens are drawn 1440×900; the 810-tall frame shows them cover-fit
  return {
    x: Math.round(Math.min(0, Math.max(1440 - w, 720 - cx * s))),
    y: Math.round(Math.min(0, Math.max(810 - h, 405 - cy * s))),
    w: Math.round(w),
    h: Math.round(h),
  }
}

// The product's own 60-second demo reel: problem → product → prompt the agent →
// point and tweak → fine-tune by hand. Screens are drawn by
// scripts/make-demo-screens.py; the product name is a placeholder.
const PRODUCT = 'Storyboard'

export function productDemoDraft(): Storyboard {
  const text = (id: string, name: string, t: string, x: number, y: number, w: number, h: number, fontSize: number, extra: Partial<Layer> = {}): Layer => ({
    id, name, kind: 'text', text: t, x, y, w, h, fontSize, rotation: 0, opacity: 1, color: '#ffffff', fontWeight: 500, ...extra,
  })

  // A screen zoomed `s`× around (cx, cy), kept covering the whole frame. Same layer id
  // in every frame, so consecutive shots of one screen pan and zoom between each other.
  const shot = (src: string, cx = 720, cy = 450, s = 1): Layer => ({
    id: 'screen', name: 'Product screen', kind: 'image', src: `/shots/${src}.svg`, ...place(cx, cy, s), rotation: 0, opacity: 1,
  })

  // On-screen line, in a dark pill at the bottom of the frame.
  const caption = (t: string) =>
    text('caption', 'Caption', t, 270, 682, 900, 84, 38, { fill: '#1E1E1E', fontWeight: 600 })

  const black = '#0B0B0B'
  const ui = '#F5F5F5'
  const frames: Frame[] = [
    // Hook
    { id: 'h1', hold: 2, background: '#141417', layers: [shot('demo-old-timeline', 520, 300, 1.6), caption('Motion tells the story of your work.')] },
    { id: 'h2', hold: 2, background: '#141417', layers: [shot('demo-old-timeline'), caption('But the tools speak in timelines.')] },
    { id: 'h3', hold: 2, background: '#F4EFE4', layers: [shot('demo-storyboard-sketch'), caption('Designers think in storyboards.')] },

    // Intro
    { id: 'i1', hold: 1.5, background: black, layers: [text('title', 'Product name', PRODUCT, 170, 315, 1100, 180, 150)] },
    { id: 'i2', hold: 2.5, background: ui, layers: [shot('demo-empty'), caption('Motion, edited as a storyboard.')] },

    // Prompt the agent
    { id: 'p1', hold: 2.5, background: ui, layers: [shot('demo-prompt', 130, 585, 2.8), caption('Describe the reel.')] },
    { id: 'p2', hold: 2.5, background: ui, layers: [shot('demo-agent', 130, 280, 1.9), caption('It pulls screens from your product.')] },
    { id: 'p3', hold: 3, background: ui, layers: [shot('demo-drafted'), caption('And drafts the story, chapter by chapter.')] },
    { id: 'p4', hold: 2.5, background: ui, layers: [shot('demo-drafted', 130, 371, 2.4), caption('You approve before it animates.')] },
    { id: 'p5', hold: 2.5, background: ui, layers: [shot('demo-ready'), caption('Then it records and animates.')] },

    // Point and tweak
    { id: 't1', hold: 2, background: ui, layers: [shot('demo-tooltip', 139, 530, 2.2), caption('Point at anything.')] },
    { id: 't2', hold: 2.5, background: ui, layers: [shot('demo-comment', 470, 220, 2.2), caption('Say what to change.')] },
    { id: 't3', hold: 2.5, background: ui, layers: [shot('demo-updated', 470, 220, 2.2), caption('Only that element updates.')] },
    { id: 't4', hold: 2.5, background: ui, layers: [shot('demo-moment', 560, 660, 2), caption('Even a moment in time.')] },

    // Fine-tune by hand
    { id: 'f1', hold: 2.5, background: ui, layers: [shot('demo-motion', 1310, 470, 2.4), caption('Shape every transition.')] },
    { id: 'f2', hold: 2.5, background: ui, layers: [shot('demo-camera', 1310, 440, 2.4), caption('Frame the shot.')] },
    { id: 'f3', hold: 2.5, background: ui, layers: [shot('demo-trim', 260, 760, 2.6), caption('Trim like a video editor.')] },

    // Outro
    { id: 'o1', hold: 2.5, background: ui, layers: [shot('demo-ready'), caption('From prompt to reel, without a timeline.')] },
    {
      id: 'o2', hold: 3, background: black, layers: [
        text('title', 'Product name', PRODUCT, 170, 255, 1100, 180, 150),
        text('tagline', 'Tagline', 'Motion you can storyboard.', 170, 455, 1100, 80, 48, { color: '#B3B3B3', fontWeight: 400 }),
      ],
    },
  ]

  return {
    chapters: [
      { id: 'a1', name: 'Hook', label: 'Hook', frameIds: ['h1', 'h2', 'h3'] },
      { id: 'a2', name: 'Intro', label: 'Intro', frameIds: ['i1', 'i2'] },
      { id: 'a3', name: 'Prompt the agent', label: 'Prompt', frameIds: ['p1', 'p2', 'p3', 'p4', 'p5'] },
      { id: 'a4', name: 'Point and tweak', label: 'Tweak', frameIds: ['t1', 't2', 't3', 't4'] },
      { id: 'a5', name: 'Fine-tune by hand', label: 'Fine-tune', frameIds: ['f1', 'f2', 'f3'] },
      { id: 'a6', name: 'Outro', label: 'Outro', frameIds: ['o1', 'o2'] },
    ],
    frames: Object.fromEntries(frames.map((f) => [f.id, f])),
    cuts: {
      'h1->h2': { feel: 'smooth', note: 'Pull out until the timeline feels cluttered' },
      'h2->h3': { feel: 'smooth', note: 'Cross-fade to the sketch', animation: 'dissolve', duration: 600 },
      'h3->i1': { feel: 'snappy', note: '' },
      'i1->i2': { feel: 'cinematic', note: 'Reveal the editor' },
      'p4->p5': { feel: 'cinematic', note: '' },
      'p5->t1': { feel: 'snappy', note: '' },
      't2->t3': { feel: 'bouncy', note: 'The title grows in place' },
      'f2->f3': { feel: 'snappy', note: '' },
      'f3->o1': { feel: 'cinematic', note: '' },
    },
  }
}

// Once the storyboard is approved, the agent "records the screen flows": each
// drawn screen is replaced by the matching moment of a real screen recording
// of the editor (public/recordings, made by scripts/record-demo.mjs).
// [clip, seconds into it, zoom center x, y, zoom]
const RECORDED: Record<string, [string, number, number, number, number]> = {
  i2: ['01-prompt-and-draft', 0.2, 720, 450, 1],
  p1: ['01-prompt-and-draft', 1.4, 120, 675, 2.6],
  p2: ['01-prompt-and-draft', 7, 120, 260, 1.8],
  p3: ['01-prompt-and-draft', 11, 720, 450, 1],
  p4: ['01-prompt-and-draft', 15, 120, 548, 2.4],
  p5: ['02-approve-and-animate', 1, 720, 450, 1],
  t1: ['03-point-and-tweak', 0.4, 150, 630, 2.2],
  t2: ['03-point-and-tweak', 2.8, 790, 210, 2],
  t3: ['03-point-and-tweak', 5.4, 790, 210, 2],
  t4: ['03-point-and-tweak', 8.2, 560, 790, 2],
  f1: ['04-fine-tune', 1.2, 1320, 560, 2.2],
  f2: ['04-fine-tune', 5.6, 1320, 600, 2.2],
  f3: ['04-fine-tune', 9.2, 180, 850, 2.4],
  o1: ['02-approve-and-animate', 6.6, 720, 450, 1],
}

export function withRecordings(board: Storyboard): Storyboard {
  const frames = { ...board.frames }
  for (const [id, [clip, start, cx, cy, s]] of Object.entries(RECORDED)) {
    const fr = frames[id]
    const screen = fr?.layers.find((l) => l.id === 'screen' && l.src?.startsWith('/shots/demo-'))
    if (!fr || !screen) continue
    const video: Layer = { ...screen, kind: 'video', name: 'Screen recording', src: `/recordings/${clip}.mp4`, start, ...place(cx, cy, s) }
    frames[id] = { ...fr, layers: fr.layers.map((l) => (l === screen ? video : l)) }
  }
  return { ...board, frames }
}
