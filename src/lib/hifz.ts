import { dayNumber } from './dates'
import type { KhatmaPlan } from './khatma'
import { type Card, type Grade, newCard, review } from './srs'
import { createStore } from './store'

/** Memorized pages (1..604) and their review schedule. */
export const memorized = createStore<Record<string, Card>>('lawh:memorized', {})

export interface Mistake {
  /** Times this word was marked as a mistake. */
  n: number
  at: number
}

/** Mistakes per word, keyed by wordKey(). */
export const mistakes = createStore<Record<string, Mistake>>('lawh:mistakes', {})

export interface DayActivity {
  read: number
  reviewed: number
}

/** What was done on each day number, for streaks and stats. */
export const activity = createStore<Record<string, DayActivity>>('lawh:activity', {})

export const khatma = createStore<KhatmaPlan | null>('lawh:khatma', null)

/** Completed khatmas. */
export const khatmaCount = createStore<{ n: number }>('lawh:khatmas', { n: 0 })

export function logActivity(kind: keyof DayActivity, amount = 1) {
  const today = String(dayNumber())
  activity.set((all) => {
    const day = all[today] ?? { read: 0, reviewed: 0 }
    return { ...all, [today]: { ...day, [kind]: day[kind] + amount } }
  })
}

export function markMemorized(pages: number[]) {
  const today = dayNumber()
  memorized.set((all) => {
    const next = { ...all }
    for (const p of pages) if (!next[p]) next[p] = newCard(today)
    return next
  })
}

export function unmarkMemorized(page: number) {
  memorized.set((all) => {
    const next = { ...all }
    delete next[page]
    return next
  })
}

export function gradePage(page: number, grade: Grade) {
  const today = dayNumber()
  memorized.set((all) => ({ ...all, [page]: review(all[page] ?? newCard(today), grade, today) }))
  logActivity('reviewed')
}

export function addMistake(key: string) {
  mistakes.set((all) => ({ ...all, [key]: { n: (all[key]?.n ?? 0) + 1, at: Date.now() } }))
}

/** Undo one mark on a word (used when a mistake was marked by accident). */
export function removeMistake(key: string) {
  mistakes.set((all) => {
    const next = { ...all }
    const m = next[key]
    if (!m) return all
    if (m.n <= 1) delete next[key]
    else next[key] = { ...m, n: m.n - 1 }
    return next
  })
}

export function clearMistakes(keys: string[]) {
  mistakes.set((all) => {
    const next = { ...all }
    for (const k of keys) delete next[k]
    return next
  })
}

/** Called when the reader moves forward from `page`: counts it as read and advances the khatma. */
export function pageFinished(page: number) {
  logActivity('read')
  const plan = khatma.get()
  if (plan && page === plan.progress + 1) {
    khatma.set({ ...plan, progress: page })
    if (page === 604) khatmaCount.set((c) => ({ n: c.n + 1 }))
  }
}

export interface QuizStats {
  quizzes: number
  answered: number
  correct: number
  /** Quizzes of 10 or more questions answered without a mistake. */
  perfect: number
}

export const quizStats = createStore<QuizStats>('lawh:quiz', { quizzes: 0, answered: 0, correct: 0, perfect: 0 })

export function recordQuiz(answered: number, correct: number) {
  quizStats.set((s) => ({
    quizzes: s.quizzes + 1,
    answered: s.answered + answered,
    correct: s.correct + correct,
    perfect: s.perfect + (answered >= 10 && correct === answered ? 1 : 0),
  }))
}
