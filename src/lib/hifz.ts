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

export interface WirdMark {
  /** Ayah index where the daily wird continues. */
  ayah: number
  page: number
  at: number
}

/**
 * Where the daily wird continues. Separate from the last page opened, which also changes when
 * the reader is used to look something up.
 */
export const wirdMark = createStore<WirdMark | null>('lawh:wird-mark', null)

/** Puts the wird mark on an ayah; an active khatma then continues from that page. */
export function setWirdMark(ayah: number, page: number) {
  wirdMark.set({ ayah, page, at: Date.now() })
  const plan = khatma.get()
  if (plan) khatma.set({ ...plan, progress: Math.max((plan.from ?? 1) - 1, page - 1) })
}

/** Starts a khatma and puts the wird mark on its first page. */
export function startKhatma(plan: KhatmaPlan, firstAyah: number) {
  khatma.set(plan)
  wirdMark.set({ ayah: firstAyah, page: plan.from ?? 1, at: Date.now() })
}

/**
 * Called when the reader moves forward from `page` (or marks it done): counts it as read,
 * advances the khatma, and moves the wird mark to `nextAyah` (the first ayah of the next page)
 * when the mark was on this page.
 */
export function pageFinished(page: number, nextAyah: number | null) {
  logActivity('read')
  const plan = khatma.get()
  if (plan && page === plan.progress + 1) {
    khatma.set({ ...plan, progress: page })
    if (page === 604) khatmaCount.set((c) => ({ n: c.n + 1 }))
  }
  const mark = wirdMark.get()
  if (mark && mark.page === page) {
    wirdMark.set(nextAyah === null ? null : { ayah: nextAyah, page: page + 1, at: Date.now() })
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
