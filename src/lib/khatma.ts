export const TOTAL_PAGES = 604

export interface KhatmaPlan {
  /** Day number the plan started. */
  start: number
  /** Pages to read each day. */
  pagesPerDay?: number
  /** Plans made before pagesPerDay existed stored a length in days instead. */
  days?: number
  /** First page of this khatma: 1, or later when it starts in the middle of the mushaf. */
  from?: number
  /** Last page completed (from - 1 before the first page). */
  progress: number
  /** Pages already read when this schedule started (after editing a plan mid-khatma). Defaults to from - 1. */
  startProgress?: number
}

export interface KhatmaStatus {
  pagesPerDay: number
  /** Planned length in days and the day number it ends on. */
  totalDays: number
  finishDay: number
  /** 1-based day of the plan (can run past totalDays when late). */
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

export function planPagesPerDay(plan: KhatmaPlan): number {
  return plan.pagesPerDay ?? Math.ceil(TOTAL_PAGES / (plan.days ?? 30))
}

/** Days needed to read from page `from` to the end at `pagesPerDay`. */
export function planLength(from: number, pagesPerDay: number): number {
  return Math.ceil((TOTAL_PAGES - from + 1) / Math.max(1, pagesPerDay))
}

/** Pages per day needed to finish in `days` days starting at page `from`. */
export function pagesForDays(from: number, days: number): number {
  return Math.ceil((TOTAL_PAGES - from + 1) / Math.max(1, days))
}

export function khatmaStatus(plan: KhatmaPlan, today: number): KhatmaStatus {
  const pagesPerDay = planPagesPerDay(plan)
  const first = plan.from ?? 1
  const before = first - 1
  // The schedule counts from where it started; the percentage from the khatma's first page.
  const origin = plan.startProgress ?? before
  const totalDays = planLength(origin + 1, pagesPerDay)
  const day = Math.max(1, today - plan.start + 1)
  const targetEnd = Math.min(TOTAL_PAGES, origin + pagesPerDay * day)
  const targetYesterday = Math.min(TOTAL_PAGES, origin + pagesPerDay * (day - 1))
  const read = Math.min(plan.progress, TOTAL_PAGES) - before
  return {
    pagesPerDay,
    totalDays,
    finishDay: plan.start + totalDays - 1,
    day,
    from: plan.progress + 1,
    to: targetEnd,
    doneToday: plan.progress >= targetEnd,
    behind: Math.max(0, targetYesterday - plan.progress),
    percent: Math.max(0, Math.min(100, Math.round((read / (TOTAL_PAGES - before)) * 100))),
    finished: plan.progress >= TOTAL_PAGES,
  }
}
