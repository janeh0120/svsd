import type { Frame, Layer, Storyboard } from '../types'

// Example draft: a storyboard modeled on Figma's
// "All the launches at Config 2025" reel (youtube.com/watch?v=NHodnYFUT_I).
// Its screens are recreations drawn for this prototype, not frames from the video.

export function figmaConfigDraft(): Storyboard {
  const text = (id: string, name: string, t: string, x: number, y: number, w: number, h: number, fontSize: number, extra: Partial<Layer> = {}): Layer => ({
    id, name, kind: 'text', text: t, x, y, w, h, fontSize, rotation: 0, opacity: 1, color: '#ffffff', fontWeight: 500, ...extra,
  })
  const rect = (id: string, name: string, x: number, y: number, w: number, h: number, extra: Partial<Layer> = {}): Layer => ({
    id, name, kind: 'rect', x, y, w, h, rotation: 0, opacity: 1, ...extra,
  })
  // Full-bleed product screen; a bigger width with negative offsets zooms into part of it.
  const screen = (src: string, x = 0, y = 0, w = 1440, extra: Partial<Layer> = {}): Layer => ({
    id: 'screen', name: 'Product screen', kind: 'image', src: `/shots/${src}.svg`, x, y, w, h: Math.round(w / 1.6), rotation: 0, opacity: 1, ...extra,
  })
  // Big centered product name, as on the video's title cards.
  const title = (t: string, color = '#ffffff', extra: Partial<Layer> = {}) => text('title', 'Title', t, 170, 360, 1100, 180, 150, { color, ...extra })

  // "Figma" with selection handles, as if being typed on the canvas.
  const selection = (w: number) => {
    const x = 720 - w / 2
    const handle = (id: string, hx: number, hy: number) => rect(id, 'Handle', hx - 12, hy - 12, 24, 24, { fill: '#8B7CF6' })
    return [
      rect('sel', 'Selection', x, 340, w, 220, { stroke: '#8B7CF6' }),
      handle('h1', x, 340),
      handle('h2', x + w, 340),
      handle('h3', x, 560),
      handle('h4', x + w, 560),
    ]
  }

  // The Figma mark from five shapes; `u` is the size of one cell.
  const logo = (u: number) => {
    const x0 = 720 - u
    const y0 = 450 - (u * 3) / 2
    const cell = (id: string, name: string, col: number, row: number, fill: string, round = u * 0.36) =>
      rect(id, name, x0 + col * u, y0 + row * u, u, u, { fill, radius: round })
    return [
      cell('lg-r', 'Logo red', 0, 0, '#F24E1E'),
      cell('lg-o', 'Logo orange', 1, 0, '#FF7262'),
      cell('lg-p', 'Logo purple', 0, 1, '#A259FF'),
      cell('lg-b', 'Logo blue', 1, 1, '#1ABCFE', u / 2),
      cell('lg-g', 'Logo green', 0, 2, '#0ACF83'),
    ]
  }

  const black = '#0B0B0B'
  const frames: Frame[] = [
    // Intro
    { id: 'i1', hold: 1.4, background: '#7A1E1E', layers: [...selection(420), text('word', 'Wordmark', 'Figm', 524, 360, 420, 180, 170, { align: 'left' })] },
    { id: 'i2', hold: 1.6, background: '#7A1E1E', layers: [...selection(510), text('word', 'Wordmark', 'Figma', 479, 360, 510, 180, 170, { align: 'left' })] },

    // Figma Sites
    { id: 's1', hold: 1.6, background: black, layers: [title('Figma Sites')] },
    { id: 's2', hold: 3.5, background: '#111111', layers: [screen('sites-browse')] },
    { id: 's3', hold: 3.5, background: '#2E7D4F', layers: [screen('sites-breakpoints')] },
    { id: 's4', hold: 3, background: '#2E7D4F', layers: [screen('sites-breakpoints', -1107, -378, 2592)] },
    { id: 's5', hold: 3.5, background: '#4A2D48', layers: [screen('sites-hero')] },

    // Figma Make
    { id: 'm1', hold: 1.6, background: black, layers: [title('Figma Make', '#FF5CD9')] },
    { id: 'm2', hold: 3.5, background: '#8E837B', layers: [screen('make-prompt')] },
    {
      id: 'm3', hold: 2.2, background: black, layers: [
        text('thinking', 'Thinking', 'Thinking…', 420, 360, 760, 180, 130, { align: 'left', fontWeight: 400 }),
        text('spark', 'Spark', '✳', 290, 370, 140, 160, 130, { fontWeight: 400 }),
        rect('px1', 'Pixel', 1100, 640, 90, 90, { fill: '#B8E6FF' }),
        rect('px2', 'Pixel', 1190, 550, 90, 90, { fill: '#9AE07A' }),
        rect('px3', 'Pixel', 1190, 640, 90, 90, { fill: '#D7C4F0' }),
        rect('px4', 'Pixel', 1280, 640, 90, 90, { fill: '#F4F4F4' }),
      ],
    },
    { id: 'm4', hold: 3.5, background: '#FAFAF8', layers: [screen('make-gallery')] },

    // Figma Draw
    { id: 'd1', hold: 1.6, background: black, layers: [title('Figma Draw'), rect('squiggle', 'Underline', 520, 560, 420, 10, { fill: '#E8C04A', radius: 5, rotation: -2 })] },
    { id: 'd2', hold: 3, background: '#F1E3C6', layers: [screen('draw-dog')] },
    { id: 'd3', hold: 3, background: '#F8C9B8', layers: [screen('draw-type')] },
    { id: 'd4', hold: 3, background: '#ECF7B5', layers: [screen('draw-vector')] },
    { id: 'd5', hold: 3.5, background: '#5A2E1E', layers: [screen('draw-poster')] },

    // Figma Buzz
    { id: 'b1', hold: 1.6, background: black, layers: [title('Figma Buzz', '#FF4DD8'), rect('box', 'Frame', 150, 330, 1140, 240, { stroke: '#FF4DD8' })] },
    { id: 'b2', hold: 3.5, background: '#C988D9', layers: [screen('buzz-template')] },
    { id: 'b3', hold: 3, background: '#ffffff', layers: [screen('buzz-table')] },
    { id: 'b4', hold: 3.5, background: '#ECECEC', layers: [screen('buzz-grid')] },

    // Outro
    { id: 'o1', hold: 2.5, background: '#F3D9E6', layers: logo(130) },
    { id: 'o2', hold: 3, background: black, layers: logo(70) },
  ]

  return {
    acts: [
      { id: 'a1', name: 'Intro', label: 'Intro', frameIds: ['i1', 'i2'] },
      { id: 'a2', name: 'Figma Sites', label: 'Sites', frameIds: ['s1', 's2', 's3', 's4', 's5'] },
      { id: 'a3', name: 'Figma Make', label: 'Make', frameIds: ['m1', 'm2', 'm3', 'm4'] },
      { id: 'a4', name: 'Figma Draw', label: 'Draw', frameIds: ['d1', 'd2', 'd3', 'd4', 'd5'] },
      { id: 'a5', name: 'Figma Buzz', label: 'Buzz', frameIds: ['b1', 'b2', 'b3', 'b4'] },
      { id: 'a6', name: 'Outro', label: 'Outro', frameIds: ['o1', 'o2'] },
    ],
    frames: Object.fromEntries(frames.map((f) => [f.id, f])),
    cuts: {
      'i1->i2': { feel: 'snappy', note: 'Type the last letter' },
      'i2->s1': { feel: 'snappy', note: '' },
      's3->s4': { feel: 'smooth', note: 'Push in on the tablet breakpoint' },
      's5->m1': { feel: 'snappy', note: '' },
      'm2->m3': { feel: 'snappy', note: '' },
      'm4->d1': { feel: 'snappy', note: '' },
      'd5->b1': { feel: 'snappy', note: '' },
      'b4->o1': { feel: 'smooth', note: '' },
      'o1->o2': { feel: 'cinematic', note: 'Logo settles small on black' },
    },
  }
}
