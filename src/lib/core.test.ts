import { describe, expect, it } from 'vitest'
import { dayNumber, streak } from './dates'
import { khatmaStatus, pagesForDays, planLength } from './khatma'
import { isDue, newCard, review, strength, suggestGrade } from './srs'
import { firstLetter, words } from './words'

describe('dates', () => {
  it('counts local days', () => {
    expect(dayNumber(new Date(2026, 0, 2, 0, 5)) - dayNumber(new Date(2026, 0, 1, 23, 55))).toBe(1)
  })

  it('computes streaks ending today or yesterday', () => {
    expect(streak([10, 11, 12], 12)).toBe(3)
    expect(streak([10, 11, 12], 13)).toBe(3)
    expect(streak([10, 11, 12], 14)).toBe(0)
    expect(streak([8, 10, 11], 11)).toBe(2)
    expect(streak([], 5)).toBe(0)
  })
})

describe('words', () => {
  it('splits on spaces', () => {
    expect(words('بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ')).toHaveLength(4)
  })

  it('takes the first letter with its marks', () => {
    expect(firstLetter('بِسۡمِ')).toBe('بِـ')
    expect(firstLetter('ٱلرَّحِيمِ')).toBe('ٱلرَّ')
    expect(firstLetter('ٱلنَّبَإِ')).toBe('ٱلنَّـ')
    expect(firstLetter('وَٱلۡجِبَالَ')).toBe('وَٱلۡجِـ')
    expect(firstLetter('وَمَا')).toBe('وَمَـ')
    expect(firstLetter('۞وَإِذۡ')).toBe('وَإِ')
    expect(firstLetter('فِي')).toBe('فِي')
    expect(firstLetter('قَ')).toBe('قَ')
  })
})

describe('spaced repetition', () => {
  it('schedules a new page for tomorrow', () => {
    const c = newCard(100)
    expect(c.due).toBe(101)
    expect(isDue(c, 100)).toBe(false)
    expect(isDue(c, 101)).toBe(true)
  })

  it('grows the interval with good reviews', () => {
    let c = newCard(0)
    const intervals: number[] = []
    for (let day = 1; intervals.length < 5; day = c.due) {
      c = review(c, 4, day)
      intervals.push(c.interval)
    }
    expect(intervals[0]).toBe(1)
    expect(intervals[1]).toBe(4)
    for (let k = 2; k < intervals.length; k++) expect(intervals[k]).toBeGreaterThan(intervals[k - 1])
    expect(strength(c, c.last)).toBe('strong')
  })

  it('brings a forgotten page back tomorrow', () => {
    let c = review(review(newCard(0), 4, 1), 4, 2)
    c = review(c, 0, 10)
    expect(c.due).toBe(11)
    expect(c.reps).toBe(0)
    expect(c.lapses).toBe(1)
  })

  it('never lets ease collapse', () => {
    let c = newCard(0)
    for (let d = 1; d < 30; d++) c = review(c, 3, d)
    expect(c.ease).toBeGreaterThanOrEqual(1.3)
  })

  it('suggests a grade from mistakes', () => {
    expect(suggestGrade(0)).toBe(4)
    expect(suggestGrade(2)).toBe(3)
    expect(suggestGrade(6)).toBe(0)
  })
})

describe('khatma by pages per day', () => {
  it('works out the length and finish day', () => {
    expect(planLength(1, 3)).toBe(202)
    expect(planLength(1, 20)).toBe(31)
    expect(planLength(500, 5)).toBe(21)
    expect(pagesForDays(1, 30)).toBe(21)
    const s = khatmaStatus({ start: 1000, pagesPerDay: 3, from: 1, progress: 0 }, 1000)
    expect([s.from, s.to, s.totalDays, s.finishDay]).toEqual([1, 3, 202, 1201])
  })

  it('re-plans from the current page without losing the percentage', () => {
    const s = khatmaStatus({ start: 50, pagesPerDay: 10, from: 1, progress: 302, startProgress: 302 }, 50)
    expect([s.from, s.to, s.totalDays]).toEqual([303, 312, 31])
    expect(s.percent).toBe(50)
    expect(s.doneToday).toBe(false)
  })

  it('can start in the middle of the mushaf', () => {
    const s = khatmaStatus({ start: 0, pagesPerDay: 5, from: 500, progress: 499 }, 1)
    expect([s.from, s.to]).toEqual([500, 509])
    expect(s.behind).toBe(5)
    expect(s.percent).toBe(0)
    expect(khatmaStatus({ start: 0, pagesPerDay: 5, from: 500, progress: 552 }, 1).percent).toBe(50)
  })
})

describe('khatma', () => {
  it('splits the mushaf into daily portions', () => {
    const s = khatmaStatus({ start: 100, days: 30, progress: 0 }, 100)
    expect(s.pagesPerDay).toBe(21)
    expect([s.from, s.to]).toEqual([1, 21])
    expect(s.doneToday).toBe(false)
  })

  it('tracks being done, behind and finished', () => {
    expect(khatmaStatus({ start: 0, days: 30, progress: 21 }, 0).doneToday).toBe(true)
    const late = khatmaStatus({ start: 0, days: 30, progress: 10 }, 2)
    expect(late.behind).toBe(32)
    expect([late.from, late.to]).toEqual([11, 63])
    const done = khatmaStatus({ start: 0, days: 30, progress: 604 }, 40)
    expect(done.finished).toBe(true)
    expect(done.percent).toBe(100)
    expect(done.to).toBe(604)
  })
})

describe('calendar days', () => {
  it('maps day numbers back to local dates', async () => {
    const { dateOfDay, dayNumber } = await import('./dates')
    const d = new Date(2027, 4, 14, 15, 30)
    const back = dateOfDay(dayNumber(d))
    expect([back.getFullYear(), back.getMonth(), back.getDate()]).toEqual([2027, 4, 14])
  })
})
