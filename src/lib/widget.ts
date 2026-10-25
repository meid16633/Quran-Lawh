import { Capacitor, registerPlugin } from '@capacitor/core'
import { count, pagesWord } from './arabic'
import { ayahOfTheDay } from './daily'
import { dayNumber } from './dates'
import { khatma, wirdMark } from './hifz'
import { type KhatmaPlan, khatmaStatus } from './khatma'
import { arabicDigits, type Quran } from './quran'

/** The Android home-screen widget (android/…/LawhWidget.java), fed by the web app. */
interface LawhWidgetPlugin {
  update(options: { data: string }): Promise<void>
}

const LawhWidget = registerPlugin<LawhWidgetPlugin>('LawhWidget')

export interface WidgetDay {
  day: number
  line: string
  sub: string
  /** Khatma progress, or -1 without a khatma. */
  percent: number
  ayah: string
  ref: string
  ayahIndex: number
}

/** Days written ahead, so the widget changes at midnight even when the app is not opened. */
const DAYS = 21

/** What the widget shows on each of the coming days, given the khatma and wird mark as they are now. */
export function widgetDays(q: Quran, plan: KhatmaPlan | null, mark: { page: number } | null, today: number): WidgetDay[] {
  return Array.from({ length: DAYS }, (_, k) => {
    const day = today + k
    const i = ayahOfTheDay(q, day)
    const s = q.surahs[q.surahOf(i)]
    const ayah = { ayah: `﴿${q.plain[i]}﴾`, ref: `${s.name} • آية ${arabicDigits(q.ayahNo(i))}`, ayahIndex: i }
    if (!plan) {
      const line = mark ? `تابع وردك من صفحة ${arabicDigits(mark.page)}` : 'ابدأ ختمة من شاشة الورد'
      return { day, line, sub: '', percent: -1, ...ayah }
    }
    const st = khatmaStatus(plan, day)
    const percent = st.percent
    if (st.finished) return { day, line: 'ختمت القرآن، تقبّل الله منك', sub: '', percent, ...ayah }
    if (st.doneToday) {
      const next = khatmaStatus(plan, day + 1)
      const sub = `غدًا: من صفحة ${arabicDigits(next.from)} إلى ${arabicDigits(next.to)}`
      return { day, line: 'أتممت ورد اليوم ✓', sub, percent, ...ayah }
    }
    const left = st.to - st.from + 1
    return {
      day,
      line: `باقٍ ${count(left, pagesWord)}`,
      sub: `من صفحة ${arabicDigits(st.from)} إلى ${arabicDigits(st.to)} • ${arabicDigits(percent)}٪ من الختمة`,
      percent,
      ...ayah,
    }
  })
}

export const widgetAvailable = () => Capacitor.getPlatform() === 'android'

/** Sends the coming days to the widget. Harmless when no widget is placed. */
export async function syncWidget(q: Quran): Promise<void> {
  if (!widgetAvailable()) return
  const days = widgetDays(q, khatma.get(), wirdMark.get(), dayNumber())
  await LawhWidget.update({ data: JSON.stringify({ days }) })
}
