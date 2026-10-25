/**
 * Spaced repetition for memorized mushaf pages (a light SM-2): each page is a card that comes back
 * for review after a growing number of days, and sooner again when the review goes badly.
 */
export interface Card {
  ease: number
  /** Days until the next review after the last one. */
  interval: number
  /** Day number when the page is next due. */
  due: number
  reps: number
  lapses: number
  last: number
}

/** 0 = forgot, 3 = hard, 4 = good, 5 = easy */
export type Grade = 0 | 3 | 4 | 5

export function newCard(today: number): Card {
  return { ease: 2.5, interval: 0, due: today + 1, reps: 0, lapses: 0, last: today }
}

export function review(card: Card, grade: Grade, today: number): Card {
  if (grade < 3) {
    return { ...card, reps: 0, lapses: card.lapses + 1, interval: 1, due: today + 1, last: today, ease: Math.max(1.3, card.ease - 0.2) }
  }
  const ease = Math.max(1.3, card.ease + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  let interval: number
  if (card.reps === 0) interval = grade === 5 ? 2 : 1
  else if (card.reps === 1) interval = grade === 3 ? 2 : 4
  else interval = Math.max(card.interval + 1, Math.round(card.interval * (grade === 3 ? 1.2 : ease) * (grade === 5 ? 1.3 : 1)))
  return { ease, interval, due: today + interval, reps: card.reps + 1, lapses: card.lapses, last: today }
}

export function isDue(card: Card, today: number): boolean {
  return card.due <= today
}

export type Strength = 'due' | 'weak' | 'learning' | 'strong'

export function strength(card: Card, today: number): Strength {
  if (isDue(card, today)) return 'due'
  if (card.lapses >= 2 && card.reps < 3) return 'weak'
  return card.interval >= 21 ? 'strong' : 'learning'
}

/** A starting suggestion for the grade, from the mistakes marked while reviewing the page. */
export function suggestGrade(mistakes: number): Grade {
  if (mistakes === 0) return 4
  if (mistakes <= 3) return 3
  return 0
}
