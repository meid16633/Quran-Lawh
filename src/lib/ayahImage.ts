export type CardTheme = 'paper' | 'green' | 'night' | 'sky'

interface Palette {
  bg: [string, string]
  frame: string
  text: string
  muted: string
}

export const CARD_THEMES: Record<CardTheme, Palette & { label: string }> = {
  paper: { label: 'ورقي', bg: ['#fbf7ee', '#f1e6cc'], frame: '#b08a3e', text: '#2a2418', muted: '#7a6a50' },
  green: { label: 'أخضر', bg: ['#1f6b52', '#123f31'], frame: '#e3c77f', text: '#fdf8ec', muted: '#cfe3d9' },
  night: { label: 'ليلي', bg: ['#1b1a15', '#0e0d0a'], frame: '#c9a55a', text: '#ece5d3', muted: '#a59c88' },
  sky: { label: 'سماوي', bg: ['#eaf3f6', '#cfe2ea'], frame: '#2b6f8a', text: '#123542', muted: '#4d7484' },
}

export const CARD_SIZE = { width: 1080, height: 1350 }

/** Splits words into lines no wider than `width`, keeping the words in reading order. */
export function wrapWords(words: string[], width: number, measure: (s: string) => number): string[] {
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (line && measure(next) > width) {
      lines.push(line)
      line = w
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * Draws an ayah card: the verse in the Hafs font, sized to fit, inside a double frame,
 * with its reference and the app name. `text` should already end with the ayah number.
 */
export async function drawAyahCard(canvas: HTMLCanvasElement, text: string, reference: string, theme: CardTheme) {
  const { width: W, height: H } = CARD_SIZE
  const p = CARD_THEMES[theme]
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  await document.fonts.load('48px Hafs', text)

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, p.bg[0])
  bg.addColorStop(1, p.bg[1])
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = p.frame
  ctx.lineWidth = 6
  roundRect(ctx, 48, 48, W - 96, H - 96, 36)
  ctx.stroke()
  ctx.lineWidth = 2
  roundRect(ctx, 66, 66, W - 132, H - 132, 26)
  ctx.stroke()

  // Small ornaments on the frame.
  ctx.fillStyle = p.frame
  for (const [x, y] of [
    [W / 2, 48],
    [W / 2, H - 48],
  ]) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.PI / 4)
    ctx.fillRect(-12, -12, 24, 24)
    ctx.restore()
  }

  ctx.direction = 'rtl'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const area = { top: 150, bottom: 1110, width: 860 }
  const words = text.split(' ')
  let size = 76
  let lines: string[] = []
  for (; size >= 22; size -= 2) {
    ctx.font = `${size}px Hafs`
    lines = wrapWords(words, area.width, (s) => ctx.measureText(s).width)
    if (lines.length * size * 2 <= area.bottom - area.top) break
  }
  const lineHeight = size * 2
  const top = area.top + (area.bottom - area.top - lines.length * lineHeight) / 2 + lineHeight / 2
  ctx.fillStyle = p.text
  lines.forEach((line, k) => ctx.fillText(line, W / 2, top + k * lineHeight))

  ctx.fillStyle = p.muted
  ctx.font = '600 38px system-ui, -apple-system, "Segoe UI", "Noto Sans Arabic", Tahoma, sans-serif'
  ctx.fillText(reference, W / 2, 1180)
  ctx.font = '40px Hafs'
  ctx.fillStyle = p.frame
  ctx.fillText('لَوْح', W / 2, 1240)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Shares the canvas as a PNG where the system share sheet supports files, otherwise downloads it. */
export async function shareCanvas(canvas: HTMLCanvasElement, fileName: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('could not create image')
  const file = new File([blob], fileName, { type: 'image/png' })
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] })
      return 'shared'
    }
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return 'cancelled'
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  return 'downloaded'
}
