// Compares public/data/tajweed.json with an independent rule set: the scholar-authored corpus of
// https://github.com/quran-ws/quran-tajweed (CC BY 4.0, engine MIT), run directly over our text. The two were built
// in different ways (decision trees learned from a colour-coded mushaf vs. rules written from Tuhfat al-Atfal and
// al-Jazariyyah), so agreement word by word is a check on both the rules and on how they were moved onto our text.
//
//   git clone https://github.com/quran-ws/quran-tajweed /tmp/qws
//   git -C /tmp/qws checkout 4fec00b726d32163fba72b41c2f4cfdd025fe645
//   (cd /tmp/qws/packages/core && npx tsc --ignoreConfig --outDir dist --rootDir src --module nodenext \
//     --target es2022 --skipLibCheck src/*.ts)
//   node scripts/check-tajweed.mjs /tmp/qws
import { readFileSync } from 'node:fs'
import { GHUNNAH_AHKAM, loadEngine, vocativeMadd } from './build-tajweed.mjs'

const root = process.argv[2]
if (!root) {
  console.error('usage: node scripts/check-tajweed.mjs <path to a built quran-ws/quran-tajweed checkout>')
  process.exit(1)
}
const engine = await loadEngine(root)

const quran = JSON.parse(readFileSync(new URL('../public/data/quran.json', import.meta.url), 'utf8'))
const tajweed = JSON.parse(readFileSync(new URL('../public/data/tajweed.json', import.meta.url), 'utf8'))

// Their ahkam, grouped like our colours. Only colours both sets cover fully are compared: their corpus has no
// silent letters, and it marks far fewer munfasil madds than are in the text (بِمَآ أُنزِلَ in 2:4 is missing).
const THEIRS = {
  ghunnah: GHUNNAH_AHKAM,
  qalqalah: ['qalqalah-sughra', 'qalqalah-mutatarrifa', 'qalqalah-kubra'],
  // Ours also colours the mutajanisayn and mutaqaribayn idghams, theirs has the noon and tanween ones.
  idgham: ['idgham-bila-ghunnah-noon', 'idgham-bila-ghunnah-tanween', 'mutajanisain-idgham-naqis'],
  madd6: ['madd-lazim-harfi', 'madd-lazim-kalimi-muthaqqal', 'madd-lazim-kalimi-mukhaffaf'],
  madd45: ['madd-muttasil'],
}

// Spans are matched by overlap: the two sets cut a ruling differently (one colours the noon, the other the noon and
// the letter after it), but a ruling both found overlaps in both.
const ours = Object.fromEntries(Object.keys(THEIRS).map((k) => [k, []]))
const theirs = Object.fromEntries(Object.keys(THEIRS).map((k) => [k, []]))
quran.text.forEach((text, i) => {
  const packed = tajweed.ayahs[i]
  let pos = 0
  for (let k = 0; k < packed.length; k += 3) {
    const start = pos + packed[k]
    const end = start + packed[k + 1]
    pos = end
    const cls = tajweed.classes[packed[k + 2]]
    if (ours[cls]) ours[cls].push([i, start, end])
  }
  for (const span of engine.analyze(text)) {
    // Their corpus reads the joined vocative (يَٰٓأَيُّهَا، هَٰٓأَنتُمۡ) as muttasil; it is two words, so munfasil.
    if (span.hukumId === 'madd-muttasil' && vocativeMadd(text, span.start)) continue
    for (const [cls, ids] of Object.entries(THEIRS)) if (ids.includes(span.hukumId)) theirs[cls].push([i, span.start, span.end])
  }
})

const overlaps = (x, list) => list.some((y) => y[0] === x[0] && y[1] < x[2] && x[1] < y[2])
const byAyah = (list) => {
  const m = new Map()
  for (const x of list) m.set(x[0], [...(m.get(x[0]) ?? []), x])
  return m
}
const word = ([i, s]) => {
  const text = quran.text[i]
  return text.slice(text.lastIndexOf(' ', s) + 1).split(' ')[0] + ` (${i})`
}

let failed = false
for (const cls of Object.keys(THEIRS)) {
  const a = ours[cls]
  const b = theirs[cls]
  const am = byAyah(a)
  const bm = byAyah(b)
  const onlyOurs = a.filter((x) => !overlaps(x, bm.get(x[0]) ?? []))
  const onlyTheirs = b.filter((x) => !overlaps(x, am.get(x[0]) ?? []))
  const agreement = 1 - (onlyOurs.length + onlyTheirs.length) / (a.length + b.length)
  console.log(
    `${cls.padEnd(9)} ours ${String(a.length).padStart(6)}  theirs ${String(b.length).padStart(6)}  ` +
      `only ours ${String(onlyOurs.length).padStart(5)}  only theirs ${String(onlyTheirs.length).padStart(5)}  ` +
      `agreement ${(agreement * 100).toFixed(1)}%`,
  )
  console.log(`          only ours: ${onlyOurs.slice(0, 5).map(word).join('، ')}`)
  console.log(`          only theirs: ${onlyTheirs.slice(0, 5).map(word).join('، ')}`)
  if (agreement < 0.95) failed = true
}
if (failed) {
  console.error('the two rule sets disagree on more than 5% of the rulings for some colour')
  process.exit(1)
}
