import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ayahOfTheDay } from './daily'
import { Quran, type QuranData } from './quran'
import { widgetDays } from './widget'

const q = new Quran(JSON.parse(readFileSync(new URL('../../public/data/quran.json', import.meta.url), 'utf8')) as QuranData)
const today = 20_000

describe('widget days', () => {
  it('shows the ayah of each day', () => {
    const days = widgetDays(q, null, null, today)
    expect(days).toHaveLength(21)
    expect(days[3].day).toBe(today + 3)
    expect(days[3].ayahIndex).toBe(ayahOfTheDay(q, today + 3))
    expect(days[0].line).toBe('ابدأ ختمة من شاشة الورد')
    expect(days[0].percent).toBe(-1)
    expect(widgetDays(q, null, { page: 50 }, today)[0].line).toBe('تابع وردك من صفحة ٥٠')
  })

  it("follows today's portion of the khatma as the days pass", () => {
    const plan = { start: today, pagesPerDay: 3, from: 1, progress: 0 }
    const days = widgetDays(q, plan, null, today)
    expect(days[0].line).toBe('باقٍ ٣ صفحات')
    expect(days[0].sub).toContain('من صفحة ١ إلى ٣')
    // Not opened for two days: the portion grows.
    expect(days[2].line).toBe('باقٍ ٩ صفحات')
    const done = widgetDays(q, { ...plan, progress: 3 }, null, today)
    expect(done[0].line).toBe('أتممت ورد اليوم ✓')
    expect(done[0].sub).toBe('غدًا: من صفحة ٤ إلى ٦')
    expect(widgetDays(q, { ...plan, progress: 604 }, null, today)[0].line).toBe('ختمت القرآن، تقبّل الله منك')
  })
})
