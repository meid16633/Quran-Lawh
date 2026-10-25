import { normalize } from './search'

export interface TafsirData {
  source: string
  /** التفسير الميسر, one entry per ayah. */
  muyassar: string[]
  /** الميسر في غريب القرآن, one entry per ayah (empty when the ayah has no unusual words). */
  gharib: string[]
}

/** Ayah index -> [similar ayah index, similarity %][], strongest first. */
export type SimilarData = Record<string, [number, number][]>

let tafsir: Promise<TafsirData> | null = null
let similar: Promise<SimilarData> | null = null

const fetchJson = <T>(path: string) =>
  fetch(path).then((r) => {
    if (!r.ok) throw new Error(`${path}: ${r.status}`)
    return r.json() as Promise<T>
  })

/** Loaded on first use and kept; the files are precached for offline use. */
export function loadTafsir(): Promise<TafsirData> {
  tafsir ??= fetchJson<TafsirData>('data/tafsir.json').catch((e) => {
    tafsir = null
    throw e
  })
  return tafsir
}

export function loadSimilar(): Promise<SimilarData> {
  similar ??= fetchJson<SimilarData>('data/similar.json').catch((e) => {
    similar = null
    throw e
  })
  return similar
}

export interface WordMeaning {
  words: string
  meaning: string
}

/** Splits "﴿ٱلۡكِتَـٰبُ﴾: القرآنُ.\n\n﴿…﴾: …" into word/meaning pairs. */
export function parseGharib(text: string): WordMeaning[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const m = p.match(/^﴿([^﴾]+)﴾\s*:?\s*([\s\S]*)$/)
      return m ? { words: m[1].trim(), meaning: m[2].trim() } : { words: '', meaning: p }
    })
}

/**
 * For each word of `b`, whether it also appears, in order, in `a` (longest common subsequence
 * on letters without diacritics). Words that are false are where `b` differs from `a`.
 */
export function sharedWords(a: string[], b: string[]): boolean[] {
  const x = a.map(normalize)
  const y = b.map(normalize)
  const dp: number[][] = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0))
  for (let i = 1; i <= x.length; i++)
    for (let j = 1; j <= y.length; j++)
      dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
  const shared = new Array(y.length).fill(false)
  for (let i = x.length, j = y.length; i > 0 && j > 0; ) {
    if (x[i - 1] === y[j - 1]) {
      shared[j - 1] = true
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--
    else j--
  }
  return shared
}
