const DAY = 86_400_000

/** Whole days since 1970-01-01 in the device's local time zone. */
export function dayNumber(date = new Date()): number {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / DAY)
}

/** Consecutive active days ending today, or yesterday if today has no activity yet. */
export function streak(activeDays: Iterable<number>, today: number): number {
  const days = new Set(activeDays)
  let day = days.has(today) ? today : today - 1
  let count = 0
  while (days.has(day)) {
    count++
    day--
  }
  return count
}

/** The local calendar date of a day number. */
export function dateOfDay(day: number): Date {
  const utc = new Date(day * DAY)
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}

/** "الخميس ١٤ مايو ٢٠٢٧" and its Hijri date, when the device supports the Umm al-Qura calendar. */
export function formatDay(day: number): { gregorian: string; hijri: string | null } {
  const date = dateOfDay(day)
  const gregorian = date.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  let hijri: string | null = null
  try {
    hijri = date.toLocaleDateString('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    // calendar not supported
  }
  return { gregorian, hijri }
}
