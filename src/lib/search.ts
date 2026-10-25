import type { Quran } from './quran'

// Quranic annotation marks, harakat, small high letters, tatweel and the odd thin space.
const MARKS = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED\u0640\u2009]/g
const DAGGER_ALEF = '\u0670'

/** Reduce Arabic text to bare letters so the user can search without diacritics. */
export function normalize(text: string): string {
  return text
    .replace(MARKS, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/[^ء-ي ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    // The vocative is written joined in the mushaf's modern text ("ياأيها"); treat "يا أيها" the same.
    .replace(/(^| )يا (?=\S)/g, '$1يا')
}

/**
 * Uthmani spelling writes some long vowels with a dagger alef (ٱلصَّلَوٰة, ٱلسَّمَٰوَٰت, عَلَىٰ).
 * People type the modern spelling, so each verse is indexed in several readings of it, including the
 * modern (إملائي) text published with the mushaf.
 */
export function searchForms(verse: string, plain = ''): string[] {
  const forms = [normalize(verse.replaceAll(DAGGER_ALEF, ''))]
  if (plain) forms.push(normalize(plain))
  if (verse.includes(DAGGER_ALEF)) {
    const bare = verse.replace(MARKS, '')
    forms.push(normalize(bare.replaceAll(DAGGER_ALEF, 'ا')))
    forms.push(normalize(bare.replace(/[وى]\u0670/g, 'ا').replaceAll(DAGGER_ALEF, 'ا')))
  }
  return [...new Set(forms)]
}

export class SearchIndex {
  private readonly forms: string[][]
  private readonly surahNames: string[]

  constructor(private readonly quran: Quran) {
    this.forms = quran.text.map((t, i) => searchForms(t, quran.plain[i]))
    this.surahNames = quran.surahs.map((s) => normalize(s.name))
  }

  /** Ayah indexes whose text contains the query, in mushaf order. */
  ayahs(query: string, limit = 300): { results: number[]; total: number } {
    const q = normalize(query)
    const results: number[] = []
    let total = 0
    if (q.length < 2) return { results, total }
    this.forms.forEach((forms, i) => {
      if (forms.some((f) => f.includes(q))) {
        total++
        if (results.length < limit) results.push(i)
      }
    })
    return { results, total }
  }

  /** 0-based surah indexes whose name matches the query (ignoring a leading "سورة"). */
  surahs(query: string): number[] {
    const q = normalize(query).replace(/^سوره ?/, '')
    if (!q) return []
    return this.surahNames.flatMap((name, i) => (name.includes(q) || name.replace(/^ال/, '').startsWith(q) ? [i] : []))
  }

  /** Parses "2:255", "2 255" or "البقرة 255" into an ayah index. */
  reference(query: string): number | null {
    const m = query.trim().match(/^(.+?)[\s:،,]+([\d٠-٩]+)$/)
    if (!m) return null
    const ayah = toNumber(m[2])
    const surahNum = /^[\d٠-٩]+$/.test(m[1]) ? toNumber(m[1]) : (this.surahs(m[1])[0] ?? -1) + 1
    if (surahNum < 1 || surahNum > this.quran.surahs.length) return null
    if (ayah < 1 || ayah > this.quran.surahs[surahNum - 1].ayahs) return null
    return this.quran.indexOf(surahNum, ayah)
  }
}

function toNumber(s: string): number {
  return Number(s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)))
}
