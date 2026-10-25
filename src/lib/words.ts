/** Words of an ayah. Waqf marks are attached to their word in the source text, so a space split is exact. */
export function words(text: string): string[] {
  return text.split(' ')
}

/** Key of one word in the whole mushaf: "<ayah index>:<word index>". */
export function wordKey(ayah: number, word: number): string {
  return `${ayah}:${word}`
}

export function parseWordKey(key: string): [number, number] {
  const [a, w] = key.split(':')
  return [Number(a), Number(w)]
}

const COMBINING = /[ؐ-ًؚ-ٰٟۖ-ۭ]/
// Letters that never connect to the following letter, so no tatweel is drawn after them.
const NON_JOINING = new Set([...'اأإآٱدذرزوؤءة'])

/** The opening letter of a word with its vowel marks, shaped as it starts the word: "ٱلۡحَمۡدُ" -> "ٱ", "بِسۡمِ" -> "بِـ". */
export function firstLetter(word: string): string {
  const chars = [...word.replace(/^۞\s*/, '')]
  const start = chars.findIndex((c) => /[ء-يٱ]/.test(c))
  if (start < 0) return word
  let end = start + 1
  while (end < chars.length && COMBINING.test(chars[end])) end++
  const prefix = chars.slice(start, end).join('')
  const hasMore = chars.slice(end).some((c) => /[ء-يٱ]/.test(c))
  return hasMore && !NON_JOINING.has(chars[start]) ? prefix + 'ـ' : prefix
}
