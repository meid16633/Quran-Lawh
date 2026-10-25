import type { Quran } from './quran'
import { normalize } from './search'
import { type SimilarData, sharedWords } from './study'
import { words } from './words'

export type QuestionKind = 'next' | 'surah' | 'word'

export interface Question {
  kind: QuestionKind
  /** The ayah the question is about. */
  ayah: number
  /** For 'word': index of the hidden word in the ayah. */
  hidden?: number
  options: string[]
  answer: number
}

export type Rng = () => number

/** A small seeded PRNG (mulberry32), so a quiz can be replayed and tested. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Up to `n` distinct values from `candidates` (in priority order) that are not `exclude`. */
function pick<T>(candidates: T[], exclude: Set<T>, n: number): T[] {
  const out: T[] = []
  for (const c of candidates) {
    if (out.length === n) break
    if (!exclude.has(c)) {
      exclude.add(c)
      out.push(c)
    }
  }
  return out
}

function withOptions(kind: QuestionKind, ayah: number, correct: string, distractors: string[], rng: Rng, hidden?: number): Question | null {
  if (distractors.length < 3) return null
  const options = shuffle([correct, ...distractors.slice(0, 3)], rng)
  return { kind, ayah, hidden, options, answer: options.indexOf(correct) }
}

const similarTo = (similar: SimilarData, i: number) => (similar[i] ?? []).map(([j]) => j)

/** "What comes after this ayah?" Distractors are ayahs similar to the right one, then nearby ayahs. */
export function nextQuestion(q: Quran, similar: SimilarData, ayah: number, rng: Rng): Question | null {
  const s = q.surahOf(ayah)
  if (q.ayahNo(ayah) === q.surahs[s].ayahs) return null
  const next = ayah + 1
  const nearby = shuffle(
    [-3, -2, -1, 2, 3, 4, 5].map((d) => ayah + d).filter((j) => j >= 0 && j < q.text.length),
    rng,
  )
  const pool = [...similarTo(similar, next), ...similarTo(similar, ayah).map((j) => j + 1), ...nearby]
  const chosen = pick(pool, new Set([ayah, next]), 3)
  const text = (i: number) => q.text[i]
  // Two different ayahs can read the same (e.g. 55:13 and 55:16); keep options distinct as text.
  const distinct = chosen.filter((j) => normalize(text(j)) !== normalize(text(next)))
  return withOptions('next', ayah, text(next), distinct.map(text), rng)
}

/** "Which surah is this ayah from?" Distractors are surahs of similar ayahs, then neighbouring surahs. */
export function surahQuestion(q: Quran, similar: SimilarData, ayah: number, rng: Rng): Question | null {
  const s = q.surahOf(ayah)
  const neighbours = shuffle(
    [-2, -1, 1, 2, 3].map((d) => s + d).filter((x) => x >= 0 && x < q.surahs.length),
    rng,
  )
  const pool = [...similarTo(similar, ayah).map((j) => q.surahOf(j)), ...neighbours]
  const names = pick(pool, new Set([s]), 3).map((x) => q.surahs[x].name)
  return withOptions('surah', ayah, q.surahs[s].name, names, rng)
}

/** "Which word is missing?" Distractors are the words similar ayahs use instead, then words from nearby ayahs. */
export function wordQuestion(q: Quran, similar: SimilarData, ayah: number, rng: Rng): Question | null {
  const w = words(q.text[ayah])
  // Hide a word that carries meaning: not the first one, and at least three letters.
  const candidates = w.map((_, k) => k).filter((k) => k > 0 && normalize(w[k]).length >= 3)
  if (!candidates.length) return null
  const hidden = candidates[Math.floor(rng() * candidates.length)]
  const correct = w[hidden]
  const key = normalize(correct)

  const fromSimilar = similarTo(similar, ayah).flatMap((j) => {
    const other = words(q.text[j])
    const shared = sharedWords(w, other)
    return other.filter((_, k) => !shared[k])
  })
  const nearby = shuffle(
    [-2, -1, 1, 2].flatMap((d) => (ayah + d >= 0 && ayah + d < q.text.length ? words(q.text[ayah + d]) : [])),
    rng,
  ).filter((x) => normalize(x).length >= 3)
  const seen = new Set([key, ...w.map(normalize)])
  const distractors: string[] = []
  for (const x of [...fromSimilar, ...nearby]) {
    const k = normalize(x)
    if (distractors.length < 3 && !seen.has(k)) {
      seen.add(k)
      distractors.push(x)
    }
  }
  return withOptions('word', ayah, correct, distractors, rng, hidden)
}

const MAKERS = { next: nextQuestion, surah: surahQuestion, word: wordQuestion }

/** Builds up to `count` questions about ayahs from `pool`, mixing the kinds asked for. */
export function buildQuiz(q: Quran, similar: SimilarData, pool: number[], kinds: QuestionKind[], count: number, rng: Rng): Question[] {
  const questions: Question[] = []
  const ayahs = shuffle(pool, rng)
  let k = 0
  for (const ayah of ayahs) {
    if (questions.length === count) break
    const kind = kinds[k % kinds.length]
    const made = MAKERS[kind](q, similar, ayah, rng)
    if (made) {
      questions.push(made)
      k++
    }
  }
  return questions
}
