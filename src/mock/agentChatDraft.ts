import type { Frame, Layer, Storyboard } from '../types'

// Example draft: the ElevenAgents Architect launch video, 30 shots in 5 chapters.
// Shots 5–7 are rebuilt from layers (prompt box, cursor, the dark analysis
// panels) so the prompt and cursor carry across cuts; every other shot is a
// still from public/shots/elevenagents, filled edge to edge.
export function agentChatDraft(): Storyboard {
  const base = { rotation: 0, opacity: 1 }
  const rect = (id: string, name: string, x: number, y: number, w: number, h: number, fill: string, radius = 0, extra: Partial<Layer> = {}): Layer => ({
    id, name, kind: 'rect', x, y, w, h, fill, radius, ...base, ...extra,
  })
  const text = (id: string, name: string, t: string, x: number, y: number, w: number, h: number, size: number, color: string, extra: Partial<Layer> = {}): Layer => ({
    id, name, kind: 'text', text: t, x, y, w, h, fontSize: size, color, fontWeight: 400, align: 'left', letterSpacing: 0, ...base, ...extra,
  })
  const cursor = (x: number, y: number): Layer => ({ id: 'cursor', name: 'Cursor', kind: 'image', src: '/shots/ac-cursor.svg', x, y, w: 40, h: 40, ...base })

  // Shot 5 and 6 background: the soft blue-grey gradient, inset on an off-white page in shot 6.
  const GRADIENT =
    'radial-gradient(60% 60% at 30% 85%, #2F3566 0%, transparent 70%), radial-gradient(40% 40% at 62% 100%, #4A1F2A 0%, transparent 70%), radial-gradient(50% 50% at 80% 20%, #8C9BC4 0%, transparent 70%), linear-gradient(120deg, #A7BAC4, #93A5C6 60%, #8F9AC0)'

  // The prompt box, laid out as in shot 6 (top-left at 347,300). `zoom` scales it up
  // around that corner and places it at (x, y), for the shot 5 close-up.
  const prompt = (query: string, zoom?: { f: number; x: number; y: number }): Layer[] => {
    const f = zoom?.f ?? 1
    const at = (x: number, y: number) => (zoom ? { x: Math.round(zoom.x + (x - 347) * f), y: Math.round(zoom.y + (y - 300) * f) } : { x, y })
    const box = (id: string, name: string, x: number, y: number, w: number, h: number, fill: string, radius: number): Layer => ({
      ...rect(id, name, 0, 0, Math.round(w * f), Math.round(h * f), fill, Math.round(radius * f)), ...at(x, y),
    })
    const label = (id: string, name: string, t: string, x: number, y: number, w: number, h: number, size: number, color: string, extra: Partial<Layer> = {}): Layer => ({
      ...text(id, name, t, 0, 0, Math.round(w * f), Math.round(h * f), Math.round(size * f), color, extra), ...at(x, y),
    })
    return [
      box('box', 'Prompt box', 347, 300, 731, 210, '#FFFFFF', 22),
      box('chip', 'Agent chip', 362, 315, 295, 36, '#F3F3F4', 18),
      box('avatar', 'Agent avatar', 370, 322, 22, 22, '#6B7280', 11),
      label('chipText', 'Agent name', 'Customer support agent', 400, 315, 230, 36, 20, '#1A1A1A', { fontWeight: 500 }),
      label('chipX', 'Remove agent', '×', 631, 315, 20, 36, 22, '#8A8F98'),
      label('query', 'Question', query, 376, 365, 640, 48, 26, '#1E1E1E', { typing: true }),
      label('at', 'Mention', '@', 372, 440, 40, 44, 32, '#111111'),
      box('send', 'Send button', 1008, 438, 57, 57, '#111111', 29),
      label('arrow', 'Send arrow', '↑', 1008, 438, 57, 57, 30, '#FFFFFF', { fontWeight: 500, align: 'center' }),
    ]
  }

  // Shot 6 is a screen recording (public/shots/orbiting-agents.mp4). Shot 5 holds the "Gathering data" card invisible, ready to carry on.
  const gatherCard = (visible: boolean): Layer[] => {
    const o = visible ? 1 : 0
    const row = (i: number, label: string): Layer[] => [
      rect(`g-check${i}`, `${label} check`, 553, 368 + i * 55, 28, 28, '#3C3C42', 14, { opacity: o }),
      text(`g-tick${i}`, `${label} tick`, '✓', 553, 368 + i * 55, 28, 28, 16, '#FFFFFF', { align: 'center', fontWeight: 500, opacity: o }),
      text(`g-row${i}`, label, label, 596, 366 + i * 55, 300, 32, 20, '#8E8E94', { opacity: o }),
    ]
    return [
      rect('g-card', 'Gathering data card', 535, 282, 371, 246, '#FBFBFB', 12, { opacity: o }),
      text('g-icon', 'Gathering icon', '✦', 553, 297, 30, 34, 24, '#55555C', { opacity: o, align: 'center' }),
      text('g-title', 'Gathering data', 'Gathering data', 596, 296, 300, 36, 22, '#1F1F22', { opacity: o }),
      rect('g-line', 'Divider', 535, 349, 371, 1, '#E6E6E8', 0, { opacity: o }),
      ...row(0, 'Reading transcripts'),
      ...row(1, 'Finding transfer patterns'),
      ...row(2, 'Checking escalation rules'),
    ]
  }

  // The wordmark shots: the still keeps the tiled pattern; a patch hides the printed
  // wordmark and TenAgents Builder is set on top as layers.
  const wordmark = (key: string): Layer[] => [
    rect(`wm-patch-${key}`, 'Wordmark cover', 420, 405, 600, 95, '#F5F3F1'),
    // In: the logo spins up, then Ten and Agents blur up from below and Builder grows in. Out: it unwinds in reverse.
    { id: `wm-logo-${key}`, name: 'Play logo', kind: 'image', src: '/shots/logo-play.svg', x: 446, y: 428, w: 40, h: 46, ...base, enter: 'spin', delay: 0.1, exit: 'spin', exitDelay: 0.15 },
    { ...text(`wm-ten-${key}`, 'Ten', 'Ten', 497, 418, 130, 68, 56, '#111111', { fontWeight: 700, letterSpacing: -2 }), enter: 'blur-slide', delay: 0.2, exit: 'blur', exitDelay: 0.1 },
    { ...text(`wm-agents-${key}`, 'Agents', 'Agents', 604, 418, 210, 68, 56, '#111111', { letterSpacing: -2 }), enter: 'blur-slide', delay: 0.32, exit: 'blur', exitDelay: 0.05 },
    { ...text(`wm-builder-${key}`, 'Builder', 'Builder', 790, 418, 230, 68, 56, '#6E759F', { fontWeight: 300, letterSpacing: -2 }), enter: 'blur-scale', delay: 0.46, exit: 'blur-scale' },
  ]

  // Source timing: each shot holds until the next one starts. Shots 5–7 carry
  // their own cuts (the prompt rises and types, then Send), so their holds are
  // what is left of the slot after the cut in.
  const stills: [string, string, number][] = [
    ['02-your-agents', 'Your agents', 1.1],
    ['03-agents-at-work', 'Agents at work', 2.3],
    ['04-wordmark-architect', 'Wordmark: Builder', 4.8],
    ['08-insight-proposed-fix', 'Insight and proposed fix', 12.8],
    ['09-procedure-steps', 'Procedure steps', 15.5],
    ['10-approve-reject', 'Approve or reject', 18.0],
    ['11-agent-on-call', 'Agent on a call', 19.1],
    ['12-customer-collage', 'Customer collage', 21.0],
    ['13-scanning-conversations', 'Scanning conversations', 22.7],
    ['14-alternate-verification-proposal', 'Alternate verification proposal', 25.8],
    ['15-proposals-list', 'Proposals list', 28.1],
    ['16-evaluation-tiles', 'Evaluation tiles', 29.9],
    ['17-architect-orb', 'Architect orb', 32.5],
    ['18-ask-architect-pill', 'Ask Architect pill', 34.4],
    ['19-build-agent-prompt', 'Build an agent from a prompt', 35.4],
    ['20-agent-config-result', 'Agent configuration result', 44.8],
    ['21-to-the-standards-you-set', 'To the standards you set', 48.5],
    ['22-for-real-customers', 'For real customers', 50.7],
    ['23-customer-photo-wall', 'Customer photo wall', 52.8],
    ['24-connect-claude', 'Connect to Claude', 54.2],
    ['25-connect-claude-code', 'Connect to Claude Code', 54.9],
    ['26-connect-cursor', 'Connect to Cursor', 55.5],
    ['27-connect-grok-bot', 'Connect to Grok Bot', 56.2],
    ['28-connect-chatgpt', 'Connect to ChatGPT', 56.9],
    ['29-improve-your-agents', 'Improve your agents', 57.7],
    ['30-elevate-experiences', 'Elevate your customer experiences', 59.5],
    ['31-wordmark-end', 'Wordmark: end card', 62.2],
  ]
  const REEL_END = 67.2
  const slotEnd = (file: string) => {
    const i = stills.findIndex(([f]) => f === file)
    if (file === '04-wordmark-architect') return 7.9 // next shot is 05
    if (file === '11-agent-on-call') return 19.1 + 1.9
    return i < stills.length - 1 ? (stills[i + 1][0] === '08-insight-proposed-fix' ? 12.8 : stills[i + 1][2]) : REEL_END
  }
  const still = (file: string, name: string, start: number): Frame => ({
    id: `s${file.slice(0, 2)}`,
    name,
    hold: Math.round((slotEnd(file) - start) * 10) / 10,
    background: '#111111',
    // Covers the 1440×900 frame: the 16:9 still is scaled to the frame's height and trimmed 80px each side.
    layers: [
      { id: `img-${file.slice(0, 2)}`, name: 'Still', kind: 'image', src: `/shots/elevenagents/${file}.jpg`, x: -80, y: 0, w: 1600, h: 900, ...base },
      ...(file.includes('wordmark') ? wordmark(file.slice(0, 2)) : []),
    ],
  })
  const S = Object.fromEntries(stills.map(([f, n, t]) => [f.slice(0, 2), still(f, n, t)]))

  // Shots 5–7: the built screens. Each slot is [start of this shot, start of the next].
  const frames: Frame[] = [
    S['02'], S['03'], S['04'],
    {
      id: 'c2', name: 'Prompt typing close-up', hold: 1.1, background: '#A3B3C6',
      // The wordmark fades out as the gradient washes in from the right; the white panel slides in
      // from the left, then the agent chip fades in and the caret starts blinking.
      layers: [
        { ...rect('panel', 'Background', -2, -2, 1444, 904, GRADIENT), enter: 'slide-right' },
        ...prompt('Why do custom', { f: 2.52, x: 157, y: 140 }).map((l): Layer =>
          ['chip', 'avatar', 'chipText', 'chipX'].includes(l.id) ? { ...l, enter: 'fade', delay: 0.4 } : { ...l, enter: 'slide-left' },
        ),
      ],
    },
    {
      id: 'c3', name: 'Prompt send', hold: 0.7, background: '#F3F0EE',
      layers: [rect('panel', 'Background', 15, 15, 1410, 870, GRADIENT, 14), ...prompt('Why do customers ask to talk to a person?'), ...gatherCard(false), cursor(1039, 471)],
    },
    {
      id: 'c4', name: 'Analysis working', hold: 1.7, background: '#A3A5BE',
      // The orbiting-panels recording, a 16:9 clip filled edge to edge like the stills. The canvas shows the still instead.
      layers: [{ id: 'orbit-clip', name: 'Recording', kind: 'video', src: '/shots/orbiting-agents.mp4', poster: '/shots/orbiting-agents.png', x: -80, y: 0, w: 1600, h: 900, ...base }],
    },
    ...['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'].map((n) => S[n]),
  ]
  const ids = frames.map((f) => f.id)
  const chapter = (id: string, name: string, from: number, to: number) => ({ id, name, label: name, frameIds: ids.slice(from - 1, to) })

  // Stills crossfade into each other everywhere except around the built shots (5–7), which
  // carry their own cuts. Each cut takes its time out of the hold of the shot it leads into,
  // so the reel keeps its length; quick shots get a shorter fade so they still land.
  const cuts: Storyboard['cuts'] = {}
  const built = ['c2', 'c3', 'c4']
  ids.slice(1).forEach((id, i) => {
    if (built.includes(id) || built.includes(ids[i])) return
    const f = frames.find((fr) => fr.id === id)!
    const fade = Math.min(0.5, Math.round(f.hold * 0.6 * 10) / 10)
    cuts[`${ids[i]}->${id}`] = { feel: 'smooth', note: '', animation: 'dissolve', duration: fade * 1000 }
    f.hold = Math.round((f.hold - fade) * 10) / 10
  })
  cuts['c2->c3'] = { feel: 'smooth', note: 'The question types in as the box pulls out', duration: 1000 }
  cuts['c3->c4'] = { feel: 'smooth', bezier: [0.42, 0, 1, 1], note: 'On Send the recording takes over (ease in): the panels orbit in around the card', animation: 'dissolve', duration: 400 }
  // Soft transition into shot 5, as the notes describe; shot 4 gives up the same time.
  cuts['s04->c2'] = { feel: 'smooth', note: 'Wordmark fades as the gradient washes in from the right and a white panel slides in', animation: 'dissolve', duration: 700 }
  frames.find((f) => f.id === 's04')!.hold -= 0.7
  // Soft transition: the dark panels drop away and the card blurs into the insight.
  cuts['c4->s08'] = { feel: 'smooth', note: 'Panels drop away, card gives way to the insight', animation: 'dissolve', duration: 600 }
  frames.find((f) => f.id === 's08')!.hold -= 0.6

  return {
    chapters: [chapter('a1', 'Intro', 1, 3), chapter('a2', 'Demo', 4, 11), chapter('a3', 'Features', 12, 19), chapter('a4', 'Build-up', 20, 28), chapter('a5', 'Outro', 29, 30)],
    frames: Object.fromEntries(frames.map((f) => [f.id, f])),
    cuts,
  }
}
