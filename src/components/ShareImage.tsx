import { useEffect, useRef, useState } from 'react'
import { CARD_THEMES, type CardTheme, drawAyahCard, shareCanvas } from '../lib/ayahImage'
import { useQuran } from '../lib/context'
import { arabicDigits } from '../lib/quran'
import { createStore, useStore } from '../lib/store'
import { verseOnly } from '../lib/words'
import { Sheet } from './Sheet'

const cardTheme = createStore<{ theme: CardTheme }>('lawh:card', { theme: 'green' })

/** Preview and share an ayah as an image card. */
export function ShareImage({ index, onClose }: { index: number; onClose: () => void }) {
  const q = useQuran()
  const { theme } = useStore(cardTheme)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const surah = q.surahs[q.surahOf(index)]
  const reference = `سورة ${surah.name} • الآية ${arabicDigits(q.ayahNo(index))}`

  useEffect(() => {
    if (canvas.current) void drawAyahCard(canvas.current, `${verseOnly(q.text[index])}\u00A0${arabicDigits(q.ayahNo(index))}`, reference, theme)
  }, [q, index, reference, theme])

  return (
    <Sheet title="مشاركة الآية كصورة" onClose={onClose}>
      <canvas ref={canvas} className="card-preview" aria-label={`صورة ${reference}`} />
      <div className="chips">
        {(Object.keys(CARD_THEMES) as CardTheme[]).map((t) => (
          <button key={t} className="chip" aria-pressed={theme === t} onClick={() => cardTheme.set({ theme: t })}>
            <i className="swatch" style={{ background: CARD_THEMES[t].bg[0], borderColor: CARD_THEMES[t].frame }} />
            {CARD_THEMES[t].label}
          </button>
        ))}
      </div>
      <button
        className="button wide"
        onClick={async () => {
          if (!canvas.current) return
          try {
            const result = await shareCanvas(canvas.current, `lawh-${q.surahOf(index) + 1}-${q.ayahNo(index)}.png`)
            setStatus(result === 'downloaded' ? 'حُفظت الصورة' : null)
          } catch {
            setStatus('تعذّر إنشاء الصورة')
          }
        }}
      >
        مشاركة الصورة
      </button>
      {status && <p className="muted center">{status}</p>}
    </Sheet>
  )
}
