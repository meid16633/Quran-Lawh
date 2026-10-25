import { describe, expect, it } from 'vitest'
import { BADGES, type Progress, bestStreak, earned } from './achievements'

const zero: Progress = {
  pagesRead: 0,
  reviews: 0,
  bestStreak: 0,
  khatmas: 0,
  memorizedPages: 0,
  juzAmmaPages: 0,
  notes: 0,
  quizzes: 0,
  perfectQuizzes: 0,
}

describe('achievements', () => {
  it('earns nothing at the start and badges as progress grows', () => {
    expect(earned(zero)).toEqual([])
    expect(earned({ ...zero, pagesRead: 1 })).toEqual(['first-page'])
    expect(earned({ ...zero, juzAmmaPages: 23, memorizedPages: 23 })).toEqual(['juz-amma'])
    expect(earned({ ...zero, memorizedPages: 604 })).toEqual(expect.arrayContaining(['memo-100', 'memo-half', 'memo-all']))
  })

  it('has unique ids', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length)
  })

  it('finds the longest streak', () => {
    expect(bestStreak([])).toBe(0)
    expect(bestStreak([5, 6, 7, 10, 11])).toBe(3)
    expect(bestStreak([1, 3, 5])).toBe(1)
  })
})
