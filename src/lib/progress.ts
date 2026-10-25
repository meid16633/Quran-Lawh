import { type Progress, bestStreak } from './achievements'
import { activity, khatmaCount, memorized, quizStats } from './hifz'
import { notes } from './notes'
import { createStore, useStore } from './store'

const JUZ_AMMA = Array.from({ length: 23 }, (_, k) => 582 + k)

export function currentProgress(): Progress {
  const log = Object.entries(activity.get())
  const memo = memorized.get()
  const quiz = quizStats.get()
  return {
    pagesRead: log.reduce((n, [, a]) => n + a.read, 0),
    reviews: log.reduce((n, [, a]) => n + a.reviewed, 0),
    bestStreak: bestStreak(log.filter(([, a]) => a.read + a.reviewed > 0).map(([d]) => Number(d))),
    khatmas: khatmaCount.get().n,
    memorizedPages: Object.keys(memo).length,
    juzAmmaPages: JUZ_AMMA.filter((p) => memo[p]).length,
    notes: Object.keys(notes.get()).length,
    quizzes: quiz.quizzes,
    perfectQuizzes: quiz.perfect,
  }
}

/** When each badge was first earned. */
export const badgesEarned = createStore<Record<string, number>>('lawh:badges', {})

export const watchedStores = [activity, khatmaCount, memorized, quizStats, notes]

/** currentProgress(), re-rendering when any of the data behind it changes. */
export function useProgress(): Progress {
  useStore(activity)
  useStore(khatmaCount)
  useStore(memorized)
  useStore(quizStats)
  useStore(notes)
  return currentProgress()
}
