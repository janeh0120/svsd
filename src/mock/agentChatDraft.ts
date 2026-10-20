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

  // Shot 7: four panels over a lilac gradient. A dark flow graph (top left), the call
  // transcript (right), the system tools list (bottom left) and the white "Gathering
  // data" card in the middle, which shot 6 holds invisible so it fades in on Send.
  const dark = '#141418'
  const pill = (id: string, name: string, t: string, x: number, y: number, size = 11, color = '#E4E4E8'): Layer =>
    text(id, name, t, x, y, Math.round(t.length * size * 0.62 + size * 1.6), Math.round(size * 1.7), size, color, { fill: '#2B2B31', fontWeight: 500 })
  const node = (key: string, title: string, x: number, y: number, w: number, h: number, stats: string[], footer: string): Layer[] => [
    rect(`${key}-card`, `${title} node`, x, y, w, h, '#1D1D22', 9),
    text(`${key}-title`, `${title} title`, title, x + 32, y + 8, w - 40, 24, 15, '#ECECEE', { fontWeight: 500 }),
    ...stats.map((t, i) => pill(`${key}-stat${i}`, `${title} stat ${i + 1}`, t, x + 10 + i * (i === 0 ? 0 : 64) + (i === 2 ? -10 : 0), y + 34)),
    text(`${key}-foot`, `${title} footer`, footer, x + 10, y + h - 24, w - 20, 18, 11, '#8F8F97'),
  ]
  const analysis = (): Layer[] => [
    rect('flow', 'Flow panel', 0, 0, 643, 335, '#0E0E11'),
    text('flow-top', 'Intent stat', '96.4%  Greet & Identity intent', 90, 0, 220, 22, 11, '#D8D8DC', { fill: '#2B2B31', fontWeight: 500 }),
    ...node('verify', 'Verify Identity', 41, 60, 187, 85, ['81.0% →', '1s', '62.0 %'], '124 conversations'),
    ...node('transfer', 'Transfer to number', 414, 151, 180, 84, ['98.0% →', '1s', '19.2 %'], '36 conversations'),
    ...node('order', 'Check order status', 43, 208, 188, 88, ['97.2% →', '1s', '48.0 %'], '96 conversations'),
    pill('edge-failed', 'Lookup failed', '19.0%  Lookup failed', 273, 132, 11, '#D8D8DC'),
    pill('edge-escalate', 'Escalate', '2.8%  Escalate', 274, 218, 11, '#D8D8DC'),

    rect('chat', 'Transcript panel', 883, 137, 570, 460, '#1A1A1E', 12),
    rect('chat-a1', 'Agent avatar', 917, 177, 34, 34, 'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #8F9BD6 40%, #3E3A78 100%)', 17),
    pill('chat-prod1', 'PROD tag', 'PROD', 966, 188, 11, '#C9C9CF'),
    text('chat-n1', 'Agent name', 'Customer Support Agent', 1030, 184, 240, 24, 14, '#D8D8DC', { fontWeight: 500 }),
    text('chat-l1', 'Agent message', 'Thanks, Maria. To pull up your refund I just need to verify the account. Could you', 966, 212, 620, 22, 14, '#F0F0F2'),
    text('chat-l2', 'Agent message, line 2', 'confirm the phone number you signed up with?', 966, 232, 620, 22, 14, '#F0F0F2'),
    text('chat-m1', 'Timing', '0:42    LLM 204 ms ⌄    TTS 191 ms ⌄    RAG 166 ms ⌄    Version ⌄', 966, 262, 560, 20, 12, '#8A8A92'),
    rect('chat-a2', 'Caller avatar', 917, 318, 34, 34, '#3A3A40', 17),
    text('chat-n2', 'Caller name', 'Caller', 966, 321, 120, 24, 14, '#D8D8DC', { fontWeight: 500 }),
    text('chat-c1', 'Caller message', "I'm calling from my work phone and I don't remember which number is on the", 966, 346, 620, 22, 14, '#F0F0F2'),
    text('chat-c2', 'Caller message, line 2', 'account. Can I just talk to a person?', 966, 366, 620, 22, 14, '#F0F0F2'),
    text('chat-m2', 'Timing', '0:55    ASR 44 ms    • +0.00', 966, 396, 400, 20, 12, '#8A8A92'),
    rect('chat-a3', 'Agent avatar', 917, 453, 34, 34, 'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #8F9BD6 40%, #3E3A78 100%)', 17),
    pill('chat-prod3', 'PROD tag', 'PROD', 966, 464, 11, '#C9C9CF'),
    text('chat-n3', 'Agent name', 'Customer Support Agent', 1030, 460, 240, 24, 14, '#D8D8DC', { fontWeight: 500 }),
    text('chat-l3', 'Agent message', 'Of course. One moment while I connect you with a member of our team who', 966, 487, 620, 22, 14, '#F0F0F2'),
    text('chat-l4', 'Agent message, line 2', 'hel', 966, 507, 620, 22, 14, '#F0F0F2'),
    text('chat-m3', 'Timing', '1:02    LLM 184 ms ⌄    TTS 152 ms ⌄    Tool transfer_to_number', 966, 537, 560, 20, 12, '#8A8A92'),

    rect('tools', 'System tools panel', 90, 433, 510, 480, dark, 12),
    text('tools-title', 'System tools title', 'System tools', 106, 440, 260, 36, 27, '#F2F2F4'),
    text('tools-count', 'Active tools', '2 active tools', 118, 492, 200, 24, 15, '#E4E4E6', { fontWeight: 500 }),
    ...(
      [
        ['Transfer to number', true],
        ['Transfer to agent', false],
        ['Transfer to Genesys (voice)', false],
        ['Detect Language', false],
        ['Detect voicemail', false],
      ] as const
    ).flatMap(([label, on], i): Layer[] => {
      const y = 540 + i * 53
      return [
        rect(`tool${i}-track`, `${label} toggle`, 120, y + 8, 38, 22, on ? '#6B6B74' : '#2A2A2F', 11),
        rect(`tool${i}-knob`, `${label} knob`, on ? 138 : 122, y + 10, 18, 18, on ? '#FFFFFF' : '#4A4A50', 9),
        text(`tool${i}-label`, label, label, 173, y + 4, 300, 30, 17, '#E4E4E6'),
        ...(i < 2 ? [text(`tool${i}-gear`, `${label} settings`, '⚙', 543, y + 4, 30, 30, 17, '#8A8A90', { align: 'center' as const })] : []),
      ]
    }),
  ]
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

  // Shot 7 arrives in beats after the hard cut: the white card is already there, then the flow
  // graph, transcript and system tools pop in around it, then the card ticks through its
  // three steps one at a time.
  const staged = (layers: Layer[]): Layer[] =>
    layers.map((l) => {
      const row = l.id.match(/^g-(?:check|tick|row)(\d)$/)
      if (row) return { ...l, delay: 0.6 + 0.35 * Number(row[1]) }
      if (l.id.startsWith('g-')) return l
      const delay = l.id.startsWith('chat') ? 0.3 : l.id.startsWith('tool') ? 0.45 : 0.15
      return { ...l, enter: 'grow', delay }
    })

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
    { id: 'c4', name: 'Analysis working', hold: 1.6, background: 'linear-gradient(135deg, #B5B7C8 0%, #A3A5BE 45%, #7E79A8 100%)', layers: staged([...analysis(), ...gatherCard(true)]) },
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
  cuts['c3->c4'] = { feel: 'snappy', note: 'Hard cut on Send: the card is there, the panels pop in around it, the steps tick', duration: 500 }
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
