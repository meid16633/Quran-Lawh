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
  khatma.set((plan) => (plan && page === plan.progress + 1 ? { ...plan, progress: page } : plan))
}
