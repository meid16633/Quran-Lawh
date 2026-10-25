import { arabicDigits } from './quran'

interface Forms {
  one: string
  two: string
  /** 3–10 */
  few: string
  /** 11 and up */
  many: string
}

/** Arabic counted noun: ١ صفحة واحدة، صفحتان، ٣ صفحات، ١١ صفحة. */
export function count(n: number, forms: Forms): string {
  if (n === 1) return forms.one
  if (n === 2) return forms.two
  const mod = n % 100
  return `${arabicDigits(n)} ${mod >= 3 && mod <= 10 ? forms.few : forms.many}`
}

export const pagesWord: Forms = { one: 'صفحة واحدة', two: 'صفحتان', few: 'صفحات', many: 'صفحة' }
export const daysWord: Forms = { one: 'يوم واحد', two: 'يومان', few: 'أيام', many: 'يومًا' }
export const mistakesWord: Forms = { one: 'خطأ واحد', two: 'خطآن', few: 'أخطاء', many: 'خطأً' }
