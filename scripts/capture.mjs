// Capture screenshots of a live site for the storyboard.
// Usage: npx playwright install chromium && npm run capture -- https://your-site.com
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const url = process.argv[2]
if (!url) {
  console.error('Usage: npm run capture -- <url>')
  process.exit(1)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle' })
await mkdir('public/shots', { recursive: true })

const height = await page.evaluate(() => document.body.scrollHeight)
const count = Math.min(8, Math.ceil(height / 900))
for (let i = 0; i < count; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), i * 900)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `public/shots/shot-${i + 1}.png` })
}
await browser.close()
console.log(`Saved ${count} shots to public/shots/`)
