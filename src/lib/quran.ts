export interface Surah {
  name: string
  tname: string
  meccan: boolean
  ayahs: number
}

export interface QuranData {
  version: number
  source: { text: string; meta: string }
  surahs: Surah[]
  /** Verse text, all 6236 ayahs in mushaf order. Indexes into this array are "ayah indexes". */
  text: string[]
  /** The same verses in modern (إملائي) spelling, without diacritics, for search. */
  plain: string[]
  /** First ayah index of each page / juz / hizb quarter. */
  pages: number[]
  juz: number[]
  hizbQuarters: number[]
  sajdas: number[]
}

/** Index of the last element of a sorted array that is <= value. */
function floorIndex(sorted: number[], value: number): number {
  let lo = 0
  let hi = sorted.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (sorted[mid] <= value) lo = mid
    else hi = mid - 1
  }
  return lo
}

export class Quran {
  readonly surahs: Surah[]
  readonly text: string[]
  readonly plain: string[]
  readonly surahStarts: number[]
  readonly pageCount: number

  constructor(private readonly data: QuranData) {
    this.surahs = data.surahs
    this.text = data.text
    this.plain = data.plain
    this.pageCount = data.pages.length
    let start = 0
    this.surahStarts = data.surahs.map((s) => {
      const at = start
      start += s.ayahs
      return at
    })
  }

  get source() {
    return this.data.source
  }

  /** 0-based surah index of an ayah index. */
  surahOf(i: number): number {
    return floorIndex(this.surahStarts, i)
  }

  /** 1-based ayah number within its surah. */
  ayahNo(i: number): number {
    return i - this.surahStarts[this.surahOf(i)] + 1
  }

  /** Ayah index from a 1-based surah and ayah number. */
  indexOf(surah: number, ayah: number): number {
    return this.surahStarts[surah - 1] + ayah - 1
  }

  /** 1-based page number. */
  pageOf(i: number): number {
    return floorIndex(this.data.pages, i) + 1
  }

  /** 1-based juz number. */
  juzOf(i: number): number {
    return floorIndex(this.data.juz, i) + 1
  }

  /** 1-based hizb quarter number (1..240). */
  hizbQuarterOf(i: number): number {
    return floorIndex(this.data.hizbQuarters, i) + 1
  }

  juzStart(juz: number): number {
    return this.data.juz[juz - 1]
  }

  /** Ayah indexes shown on a 1-based page, as [first, end) */
  pageRange(page: number): [number, number] {
    const first = this.data.pages[page - 1]
    const end = page < this.pageCount ? this.data.pages[page] : this.text.length
    return [first, end]
  }

  isSajda(i: number): boolean {
    return this.data.sajdas.includes(i)
  }
}

export async function loadQuran(): Promise<Quran> {
  const res = await fetch('data/quran.json')
  if (!res.ok) throw new Error(`failed to load Quran data (${res.status})`)
  return new Quran((await res.json()) as QuranData)
}

const DIGITS = '٠١٢٣٤٥٦٧٨٩'

export function arabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => DIGITS[Number(d)])
}
