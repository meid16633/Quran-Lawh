// Builds public/data/tafsir.json from a checkout of https://github.com/spa5k/tafsir_api
// (data from Tarteel's Quranic Universal Library), pinned to the commit below:
//
//   git clone --filter=blob:none --sparse https://github.com/spa5k/tafsir_api /tmp/tafsir_api
//   git -C /tmp/tafsir_api checkout eb82bb6294efe30ad5c135c03b1864afaa70e855
//   git -C /tmp/tafsir_api sparse-checkout set tafsir/ar-tafsir-muyassar tafsir/al-muyassar-fi-al-gharib
//   node scripts/build-tafsir.mjs /tmp/tafsir_api
//
// - التفسير الميسر (King Fahd Complex). In this dataset some entries carry a surah introduction
//   («تسمية السورة / من مقاصد السورة») that is not part of al-Muyassar; it is removed and the
//   tafsir text itself is kept unchanged.
// - الميسر في غريب القرآن: meanings of unusual words, one entry per ayah (many ayahs have none).
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const COMMIT = 'eb82bb6294efe30ad5c135c03b1864afaa70e855'

const root = process.argv[2]
if (!root) {
  console.error('usage: node scripts/build-tafsir.mjs <path to tafsir_api checkout>')
  process.exit(1)
}

const quran = JSON.parse(readFileSync(new URL('../public/data/quran.json', import.meta.url), 'utf8'))

/** Removes the borrowed surah introduction from a Muyassar entry. */
export function stripIntro(text) {
  if (text.includes('[التفسير]')) return text.slice(text.lastIndexOf('[التفسير]') + '[التفسير]'.length).trim()
  if (!text.startsWith('تسمية السورة')) return text.trim()
  // No marker: the introduction is headings and "•" bullet paragraphs; the tafsir follows the last bullet.
  const paras = text.split(/\n\s*\n/)
  let last = -1
  paras.forEach((p, k) => {
    if (p.trim().startsWith('•')) last = k
  })
  return paras.slice(last + 1).join('\n\n').trim()
}

function load(slug) {
  const out = []
  quran.surahs.forEach((s, si) => {
    const entries = JSON.parse(readFileSync(join(root, 'tafsir', slug, `${si + 1}.json`), 'utf8'))
    const byAyah = new Map(entries.map((e) => [e.ayah, e.text]))
    for (let a = 1; a <= s.ayahs; a++) out.push(byAyah.get(a) ?? '')
  })
  return out
}

const muyassar = load('ar-tafsir-muyassar').map(stripIntro)
const gharib = load('al-muyassar-fi-al-gharib').map((t) => t.trim())

const empty = muyassar.filter((t) => !t).length
if (muyassar.length !== quran.text.length || empty) {
  console.error(`muyassar: ${muyassar.length} entries, ${empty} empty`)
  process.exit(1)
}
const leftovers = muyassar.filter((t) => t.includes('من مقاصد السورة') || t.includes('تسمية السورة')).length
if (leftovers) {
  console.error(`${leftovers} entries still contain a surah introduction`)
  process.exit(1)
}

writeFileSync(
  new URL('../public/data/tafsir.json', import.meta.url),
  JSON.stringify({
    source: `spa5k/tafsir_api@${COMMIT.slice(0, 7)} (Tarteel QUL): ar-tafsir-muyassar, al-muyassar-fi-al-gharib`,
    muyassar,
    gharib,
  }),
)
console.log(`wrote ${muyassar.length} tafsir entries, ${gharib.filter(Boolean).length} with word meanings`)
