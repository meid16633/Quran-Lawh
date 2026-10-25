import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Quran, type QuranData } from './quran'
import { buildQuiz, nextQuestion, seeded, surahQuestion, wordQuestion } from './quiz'
import { normalize } from './search'
import type { SimilarData } from './study'
import { words } from './words'

const read = <T>(f: string) => JSON.parse(readFileSync(new URL(`../../public/data/${f}`, import.meta.url), 'utf8')) as T
const q = new Quran(read<QuranData>('quran.json'))
const similar = read<SimilarData>('similar.json')

describe('quiz questions', () => {
  it('asks for the next ayah with four distinct options', () => {
    const question = nextQuestion(q, similar, q.indexOf(2, 34), seeded(1))!
    expect(question.options).toHaveLength(4)
    expect(question.options[question.answer]).toBe(q.text[q.indexOf(2, 35)])
    expect(new Set(question.options.map(normalize)).size).toBe(4)
  })

  it('uses similar ayahs as distractors when there are some', () => {
    // 2:34 is followed by 2:35, which is close to 7:19.
    const question = nextQuestion(q, similar, q.indexOf(2, 34), seeded(2))!
    expect(question.options).toContain(q.text[q.indexOf(7, 19)])
  })

  it('does not ask for the ayah after the last one of a surah', () => {
    expect(nextQuestion(q, similar, q.indexOf(1, 7), seeded(3))).toBeNull()
  })

  it('asks for the surah', () => {
    const question = surahQuestion(q, similar, q.indexOf(2, 49), seeded(4))!
    expect(question.options[question.answer]).toBe(q.surahs[1].name)
    expect(new Set(question.options).size).toBe(4)
  })

  it('hides a meaningful word and offers other words', () => {
    const ayah = q.indexOf(2, 255)
    const question = wordQuestion(q, similar, ayah, seeded(5))!
    const w = words(q.text[ayah])
    expect(question.hidden).toBeGreaterThan(0)
    expect(question.options[question.answer]).toBe(w[question.hidden!])
    const others = question.options.filter((_, k) => k !== question.answer).map(normalize)
    for (const o of others) expect(w.map(normalize)).not.toContain(o)
  })

  it('builds a mixed quiz from a pool and is reproducible', () => {
    const pool = Array.from({ length: 200 }, (_, k) => q.indexOf(78, 1) + k).filter((i) => i < q.text.length)
    const a = buildQuiz(q, similar, pool, ['next', 'surah', 'word'], 10, seeded(7))
    const b = buildQuiz(q, similar, pool, ['next', 'surah', 'word'], 10, seeded(7))
    expect(a).toHaveLength(10)
    expect(a).toEqual(b)
    expect(new Set(a.map((x) => x.kind))).toEqual(new Set(['next', 'surah', 'word']))
    for (const x of a) expect(x.answer).toBeGreaterThanOrEqual(0)
  })
})
