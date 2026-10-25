import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Quran, arabicDigits, type QuranData } from './quran'

const data = JSON.parse(readFileSync(new URL('../../public/data/quran.json', import.meta.url), 'utf8')) as QuranData
const q = new Quran(data)

describe('Quran data', () => {
  it('has the full Hafs text', () => {
    expect(data.text).toHaveLength(6236)
    expect(data.surahs).toHaveLength(114)
    expect(data.pages).toHaveLength(604)
    expect(data.juz).toHaveLength(30)
    expect(data.hizbQuarters).toHaveLength(240)
    expect(data.sajdas).toHaveLength(15)
  })

  // Guards against any accidental edit of the verse text. Only change this
  // together with a deliberate, reviewed update of the source package.
  it('matches the pinned checksum of the verse text', () => {
    const hash = createHash('sha256').update(data.text.join('\n')).digest('hex')
    expect(hash).toBe('39ff52afa15b2e3f1027dda4dfbcfeec5b4001a19430ccc3e141a2d0f1b490c0')
  })
})

describe('Quran navigation', () => {
  it('maps every ayah back to its surah and number', () => {
    for (let i = 0; i < q.text.length; i++) {
      expect(q.indexOf(q.surahOf(i) + 1, q.ayahNo(i))).toBe(i)
    }
  })

  it('knows the Madinah mushaf pages', () => {
    expect(q.pageOf(q.indexOf(1, 7))).toBe(1)
    expect(q.pageOf(q.indexOf(2, 1))).toBe(2)
    expect(q.pageOf(q.indexOf(2, 6))).toBe(3)
    expect(q.pageOf(q.indexOf(2, 255))).toBe(42)
    expect(q.pageOf(q.indexOf(3, 1))).toBe(50)
    expect(q.pageOf(q.indexOf(18, 1))).toBe(293)
    expect(q.pageOf(q.indexOf(36, 1))).toBe(440)
    expect(q.pageOf(q.indexOf(67, 1))).toBe(562)
    expect(q.pageOf(q.indexOf(114, 6))).toBe(604)
  })

  it('knows juz starts', () => {
    expect(q.juzOf(q.indexOf(2, 141))).toBe(1)
    expect(q.juzOf(q.indexOf(2, 142))).toBe(2)
    expect(q.juzOf(q.indexOf(78, 1))).toBe(30)
  })

  it('splits the mushaf into contiguous pages', () => {
    let next = 0
    for (let p = 1; p <= q.pageCount; p++) {
      const [first, end] = q.pageRange(p)
      expect(first).toBe(next)
      expect(end).toBeGreaterThan(first)
      next = end
    }
    expect(next).toBe(q.text.length)
  })

  it('formats Arabic-Indic digits', () => {
    expect(arabicDigits(604)).toBe('٦٠٤')
  })
})
