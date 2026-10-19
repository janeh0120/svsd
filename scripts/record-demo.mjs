// Record real screen recordings of the running editor for the demo reel.
// Each flow drives the app like a person would (visible cursor, typing, clicks)
// and is saved as public/recordings/<name>.mp4, trimmed to where the action starts.
//
// Usage: npm run dev (port 5174), then: node scripts/record-demo.mjs [flow…]
import { chromium } from 'playwright'
import ffmpeg from 'ffmpeg-static'
import { execFileSync } from 'node:child_process'
import { mkdir, rename, rm } from 'node:fs/promises'

const BASE = process.env.BASE ?? 'http://localhost:5174'
const OUT = 'public/recordings'
const SIZE = { width: 1440, height: 900 }
const PROMPT = 'figma.com/config, 60s launch reel: intro, Sites, Make, Draw, Buzz, end on the logo.'

// Headless recordings have no mouse pointer, so draw one, with a ripple on click.
const CURSOR = `(() => {
  const add = () => {
    if (document.getElementById('__cursor')) return
    const c = document.createElement('div')
    c.id = '__cursor'
    c.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 3l6.5 17 2.4-7.1L21 10.5z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    Object.assign(c.style, { position: 'fixed', left: '-40px', top: '-40px', zIndex: 2147483647, pointerEvents: 'none', transform: 'translate(-4px,-2px)' })
    document.body.appendChild(c)
    addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px' }, true)
    addEventListener('mousedown', (e) => {
      const r = document.createElement('div')
      Object.assign(r.style, { position: 'fixed', left: e.clientX - 14 + 'px', top: e.clientY - 14 + 'px', width: '28px', height: '28px', borderRadius: '50%',
        background: 'rgba(13,153,255,.35)', pointerEvents: 'none', zIndex: 2147483646, transition: 'transform .45s ease-out, opacity .45s ease-out' })
      document.body.appendChild(r)
      requestAnimationFrame(() => { r.style.transform = 'scale(1.9)'; r.style.opacity = '0' })
      setTimeout(() => r.remove(), 500)
    }, true)
  }
  if (document.body) add(); else addEventListener('DOMContentLoaded', add)
})()`

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// Glide the cursor to an element (or a point inside it), then optionally click.
async function moveTo(page, target, { dx = 0.5, dy = 0.5, steps = 28 } = {}) {
  const box = await target.boundingBox()
  if (!box) throw new Error('target not visible')
  const x = box.x + box.width * dx
  const y = box.y + box.height * dy
  await page.mouse.move(x, y, { steps })
  return { x, y }
}
async function clickOn(page, target, opts) {
  await moveTo(page, target, opts)
  await wait(150)
  await page.mouse.down()
  await page.mouse.up()
}
async function dragBy(page, target, dx, dy, opts) {
  const { x, y } = await moveTo(page, target, opts)
  await wait(200)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 40 })
  await wait(150)
  await page.mouse.up()
}

// Shared setup: send the prompt and wait for the drafted storyboard.
async function draft(page, { slow = false } = {}) {
  const input = page.locator('aside textarea').first()
  if (slow) await clickOn(page, input)
  else await input.click()
  await page.keyboard.type(PROMPT, { delay: slow ? 38 : 0 })
  await wait(slow ? 500 : 0)
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: /Yes, continue/ }).waitFor({ timeout: 30000 })
}
async function approve(page, { slow = false } = {}) {
  const yes = page.getByRole('button', { name: /Yes, continue/ })
  if (slow) await clickOn(page, yes)
  else await yes.click()
  await page.getByText(/The animated reel is ready/).waitFor({ timeout: 30000 })
}

const FLOWS = {
  // Empty editor → type the prompt → agent drafts the storyboard → approval question.
  async '01-prompt-and-draft'(page, mark) {
    await wait(800)
    mark()
    await wait(1200)
    await draft(page, { slow: true })
    await wait(600)
    await moveTo(page, page.getByRole('button', { name: /Yes, continue/ }))
    await wait(1800)
  },

  // Approve → recording and animating steps → play the preview.
  async '02-approve-and-animate'(page, mark) {
    await draft(page)
    await wait(500)
    mark()
    await wait(800)
    await approve(page, { slow: true })
    await wait(800)
    await clickOn(page, page.locator('aside').nth(1).getByTitle('Play'))
    await wait(7000)
  },

  // Annotate: tooltip → comment on the Figma Make title → it grows → comment on a moment.
  async '03-point-and-tweak'(page, mark) {
    await draft(page)
    await approve(page)
    const title = page.locator('#frame-m1').getByText('Figma Make')
    await title.scrollIntoViewIfNeeded()
    await wait(800)
    mark()
    await wait(600)
    const annotate = page.getByRole('button', { name: 'Select an element or annotate' })
    await moveTo(page, annotate)
    await wait(1800)
    await clickOn(page, annotate)
    await wait(500)
    await moveTo(page, title)
    await wait(700)
    await clickOn(page, title)
    await wait(500)
    await page.keyboard.type('make it bigger', { delay: 60 })
    await wait(400)
    await clickOn(page, page.getByTitle('Send to the agent'))
    await wait(2600)
    // A moment in time: click the ruler around 0:22.
    const ruler = page.locator('#timeline .cursor-crosshair').first()
    await clickOn(page, ruler, { dx: 0.29, dy: 0.5 })
    await wait(500)
    await page.keyboard.type('this drags, make it snappy', { delay: 55 })
    await wait(400)
    await clickOn(page, page.getByTitle('Send to the agent'))
    await wait(2600)
  },

  // By hand: shape a cut's curve, frame the camera, trim a clip.
  async '04-fine-tune'(page, mark) {
    await draft(page)
    await approve(page)
    const cut = page.locator('[id="cut-s4->s5"]')
    await cut.scrollIntoViewIfNeeded()
    await wait(800)
    mark()
    await wait(500)
    await clickOn(page, cut)
    await wait(1200)
    const side = page.locator('aside').nth(1)
    await dragBy(page, side.locator('svg circle').first(), 34, -46)
    await wait(1800)
    // Frame 5 (the breakpoints screen) from the timeline, then its camera box.
    await clickOn(page, page.locator('#timeline button[title^="Frame 5 "]'))
    await wait(1200)
    const corner = side.locator('.cursor-nwse-resize').last()
    await corner.scrollIntoViewIfNeeded()
    await wait(400)
    await dragBy(page, corner, -70, -40)
    await wait(1800)
    // Trim frame 4's hold by dragging its right edge.
    const clip = page.locator('#timeline button[title^="Frame 4 "]')
    await moveTo(page, clip)
    await wait(600)
    await dragBy(page, clip.getByTitle('Drag to change how long this frame holds'), 90, 0)
    await wait(1800)
  },
}

async function record(browser, name, flow) {
  const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: `${OUT}/raw`, size: SIZE } })
  await context.addInitScript(CURSOR)
  const page = await context.newPage()
  const t0 = Date.now()
  let start = 0
  const mark = () => (start = (Date.now() - t0) / 1000)
  await page.goto(BASE)
  await flow(page, mark)
  const video = page.video()
  await context.close()
  const raw = `${OUT}/raw/${name}.webm`
  await rename(await video.path(), raw)
  // Trim to the marked start and encode as MP4 for editing tools.
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', start.toFixed(2), '-i', raw, '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', `${OUT}/${name}.mp4`])
  console.log(`✓ ${name}.mp4 (from ${start.toFixed(1)}s of the raw take)`)
}

const only = process.argv.slice(2)
await mkdir(`${OUT}/raw`, { recursive: true })
const browser = await chromium.launch()
try {
  for (const [name, flow] of Object.entries(FLOWS)) {
    if (only.length && !only.some((o) => name.includes(o))) continue
    await record(browser, name, flow)
  }
} finally {
  await browser.close()
}
await rm(`${OUT}/raw`, { recursive: true, force: true })
