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

/**
 * A hint for the start of a word: its first letter with vowel marks, shaped as it starts the word.
 * The definite article and a leading و / ف carry little meaning, so the letter after them is included too:
 * "بِسۡمِ" -> "بِـ", "ٱلنَّبَإِ" -> "ٱلنَّـ", "وَٱلۡجِبَالَ" -> "وَٱلۡجِـ", "وَمَا" -> "وَمَـ".
 */
export function firstLetter(word: string): string {
  const chars = [...word.replace(/^۞\s*/, '')]
  const isLetter = (c: string) => /[\u0621-\u064A\u0671]/.test(c)
  const letterFrom = (i: number) => chars.findIndex((c, k) => k >= i && isLetter(c))
  // Index just past the letter at i and its vowel marks.
  const marksEnd = (i: number) => {
    let k = i + 1
    while (k < chars.length && COMBINING.test(chars[k])) k++
    return k
  }

  const first = letterFrom(0)
  if (first < 0) return word
  let end = marksEnd(first)
  let letter = chars[first]
  const takeNext = () => {
    const k = letterFrom(end)
    if (k >= 0) {
      end = marksEnd(k)
      letter = chars[k]
    }
  }

  if (letter === 'و' || letter === 'ف') takeNext()
  if (letter === 'ٱ' || letter === 'ا') {
    const lam = letterFrom(end)
    if (lam >= 0 && chars[lam] === 'ل' && letterFrom(marksEnd(lam)) >= 0) {
      end = marksEnd(lam)
      takeNext()
    }
  }
  const joins = letterFrom(end) >= 0 && !NON_JOINING.has(letter)
  return chars.slice(first, end).join('') + (joins ? 'ـ' : '')
}
