import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Quran, type QuranData } from './quran'
import { type TajweedData, pieces, runsOf } from './tajweed'

const read = (name: string) => JSON.parse(readFileSync(new URL(`../../public/data/${name}`, import.meta.url), 'utf8'))
const q = new Quran(read('quran.json') as QuranData)
const data = read('tajweed.json') as TajweedData
const ZWJ = '\u200D'

const coloured = (s: number, a: number) => {
  const i = q.indexOf(s, a)
  return runsOf(data, i).map(([start, end, cls]) => [q.text[i].slice(start, end), cls])
}

describe('tajweed data', () => {
  it('covers every ayah with runs inside the text, in order', () => {
    expect(data.ayahs).toHaveLength(6236)
    data.ayahs.forEach((_, i) => {
      let last = 0
      for (const [start, end, cls] of runsOf(data, i)) {
        expect(start).toBeGreaterThanOrEqual(last)
        expect(end).toBeGreaterThan(start)
        expect(end).toBeLessThanOrEqual(q.text[i].length)
        expect(data.classes).toContain(cls)
        last = end
      }
    })
  })

  it('marks well-known places', () => {
    // الٓمٓ: the spelled letters lam and mim are a necessary madd of six counts.
    expect(coloured(2, 1)).toEqual([['لٓمٓ', 'madd6']])
    // The final dal of أَحَدٌ is a qalqalah; the wasl hamza of ٱللَّهُ is not pronounced.
    expect(coloured(112, 1)).toEqual([
      ['ٱ', 'silent'],
      ['دٌ', 'qalqalah'],
    ])
    // بِمَآ أُنزِلَ: a separated madd, then the hidden noon of أُنزِلَ.
    expect(coloured(2, 4).slice(1, 3)).toEqual([
      ['ا\u0653', 'madd246'],
      ['نزِ', 'ghunnah'],
    ])
  })
})

describe('pieces', () => {
  it('keeps a word joined across colours', () => {
    const text = 'مِن قَبۡلِكَ'
    const out = pieces(text, [[6, 8, 'qalqalah']], 4, text.length)
    expect(out).toEqual([
      { text: 'قَ' + ZWJ, cls: null },
      { text: ZWJ + 'بۡ' + ZWJ, cls: 'qalqalah' },
      { text: ZWJ + 'لِكَ', cls: null },
    ])
    expect(out.map((p) => p.text).join('').replaceAll(ZWJ, '')).toBe('قَبۡلِكَ')
  })

  it('adds no joiner after a letter that does not join forward', () => {
    // The text writes آ as alef + maddah.
    const text = 'بِمَا\u0653'
    expect(pieces(text, [[4, 6, 'madd246']], 0, text.length)).toEqual([
      { text: 'بِمَ' + ZWJ, cls: null },
      { text: ZWJ + 'ا\u0653', cls: 'madd246' },
    ])
    const word = 'وَٱلَّذِينَ'
    expect(pieces(word, [[2, 3, 'silent']], 0, word.length)[1]).toEqual({ text: 'ٱ', cls: 'silent' })
  })

  it('returns the plain word when nothing is coloured', () => {
    expect(pieces('هُدٗى', [], 0, 5)).toEqual([{ text: 'هُدٗى', cls: null }])
  })
})
