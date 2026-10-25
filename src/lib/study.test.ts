import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Quran, type QuranData } from './quran'
import { normalize } from './search'
import { type SimilarData, type TafsirData, parseGharib, sharedWords } from './study'
import { words } from './words'

const read = <T>(f: string) => JSON.parse(readFileSync(new URL(`../../public/data/${f}`, import.meta.url), 'utf8')) as T
const q = new Quran(read<QuranData>('quran.json'))
const tafsir = read<TafsirData>('tafsir.json')
const similar = read<SimilarData>('similar.json')

describe('tafsir data', () => {
  it('has al-Muyassar for every ayah, without surah introductions', () => {
    expect(tafsir.muyassar).toHaveLength(6236)
    expect(tafsir.muyassar.every((t) => t.length > 0)).toBe(true)
    expect(tafsir.muyassar.some((t) => t.includes('من مقاصد السورة'))).toBe(false)
    expect(tafsir.muyassar[q.indexOf(112, 1)]).toMatch(/^قل -أيها الرسول-: هو الله المتفرد بالألوهية/)
  })

  it('has word meanings aligned with the ayahs', () => {
    expect(tafsir.gharib).toHaveLength(6236)
    const meanings = parseGharib(tafsir.gharib[q.indexOf(78, 1)])
    expect(meanings.map((m) => normalize(m.words))).toEqual(['عم', 'يتسالون'])
    expect(normalize(meanings[0].meaning)).toContain('عن اي شي')
  })
})

describe('similar ayahs', () => {
  const of = (s: number, a: number) => (similar[q.indexOf(s, a)] ?? []).map(([j]) => `${q.surahOf(j) + 1}:${q.ayahNo(j)}`)

  it('finds well-known mutashabihat', () => {
    expect(of(2, 35)).toContain('7:19')
    expect(of(2, 58)).toContain('7:161')
    expect(of(2, 49)).toEqual(expect.arrayContaining(['7:141', '14:6']))
    expect(of(2, 136)).toContain('3:84')
    expect(of(55, 13)).toContain('55:16')
  })

  it('is symmetric and strongest first', () => {
    for (const [i, list] of Object.entries(similar)) {
      for (const [j] of list) {
        // A capped list may drop weaker links, so only check that strong links point both ways.
        if (list.length < 12 && similar[j].length < 12) expect(similar[j].map(([k]) => k)).toContain(Number(i))
      }
      for (let k = 1; k < list.length; k++) expect(list[k - 1][1]).toBeGreaterThanOrEqual(list[k][1])
    }
  })

  it('marks the words that differ', () => {
    const a = words(q.text[q.indexOf(2, 35)])
    const b = words(q.text[q.indexOf(7, 19)])
    const diff = b.filter((_, k) => !sharedWords(a, b)[k])
    expect(diff.length).toBeGreaterThan(0)
    expect(diff.length).toBeLessThan(b.length / 2)
    expect(sharedWords(a, a).every(Boolean)).toBe(true)
  })
})
