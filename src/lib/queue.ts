/** Where playback is: which ayah, whether the basmala before it is playing, and repeat counters. */
export interface Position {
  i: number
  basmala: boolean
  /** 1-based pass over the current ayah. */
  ayahPass: number
  /** 1-based pass over the whole range. */
  rangePass: number
}

export interface Range {
  from: number
  /** Inclusive. */
  to: number
}

export interface Repeats {
  /** Times each ayah is played; 0 = forever. */
  ayah: number
  /** Times the range is played; 0 = forever. */
  range: number
}

export interface Layout {
  ayahNo(i: number): number
  surahOf(i: number): number
}

/** Surahs open with the basmala except Al-Fatiha (where it is ayah 1) and At-Tawbah. */
export function needsBasmala(i: number, q: Layout): boolean {
  const s = q.surahOf(i)
  return q.ayahNo(i) === 1 && s !== 0 && s !== 8
}

export function startAt(i: number, q: Layout, rangePass = 1): Position {
  return { i, basmala: needsBasmala(i, q), ayahPass: 1, rangePass }
}

export function nextPosition(pos: Position, range: Range, repeats: Repeats, q: Layout): Position | null {
  if (pos.basmala) return { ...pos, basmala: false }
  if (repeats.ayah === 0 || pos.ayahPass < repeats.ayah) return { ...pos, ayahPass: pos.ayahPass + 1 }
  if (pos.i < range.to) return startAt(pos.i + 1, q, pos.rangePass)
  if (repeats.range === 0 || pos.rangePass < repeats.range) return startAt(range.from, q, pos.rangePass + 1)
  return null
}
