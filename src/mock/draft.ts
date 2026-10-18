import type { Frame, Layer, Storyboard } from '../types'

// Stand-in for the AI's first draft. Swap for a Claude call that returns this shape.
export function mockDraft(): Storyboard {
  const text = (id: string, name: string, t: string, x: number, y: number, w: number, h: number, fontSize: number, extra: Partial<Layer> = {}): Layer => ({
    id, name, kind: 'text', text: t, x, y, w, h, fontSize, rotation: 0, opacity: 1, color: '#1A1A1A', fontWeight: 400, ...extra,
  })
  const img = (id: string, name: string, src: string, x: number, y: number, w: number, h: number, extra: Partial<Layer> = {}): Layer => ({
    id, name, kind: 'image', src: `/shots/${src}.svg`, x, y, w, h, rotation: 0, opacity: 1, ...extra,
  })
  const screen = (src: string, x: number, y: number, w: number, extra: Partial<Layer> = {}) =>
    img('screen', 'Product screen', src, x, y, w, Math.round(w / 1.6), extra)
  const phone = (x: number, y: number) => img('phone', 'Phone', 'phone', x, y, 490, 1060)
  const caption = (t: string, x: number, y: number, w: number) =>
    text('caption', 'Caption', t, x, y, w, 90, 40, { color: '#ffffff', fill: '#111111', fontWeight: 600 })

  const pink = '#F9C3EE'
  const dark = '#16161A'
  const frames: Frame[] = [
    { id: 'i1', hold: 1.6, background: pink, layers: [text('title', 'Introducing', 'Introducing', 320, 380, 800, 140, 130)] },
    { id: 'i2', hold: 1.8, background: pink, layers: [phone(475, 130)] },

    { id: 'd1', hold: 1.4, background: dark, layers: [screen('dashboard', 120, 80, 1200, { radius: 16, shadow: true })] },
    { id: 'd2', hold: 1.8, background: dark, layers: [screen('dashboard', -380, -533, 2400), caption('See where your focus went', 60, 760, 700)] },
    { id: 'd3', hold: 1.6, background: dark, layers: [screen('dashboard', -960, 0, 2400), caption('Keep the streak alive', 60, 760, 560)] },

    { id: 'f1', hold: 1.6, background: '#FBFAF7', layers: [screen('review', 120, 80, 1200, { radius: 16, shadow: true })] },
    { id: 'f2', hold: 1.8, background: '#FBFAF7', layers: [screen('review', 0, -483, 2400), caption('Wins, collected for you', 720, 760, 620)] },

    { id: 'b1', hold: 1.6, background: pink, layers: [phone(160, 120), text('headline', 'Headline', 'Built for teams', 760, 360, 600, 120, 84, { align: 'left' })] },
    { id: 'b2', hold: 1.8, background: pink, layers: [phone(160, -260), text('headline', 'Headline', 'Shared focus time', 760, 360, 600, 120, 84, { align: 'left' })] },

    { id: 'o1', hold: 1.4, background: dark, layers: [screen('pricing', 120, 80, 1200, { radius: 16, shadow: true })] },
    { id: 'o2', hold: 2.2, background: dark, layers: [
      text('brand', 'Logo', 'Lumen', 320, 300, 800, 200, 170, { color: '#ffffff', fontWeight: 700 }),
      text('cta', 'Call to action', 'Start free at lumen.app', 320, 520, 800, 80, 44, { color: '#9C9CF5', fontWeight: 500 }),
    ] },
  ]

  return {
    acts: [
      { id: 'a1', name: 'Introduction', label: 'Intro', frameIds: ['i1', 'i2'] },
      { id: 'a2', name: 'Demo', label: 'Demo', frameIds: ['d1', 'd2', 'd3'] },
      { id: 'a3', name: 'Features', label: 'Features', frameIds: ['f1', 'f2'] },
      { id: 'a4', name: 'Build', label: 'Build', frameIds: ['b1', 'b2'] },
      { id: 'a5', name: 'Outro', label: 'Outro', frameIds: ['o1', 'o2'] },
    ],
    frames: Object.fromEntries(frames.map((f) => [f.id, f])),
    cuts: {
      'i1->i2': { feel: 'cinematic', note: '' },
      'd2->d3': { feel: 'snappy', note: '' },
      'o1->o2': { feel: 'cinematic', note: '' },
    },
  }
}
