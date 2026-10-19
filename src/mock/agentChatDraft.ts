import type { Frame, Layer, Storyboard } from '../types'

// Example draft: a launch reel for a fictional product, Relay Playbooks — a
// support agent that finds why customers ask for a person and drafts a fix.
// Title → ask Relay why → it analyzes 1,284 handoffs → finds 48% are customers
// locked out of their email → drafts a Login recovery playbook → Approve. Backgrounds and panels are drawn
// by scripts/make-agentchat-screens.py; the prompt box and cursor are layers so
// they move between frames.
export function agentChatDraft(): Storyboard {
  const base = { rotation: 0, opacity: 1 }
  const img = (id: string, name: string, src: string, x: number, y: number, w: number, h: number): Layer => ({
    id, name, kind: 'image', src: `/shots/${src}.svg`, x, y, w, h, ...base,
  })
  const bg = (src: string, s = 1, cx = 720, cy = 450) => {
    const w = 1440 * s
    const h = 900 * s
    return img('bg', 'Background', src, Math.round(Math.min(0, Math.max(1440 - w, 720 - cx * s))), Math.round(Math.min(0, Math.max(900 - h, 450 - cy * s))), w, h)
  }
  const cursor = (x: number, y: number) => img('cursor', 'Cursor', 'ac-cursor', x, y, 40, 40)

  // The prompt box, laid out at 1×; `zoom` scales it up around its top-left for the close-up.
  // `hidden` lays it out invisible, so the next frame can grow it into view.
  const prompt = (query: string, zoom?: { f: number; x: number; y: number }, hidden = false): Layer[] => {
    const f = zoom?.f ?? 1
    const at = (x: number, y: number) => (zoom ? { x: Math.round(zoom.x + (x - 420) * f), y: Math.round(zoom.y + (y - 330) * f) } : { x, y })
    const box = (id: string, name: string, x: number, y: number, w: number, h: number, extra: Partial<Layer>): Layer => ({
      id, name, kind: 'rect', ...at(x, y), w: Math.round(w * f), h: Math.round(h * f), ...base, ...extra, radius: (extra.radius ?? 0) * f, opacity: hidden ? 0 : 1,
    })
    const text = (id: string, name: string, t: string, x: number, y: number, w: number, h: number, size: number, extra: Partial<Layer> = {}): Layer => ({
      id, name, kind: 'text', text: t, ...at(x, y), w: Math.round(w * f), h: Math.round(h * f), fontSize: Math.round(size * f),
      color: '#1E1E1E', fontWeight: 400, align: 'left', letterSpacing: 0, ...base, ...extra, opacity: hidden ? 0 : 1,
    })
    return [
      box('box', 'Prompt box', 420, 330, 600, 200, { fill: '#ffffff', radius: 22 }),
      box('chip', 'Agent chip', 444, 352, 280, 38, { fill: '#F1F1F1', radius: 19 }),
      text('chipText', 'Agent name', '◉  Relay · Support agent   ×', 460, 352, 260, 38, 16, { fontWeight: 500 }),
      text('query', 'Question', query, 444, 404, 560, 48, 26, { typing: true }),
      text('at', 'Mention', '@', 444, 470, 34, 44, 28),
      box('send', 'Send button', 952, 466, 46, 46, { fill: '#111111', radius: 23 }),
      text('arrow', 'Send arrow', '↑', 952, 466, 46, 46, 24, { color: '#ffffff', fontWeight: 600, align: 'center' }),
    ]
  }

  const frames: Frame[] = [
    {
      id: 'c1', name: 'Introducing Relay', hold: 2.2, background: '#F5F2ED',
      layers: [
        { id: 'title', name: 'Title', kind: 'text', text: 'Introducing Relay Playbooks', x: 320, y: 400, w: 800, h: 100, fontSize: 34, color: '#1E1E1E', fontWeight: 500, ...base },
        // The prompt box waits here, small and invisible, then grows into frame 2.
        ...prompt('', { f: 0.5, x: 570, y: 520 }, true),
      ],
    },
    { id: 'c2', name: 'Ask Relay', hold: 1.8, background: '#A3ABBA', layers: [...prompt('', { f: 2.2, x: 300, y: 170 })] },
    { id: 'c3', name: 'The question', hold: 2.2, background: '#A3ABBA', layers: [...prompt('Why are customers asking for a person?'), cursor(978, 494)] },
    { id: 'c4', name: 'Analyzing handoffs', hold: 3.2, background: '#26252B', layers: [bg('ac-workspace'), img('card', 'Analyzing handoffs', 'ac-gathering', 460, 300, 520, 290)] },
    { id: 'c5', name: 'Proposed playbook', hold: 3.2, background: '#FBFAF8', layers: [bg('ac-thought')] },
    { id: 'c6', name: 'Login recovery', hold: 3, background: '#FBFAF8', layers: [bg('ac-steps'), cursor(900, 520)] },
    { id: 'c7', name: 'Approve playbook', hold: 2.5, background: '#FBFAF8', layers: [bg('ac-steps', 2, 1190, 820), cursor(1075, 745)] },
  ]

  return {
    acts: [
      { id: 'a1', name: 'Intro', label: 'Intro', frameIds: ['c1'] },
      { id: 'a2', name: 'Ask', label: 'Ask', frameIds: ['c2', 'c3'] },
      { id: 'a3', name: 'Investigate', label: 'Investigate', frameIds: ['c4'] },
      { id: 'a4', name: 'Propose', label: 'Propose', frameIds: ['c5'] },
      { id: 'a5', name: 'Build', label: 'Build', frameIds: ['c6'] },
      { id: 'a6', name: 'Approve', label: 'Approve', frameIds: ['c7'] },
    ],
    frames: Object.fromEntries(frames.map((f) => [f.id, f])),
    cuts: {
      'c1->c2': { feel: 'cinematic', note: 'The prompt rises in, close up' },
      'c2->c3': { feel: 'smooth', note: 'The question types in as the box pulls out', duration: 2200 },
      'c3->c4': { feel: 'snappy', note: 'Send → the agent starts working', animation: 'dissolve', duration: 500 },
      'c4->c5': { feel: 'smooth', note: '', animation: 'dissolve', duration: 600 },
      'c5->c6': { feel: 'smooth', note: '' },
      'c6->c7': { feel: 'cinematic', note: 'Push in on Approve' },
    },
  }
}
