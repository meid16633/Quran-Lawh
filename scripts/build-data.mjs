// Builds public/data/quran.json from the official King Fahd Glorious Qur'an Printing Complex release
// (Uthmanic Hafs v18, https://qurancomplex.gov.sa/en/techquran/dev/), as mirrored with its font in
// https://github.com/thetruetruth/quran-data-kfgqpc, pinned to the commit below:
//
//   git clone --filter=blob:none --no-checkout https://github.com/thetruetruth/quran-data-kfgqpc /tmp/kfgqpc
//   git -C /tmp/kfgqpc checkout 281dbbe8eed1370daa5a023b6cd81655cbfd6473 -- hafs
//   npm run data -- /tmp/kfgqpc
//
// The verse text is copied as published; only the trailing ayah number is removed (the app adds it).
// As a safeguard every ayah is compared, letter by letter, with the independent copy of the King Fahd
// text in quran-json (via quranenc.com), and the build fails on any difference in letters.
// Page and juz numbers come from the release; hizb quarters and sajdas from quran-meta.
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { HizbQuarterList, SajdaList, SurahList, meta } from 'quran-meta/hafs'

export const COMMIT = '281dbbe8eed1370daa5a023b6cd81655cbfd6473'

const root = process.argv[2]
if (!root) {
  console.error('usage: npm run data -- <path to quran-data-kfgqpc checkout>')
  process.exit(1)
}
const fail = (msg) => {
  console.error(msg)
  process.exit(1)
}

const rows = JSON.parse(readFileSync(join(root, 'hafs/data/hafsData_v18.json'), 'utf8'))
const require = createRequire(import.meta.url)
const check = JSON.parse(readFileSync(require.resolve('quran-json/dist/quran.json'), 'utf8')).flatMap((s) =>
  s.verses.map((v) => v.text),
)

if (rows.length !== meta.numAyahs) fail(`expected ${meta.numAyahs} ayahs, got ${rows.length}`)

// Letters only: no marks, tatweel, spaces or hamza spelling, for comparing two encodings of one text.
const letters = (t) =>
  t
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640ء\u2009\u00A0 ]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/[٠-٩\u06DE\u06E9]/g, '')

const surahs = []
const text = []
const plain = []
const pages = []
const juz = []
rows.forEach((r, i) => {
  if (r.id !== i + 1) fail(`row ${i + 1} out of order`)
  const s = r.sora
  if (r.aya_no === 1) {
    const [start, count, , , , isMeccan] = SurahList[s]
    if (start !== i + 1) fail(`surah ${s} starts at the wrong ayah`)
    surahs.push({ name: r.sora_name_ar, tname: r.sora_name_en, meccan: isMeccan, ayahs: count })
  }
  const t = r.aya_text.replace(/\u00A0?[٠-٩]+$/, '').trim()
  if (letters(t) !== letters(check[i])) fail(`${s}:${r.aya_no} differs from the reference text`)
  text.push(t)
  plain.push(r.aya_text_emlaey.trim())
  if (r.page !== pages.length) {
    if (r.page !== pages.length + 1) fail(`page ${r.page} out of order`)
    pages.push(i)
  }
  if (r.jozz !== juz.length) {
    if (r.jozz !== juz.length + 1) fail(`juz ${r.jozz} out of order`)
    juz.push(i)
  }
})
if (surahs.length !== meta.numSurahs || pages.length !== meta.numPages || juz.length !== meta.numJuzs) {
  fail(`got ${surahs.length} surahs, ${pages.length} pages, ${juz.length} juz`)
}

// quran-meta lists are 1-based ayah ids with a leading placeholder; a juz always starts a hizb quarter,
// so the eight quarters of each juz are aligned with the release's juz starts.
const hizbQuarters = HizbQuarterList.slice(1, meta.numRubAlHizbs + 1).map((id) => id - 1)
juz.forEach((start, j) => (hizbQuarters[j * 8] = start))

const data = {
  version: 2,
  source: {
    text: "King Fahd Glorious Qur'an Printing Complex, Uthmanic Hafs v18 (qurancomplex.gov.sa)",
    meta: 'Pages and juz from the same release; hizb quarters and sajdas from quran-meta (MIT)',
  },
  surahs,
  text,
  plain,
  pages,
  juz,
  hizbQuarters,
  sajdas: SajdaList.map((id) => id - 1),
}

writeFileSync(new URL('../public/data/quran.json', import.meta.url), JSON.stringify(data))
console.log(`wrote ${text.length} ayahs, ${surahs.length} surahs, ${pages.length} pages; all ayahs match the reference letters`)
