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
