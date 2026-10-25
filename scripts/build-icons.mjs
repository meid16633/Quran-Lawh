// Renders public/favicon.svg into the PNG icons used by the web manifest, iOS and the Android app.
// Uses the Playwright copy of Chromium: `npx playwright install chromium` if it is missing.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

// Resolved with require so a globally installed Playwright (NODE_PATH) works too.
const { chromium } = createRequire(import.meta.url)('playwright')

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname
const res = (name) => new URL(`../android/app/src/main/res/${name}`, import.meta.url).pathname

// `pad` shrinks the artwork for maskable / adaptive icons, whose edges get cropped.
const icons = [
  { name: 'icon-192.png', size: 192, pad: 0, bg: 'transparent' },
  { name: 'icon-512.png', size: 512, pad: 0, bg: 'transparent' },
  { name: 'icon-maskable-512.png', size: 512, pad: 0.12, bg: '#1f6b52' },
  { name: 'apple-touch-icon.png', size: 180, pad: 0, bg: '#1f6b52', square: true },
]

// Android launcher icons: legacy square + round, and the adaptive-icon foreground (108dp canvas).
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [d, k] of Object.entries(densities)) {
  icons.push(
    { path: res(`mipmap-${d}/ic_launcher.png`), size: 48 * k, pad: 0, bg: 'transparent' },
    { path: res(`mipmap-${d}/ic_launcher_round.png`), size: 48 * k, pad: 0, bg: 'transparent', round: true },
    { path: res(`mipmap-${d}/ic_launcher_foreground.png`), size: 108 * k, pad: 0.2, bg: 'transparent', foreground: true },
  )
}

const browser = await chromium.launch()
const page = await browser.newPage()
for (const icon of icons) {
  let art = svg
  if (icon.square) art = art.replace('rx="112"', 'rx="0"')
  if (icon.foreground) art = art.replace(/<rect[^>]*\/>/, '')
  if (icon.round) art = art.replace('rx="112"', 'rx="256"')
  const inner = icon.size * (1 - icon.pad * 2)
  await page.setViewportSize({ width: icon.size, height: icon.size })
  await page.setContent(
    `<body style="margin:0;background:${icon.bg};display:grid;place-items:center;height:100vh">
       <div style="width:${inner}px;height:${inner}px">${art.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
     </body>`,
  )
  await page.screenshot({ path: icon.path ?? out(icon.name), omitBackground: icon.bg === 'transparent' })
}
await browser.close()
console.log('icons written')
