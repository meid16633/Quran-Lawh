// Checks every hadith and dhikr in src/data/reminders.ts against the full text of the book it is attributed to:
// its words, ignoring diacritics, punctuation and the spelling of hamza and alef, must appear in order in at least
// one hadith of that book (both books for «متفق عليه»). The first word may carry a prefix there (وَمَنْ for مَنْ,
// لَأَسْتَغْفِرُ for أَسْتَغْفِرُ), since a short text is often quoted from the middle of a longer one. The book texts
// are those of Sunnah.com, as packaged in https://github.com/AhmedBaset/hadith-json; they are only read here, never
// shipped.
//
//   git clone --filter=blob:none --sparse https://github.com/AhmedBaset/hadith-json /tmp/hadith-json
//   git -C /tmp/hadith-json sparse-checkout set --no-cone /db/by_book/the_9_books/bukhari.json \
//     /db/by_book/the_9_books/muslim.json
//   node --experimental-strip-types scripts/check-reminders.mjs /tmp/hadith-json
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.argv[2]
if (!root) {
  console.error('usage: node --experimental-strip-types scripts/check-reminders.mjs <hadith-json checkout>')
  process.exit(1)
}
const { HADITHS, ADHKAR } = await import('../src/data/reminders.ts')

/** Bare letters and single spaces. */
export function bare(s) {
  return s
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/[^ء-ي ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const book = (name) =>
  JSON.parse(readFileSync(join(root, 'db/by_book/the_9_books', `${name}.json`), 'utf8')).hadiths.map((h) => ({
    n: h.idInBook,
    text: ` ${bare(h.arabic)} `,
  }))
const books = { البخاري: book('bukhari'), مسلم: book('muslim') }

let failed = 0
for (const { text, source } of [...HADITHS, ...ADHKAR]) {
  const needle = new RegExp(` [وفلب]?${bare(text)} `)
  const where = source === 'متفق عليه' ? ['البخاري', 'مسلم'] : [source]
  const found = where.map((b) => books[b].find((h) => needle.test(h.text)))
  if (found.every(Boolean)) {
    console.log(`ok  ${source.padEnd(9)} ${found.map((h) => h.n).join(', ').padEnd(12)} ${text}`)
  } else {
    failed++
    console.log(`NOT FOUND in ${where.filter((_, k) => !found[k]).join(' and ')}: ${text}`)
  }
}
if (failed) {
  console.error(`${failed} texts were not found in the book they are attributed to`)
  process.exit(1)
}
