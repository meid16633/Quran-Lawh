// Computes public/data/similar.json: for each ayah, the ayahs whose wording is nearly the same
// (المتشابهات اللفظية), the classic stumbling block when memorizing.
//
// Two ayahs are similar when their longest common word sequence (LCS, ignoring diacritics)
// covers most of the shorter one and is long enough to be more than a stock phrase.
import { readFileSync, writeFileSync } from 'node:fs'

const MIN_COMMON = 4 // words in common
const MIN_COVERAGE = 0.7 // of the shorter ayah
const MIN_BALANCE = 0.5 // common words / longer ayah, so a short ayah inside a very long one does not count
const MAX_PER_AYAH = 12
const COMMON_TRIGRAM = 40 // trigrams in more ayahs than this are stock phrases and are not used to find candidates

const quran = JSON.parse(readFileSync(new URL('../public/data/quran.json', import.meta.url), 'utf8'))

// Same letter normalization as src/lib/search.ts, without the dagger alef.
const MARKS = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED\u0640\u2009\u0670]/g
const normalize = (t) =>
  t
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

// A leading و / ف is ignored when matching ("فكلوا" ~ "وكلوا"): exactly the kind of difference that confuses,
// so those verses must be found. The reader still highlights the difference.
const stem = (w) => w.replace(/^[وف](?=..)/, '')
const words = quran.text.map((t) => normalize(t).split(' ').map(stem))

function lcs(a, b) {
  let prev = new Uint8Array(b.length + 1)
  for (let i = 1; i <= a.length; i++) {
    const cur = new Uint8Array(b.length + 1)
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1])
    prev = cur
  }
  return prev[b.length]
}

const index = new Map()
words.forEach((w, i) => {
  const seen = new Set()
  for (let k = 0; k + 2 < w.length; k++) {
    const key = `${w[k]} ${w[k + 1]} ${w[k + 2]}`
    if (seen.has(key)) continue
    seen.add(key)
    if (!index.has(key)) index.set(key, [])
    index.get(key).push(i)
  }
})

const similar = new Map()
const add = (i, j, score) => {
  if (!similar.has(i)) similar.set(i, [])
  similar.get(i).push([j, score])
}

let pairs = 0
for (let i = 0; i < words.length; i++) {
  if (words[i].length < MIN_COMMON) continue
  const candidates = new Set()
  for (let k = 0; k + 2 < words[i].length; k++) {
    const list = index.get(`${words[i][k]} ${words[i][k + 1]} ${words[i][k + 2]}`)
    if (list.length > COMMON_TRIGRAM) continue
    for (const j of list) if (j > i) candidates.add(j)
  }
  for (const j of candidates) {
    const a = words[i]
    const b = words[j]
    const common = lcs(a, b)
    const short = Math.min(a.length, b.length)
    const long = Math.max(a.length, b.length)
    if (common < MIN_COMMON || common / short < MIN_COVERAGE || common / long < MIN_BALANCE) continue
    const score = Math.round(((2 * common) / (a.length + b.length)) * 100)
    add(i, j, score)
    add(j, i, score)
    pairs++
  }
}

const out = {}
for (const [i, list] of similar) {
  out[i] = list.sort((x, y) => y[1] - x[1] || x[0] - y[0]).slice(0, MAX_PER_AYAH)
}
writeFileSync(new URL('../public/data/similar.json', import.meta.url), JSON.stringify(out))
console.log(`${pairs} similar pairs, ${similar.size} ayahs with similar ayahs`)
