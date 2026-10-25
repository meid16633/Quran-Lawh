// Builds public/data/quran.json from pinned npm packages:
// - quran-json: Uthmani text of the King Fahd Glorious Quran Printing Complex (via quranenc.com)
// - quran-meta: Madinah mushaf page, juz, hizb and sajda boundaries (Hafs)
// The verse text is copied byte-for-byte; nothing is edited.
// Run with `npm run data`, which installs those exact versions without adding them to package.json.
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { HizbQuarterList, JuzList, PageList, SajdaList, SurahList, meta } from 'quran-meta/hafs'

const require = createRequire(import.meta.url)
const chapters = JSON.parse(readFileSync(require.resolve('quran-json/dist/quran.json'), 'utf8'))

const fail = (msg) => {
  console.error(msg)
  process.exit(1)
}

if (chapters.length !== meta.numSurahs) fail(`expected ${meta.numSurahs} surahs, got ${chapters.length}`)

const surahs = []
const text = []
chapters.forEach((ch, i) => {
  const [start, count, , , , isMeccan] = SurahList[i + 1]
  if (ch.id !== i + 1) fail(`surah ${i + 1} out of order`)
  if (ch.verses.length !== count || ch.total_verses !== count) fail(`surah ${ch.id}: verse count mismatch`)
  if (text.length + 1 !== start) fail(`surah ${ch.id}: start ayah mismatch`)
  ch.verses.forEach((v, j) => {
    if (v.id !== j + 1) fail(`${ch.id}:${j + 1} out of order`)
    text.push(v.text)
  })
  surahs.push({ name: ch.name, tname: ch.transliteration, meccan: isMeccan, ayahs: count })
})
if (text.length !== meta.numAyahs) fail(`expected ${meta.numAyahs} ayahs, got ${text.length}`)

// quran-meta lists are 1-based ayah ids with a leading placeholder and a trailing sentinel;
// store them as 0-based indexes into `text`.
const starts = (list, n) => {
  const out = list.slice(1, n + 1).map((id) => id - 1)
  if (out.length !== n) fail('boundary list has the wrong length')
  return out
}

const data = {
  version: 1,
  source: {
    text: "Uthmani text of the King Fahd Glorious Qur'an Printing Complex, via The Noble Qur'an Encyclopedia (quranenc.com), packaged by quran-json (CC BY-SA 4.0, Risan Bagja Pradana)",
    meta: 'Page, juz and hizb boundaries from quran-meta (MIT)',
  },
  surahs,
  text,
  pages: starts(PageList, meta.numPages),
  juz: starts(JuzList, meta.numJuzs),
  hizbQuarters: starts(HizbQuarterList, meta.numRubAlHizbs),
  sajdas: SajdaList.map((id) => id - 1),
}

writeFileSync(new URL('../public/data/quran.json', import.meta.url), JSON.stringify(data))
console.log(`wrote ${text.length} ayahs, ${surahs.length} surahs, ${data.pages.length} pages`)
