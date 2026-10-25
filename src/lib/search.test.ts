import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Quran, type QuranData } from './quran'
import { SearchIndex, normalize } from './search'

const data = JSON.parse(readFileSync(new URL('../../public/data/quran.json', import.meta.url), 'utf8')) as QuranData
const q = new Quran(data)
const index = new SearchIndex(q)
const hits = (query: string) => index.ayahs(query, 10_000).results

describe('normalize', () => {
  it('drops diacritics and unifies letter forms', () => {
    expect(normalize('إِنَّ ٱلَّذِينَ')).toBe('ان الذين')
    expect(normalize('رَحْمَةٌ')).toBe('رحمه')
  })
})

describe('SearchIndex', () => {
  it('finds words typed in modern spelling', () => {
    expect(hits('الصلاة')).toContain(q.indexOf(2, 3))
    expect(hits('الزكاة')).toContain(q.indexOf(2, 43))
    expect(hits('السماوات')).toContain(q.indexOf(2, 164))
    expect(hits('الرحمن')).toContain(q.indexOf(1, 1))
    expect(hits('على')).toContain(q.indexOf(2, 5))
    expect(hits('الكتاب')).toContain(q.indexOf(2, 2))
  })

  it('finds words typed with diacritics', () => {
    expect(hits('ٱلْحَمْدُ لِلَّهِ')).toContain(q.indexOf(1, 2))
  })

  it('needs at least two letters', () => {
    expect(hits('ا')).toHaveLength(0)
  })

  it('caps results but reports the total', () => {
    const { results, total } = index.ayahs('الله', 50)
    expect(results).toHaveLength(50)
    expect(total).toBeGreaterThan(1000)
  })

  it('matches surah names', () => {
    expect(index.surahs('البقرة')).toContain(1)
    expect(index.surahs('سورة يس')).toContain(35)
    expect(index.surahs('كهف')).toContain(17)
  })

  it('parses references', () => {
    expect(index.reference('2:255')).toBe(q.indexOf(2, 255))
    expect(index.reference('٢:٢٥٥')).toBe(q.indexOf(2, 255))
    expect(index.reference('البقرة ٢٥٥')).toBe(q.indexOf(2, 255))
    expect(index.reference('الكهف 10')).toBe(q.indexOf(18, 10))
    expect(index.reference('2:300')).toBeNull()
    expect(index.reference('الصلاة')).toBeNull()
  })
})
