export const TOTAL_PAGES = 604

export interface KhatmaPlan {
  /** Day number the plan started. */
  start: number
  days: number
  /** Last page completed (0 before the first page). */
  progress: number
}

export interface KhatmaStatus {
  pagesPerDay: number
  /** 1-based day of the plan (can run past `days` when late). */
  day: number
  /** Today's portion, inclusive. Empty (from > to) when today's portion is done. */
  from: number
  to: number
  doneToday: boolean
  /** Pages behind schedule from earlier days. */
  behind: number
  percent: number
  finished: boolean
}

export function khatmaStatus(plan: KhatmaPlan, today: number): KhatmaStatus {
  const pagesPerDay = Math.ceil(TOTAL_PAGES / plan.days)
  const day = Math.max(1, today - plan.start + 1)
  const targetEnd = Math.min(TOTAL_PAGES, pagesPerDay * day)
  const targetYesterday = Math.min(TOTAL_PAGES, pagesPerDay * (day - 1))
  const finished = plan.progress >= TOTAL_PAGES
  return {
    pagesPerDay,
    day,
    from: plan.progress + 1,
    to: targetEnd,
    doneToday: plan.progress >= targetEnd,
    behind: Math.max(0, targetYesterday - plan.progress),
    percent: Math.round((Math.min(plan.progress, TOTAL_PAGES) / TOTAL_PAGES) * 100),
    finished,
  }
}
