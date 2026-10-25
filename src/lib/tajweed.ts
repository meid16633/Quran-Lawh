/** Tajweed colours: rule positions per ayah, built by scripts/build-tajweed.mjs. */

export type TajweedClass = 'madd6' | 'madd45' | 'madd246' | 'ghunnah' | 'qalqalah' | 'idgham' | 'silent' | 'madd2'

export interface TajweedData {
  source: string
  classes: TajweedClass[]
  /** Per ayah: [start delta from the previous run's end, length, class index] repeated. */
  ayahs: number[][]
}

/** [start, end, class] in the ayah text, in order and not overlapping. */
export type Run = [number, number, TajweedClass]

export const LEGEND: { cls: TajweedClass; name: string; detail: string }[] = [
  { cls: 'madd6', name: 'مد لازم', detail: '٦ حركات' },
  { cls: 'madd45', name: 'مد واجب متصل', detail: '٤ أو ٥ حركات' },
  { cls: 'madd246', name: 'مد جائز', detail: 'منفصل ٤ أو ٥، وعارض للسكون ٢ أو ٤ أو ٦' },
  { cls: 'madd2', name: 'مد طبيعي', detail: 'حركتان' },
  { cls: 'ghunnah', name: 'غنة', detail: 'إخفاء، إدغام بغنة، إقلاب، ونون وميم مشددتان' },
  { cls: 'qalqalah', name: 'قلقلة', detail: 'ق ط ب ج د الساكنة' },
  { cls: 'idgham', name: 'إدغام بلا غنة', detail: 'في اللام والراء، والمتجانسان والمتقاربان' },
  { cls: 'silent', name: 'لا يُنطق', detail: 'همزة الوصل وسط الكلام، اللام الشمسية، وحروف تُكتب ولا تُقرأ' },
]

let data: Promise<TajweedData> | null = null

/** Loaded on first use and kept; the file is precached for offline use. */
export function loadTajweed(): Promise<TajweedData> {
  data ??= fetch('data/tajweed.json')
    .then((r) => {
      if (!r.ok) throw new Error(`tajweed: ${r.status}`)
      return r.json() as Promise<TajweedData>
    })
    .catch((e) => {
      data = null
      throw e
    })
  return data
}

export function runsOf(d: TajweedData, ayah: number): Run[] {
  const packed = d.ayahs[ayah] ?? []
  const runs: Run[] = []
  let pos = 0
  for (let k = 0; k < packed.length; k += 3) {
    const start = pos + packed[k]
    pos = start + packed[k + 1]
    runs.push([start, pos, d.classes[packed[k + 2]]])
  }
  return runs
}

const ZWJ = '\u200D'
const MARK = /\p{Mn}/u
// Letters that never join the letter after them (and ء, which joins neither side).
const NO_JOIN_AFTER = new Set([...'اأإآٱدذرزوؤةء\u06E5\u06E6'])
const NO_JOIN_BEFORE = new Set([...'ء\u06E5\u06E6'])
const isBase = (c: string) => !MARK.test(c) && c !== ' ' && c !== '\u00A0'

/**
 * Cuts one word (text.slice(from, to)) into plain and coloured pieces. A browser shapes every element on its own,
 * so a letter cut from its neighbour would be drawn in its isolated form: where both sides of a cut join, a zero
 * width joiner is added on each side to keep the word connected.
 */
export function pieces(text: string, runs: Run[], from: number, to: number): { text: string; cls: TajweedClass | null }[] {
  const out: { text: string; cls: TajweedClass | null; start: number; end: number }[] = []
  let pos = from
  for (const [s, e, cls] of runs) {
    if (e <= from || s >= to) continue
    const start = Math.max(s, from)
    const end = Math.min(e, to)
    if (start > pos) out.push({ text: '', cls: null, start: pos, end: start })
    out.push({ text: '', cls, start, end })
    pos = end
  }
  if (pos < to) out.push({ text: '', cls: null, start: pos, end: to })

  for (let k = 0; k < out.length; k++) {
    const p = out[k]
    let t = text.slice(p.start, p.end)
    if (k > 0 && joins(text, p.start)) t = ZWJ + t
    if (k < out.length - 1 && joins(text, p.end)) t += ZWJ
    p.text = t
  }
  return out.map(({ text: t, cls }) => ({ text: t, cls }))
}

/** Whether the letters on both sides of a cut at `at` connect. */
function joins(text: string, at: number): boolean {
  let before = at - 1
  while (before >= 0 && !isBase(text[before])) before--
  let after = at
  while (after < text.length && MARK.test(text[after])) after++
  if (before < 0 || after >= text.length || !isBase(text[after])) return false
  return !NO_JOIN_AFTER.has(text[before]) && !NO_JOIN_BEFORE.has(text[after])
}
