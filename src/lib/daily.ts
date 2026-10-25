import type { Quran } from './quran'

let candidates: number[] | null = null

/** A different, reasonably short ayah for each day; the same for everyone on that day. */
export function ayahOfTheDay(q: Quran, day: number): number {
  candidates ??= q.text.flatMap((t, i) => {
    const n = t.split(' ').length
    return n >= 6 && n <= 28 ? [i] : []
  })
  // Knuth multiplicative hash spreads consecutive days across the mushaf.
  return candidates[(Math.imul(day, 2654435761) >>> 0) % candidates.length]
}
