// Builds public/data/tajweed.json: the tajweed colours of every ayah, as positions in our King Fahd text.
//
// The rules come from https://github.com/cpfair/quran-tajweed (CC BY 4.0), built from the Dar al-Maarifah
// colour-coded mushaf and ReciteQuran.com. Its annotations are character offsets into the Tanzil Uthmani text it
// was computed against; that exact text ships in the `quran` npm package (0.0.9) — running the project's own
// classifier over it reproduces the published annotations for all 6236 ayahs. The two Uthmani texts encode some
// marks differently and spell a few hamzas differently, so each annotation is moved over letter by letter: the
// base letters of both texts are aligned per ayah (an LCS that treats the alef and hamza forms as equal) and a
// coloured letter is coloured on the same letter here, together with the marks written on it.
//
//   git clone https://github.com/cpfair/quran-tajweed /tmp/quran-tajweed
//   git -C /tmp/quran-tajweed checkout 496f71cd191da00fa2a37ded79dbbddb033bb0ad
// A second, independent rule set — the scholar-authored corpus of https://github.com/quran-ws/quran-tajweed
// (CC BY 4.0, engine MIT), which runs directly on our text — fills the few ghunnah rulings the first one misses
// (a doubled meem that opens an ayah, some tanweens) and the muttasil madds it reads as munfasil: see scripts/check-tajweed.mjs for how to build it.
//
//   npm run tajweed -- /tmp/quran-tajweed /tmp/qws
//
// scripts/check-tajweed.mjs then compares the result with that second rule set colour by colour.
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

export const COMMIT = '496f71cd191da00fa2a37ded79dbbddb033bb0ad'
export const SECOND_COMMIT = '4fec00b726d32163fba72b41c2f4cfdd025fe645'

/** Colour classes, in the order a letter claimed by two rules is given to the earlier one. */
export const CLASSES = ['madd6', 'madd45', 'madd246', 'ghunnah', 'qalqalah', 'idgham', 'silent', 'madd2']

const RULE_CLASS = {
  madd_6: 'madd6',
  madd_muttasil: 'madd45',
  madd_munfasil: 'madd246',
  madd_246: 'madd246',
  madd_2: 'madd2',
  ghunnah: 'ghunnah',
  ikhfa: 'ghunnah',
  ikhfa_shafawi: 'ghunnah',
  iqlab: 'ghunnah',
  idghaam_ghunnah: 'ghunnah',
  idghaam_shafawi: 'ghunnah',
  qalqalah: 'qalqalah',
  hamzat_wasl: 'silent',
  lam_shamsiyyah: 'silent',
  silent: 'silent',
  idghaam_no_ghunnah: 'idgham',
  idghaam_mutajanisayn: 'idgham',
  idghaam_mutaqaribayn: 'idgham',
}

const MARK = /\p{Mn}/u
const DAGGER = '\u0670'
const SMALL_YEH = '\u06E7'
const TANWEEN = /[\u064B-\u064D]/

/**
 * Letters for alignment: [base character, index of its first code unit]. A dagger alef counts as a letter, and
 * so does the small high yeh our text writes where Tanzil has a small yeh (إِبۡرَٰهِـۧمَ).
 */
export function letters(text) {
  const out = []
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === ' ' || c === '\u00A0') continue
    if (MARK.test(c) && c !== DAGGER && c !== SMALL_YEH) continue
    out.push([c, i])
  }
  return out
}

/**
 * Render clusters of our text: a base character and every mark after it (a dagger alef stays on its letter,
 * since a mark cut away from its letter is drawn on a dotted circle). Returns, for each code unit, its cluster's
 * [start, end).
 */
export function clusters(text) {
  const span = new Array(text.length)
  let i = 0
  while (i < text.length) {
    let j = i + 1
    while (j < text.length && MARK.test(text[j])) j++
    for (let k = i; k < j; k++) span[k] = [i, j]
    i = j
  }
  return span
}

const FOLD = { 'ٱ': 'ا', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', [DAGGER]: 'ا', 'ى': 'ي', 'ئ': 'ي', 'ی': 'ي', 'ؤ': 'و', '\u06E5': 'و', '\u06E6': 'ي', [SMALL_YEH]: 'ي' }
const fold = (c) => FOLD[c] ?? c

/** Longest common subsequence of two letter lists; returns a map from indexes of `a` to indexes of `b`. */
export function align(a, b) {
  const n = a.length
  const m = b.length
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = fold(a[i][0]) === fold(b[j][0]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const map = new Map()
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (fold(a[i][0]) === fold(b[j][0])) map.set(i++, j++)
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  return map
}

/**
 * Moves one ayah's annotations from the Tanzil text onto ours. `extra` are [start, end, class] spans already in our
 * text, used only where no annotation gave that class. Returns [start, end, class] runs and stats.
 */
export function transfer(source, annotations, target, extra = []) {
  const from = letters(source)
  const to = letters(target)
  const map = align(from, to)
  const span = clusters(target)
  const letterAt = new Map(from.map(([, i], k) => [i, k]))
  const owner = (i) => {
    // The letter a code unit belongs to: the last base character at or before it.
    for (let k = i; k >= 0; k--) if (letterAt.has(k)) return letterAt.get(k)
    return -1
  }

  const cls = new Array(target.length).fill(null)
  const paint = ([s, e], c) => {
    for (let k = s; k < e; k++) if (cls[k] === null || CLASSES.indexOf(c) < CLASSES.indexOf(cls[k])) cls[k] = c
  }
  let moved = 0
  let lost = 0
  let filled = 0
  for (const { rule, start, end } of annotations) {
    const c = RULE_CLASS[rule]
    if (!c) throw new Error(`unknown rule ${rule}`)
    let ls = []
    for (let i = start; i < end; i++) if (letterAt.has(i)) ls.push(letterAt.get(i))
    // An annotation on marks only (a maddah) colours the letter carrying them. A ghunnah that starts on a tanween
    // colours the letter carrying the tanween as well as the letters after it; an idgham without ghunnah does not,
    // since that letter is pronounced in full.
    if (!ls.length || (c === 'ghunnah' && TANWEEN.test(source[start]))) ls.unshift(owner(start))
    for (const l of ls) {
      if (!map.has(l)) {
        lost++
        continue
      }
      moved++
      paint(span[to[map.get(l)][1]], c)
    }
  }
  for (const [start, end, c] of extra) {
    let free = true
    for (let k = start; k < end; k++) if (cls[k] === c) free = false
    if (!free) continue
    filled++
    for (let k = start; k < end; ) {
      paint(span[k], c)
      k = span[k][1]
    }
  }

  const runs = []
  for (let i = 0; i < target.length; ) {
    if (cls[i] === null) {
      i++
      continue
    }
    let j = i + 1
    while (j < target.length && cls[j] === cls[i]) j++
    runs.push([i, j, cls[i]])
    i = j
  }
  return { runs, moved, lost, filled }
}

/** The second rule set's ahkam that are coloured as ghunnah. */
export const GHUNNAH_AHKAM = [
  'ikhfa-haqiqi-noon',
  'ikhfa-haqiqi-tanween',
  'ikhfa-shafawi-meem',
  'iqlab-noon',
  'iqlab-tanween',
  'idgham-bi-ghunnah-noon',
  'idgham-bi-ghunnah-tanween',
  'idgham-shafawi-meem',
  'noon-mushaddadah',
  'meem-mushaddadah',
]

const VOCATIVE = new RegExp('^[وف]?[\\u064E\\u0650]?[يه]\\u064E\\u0670\\u0653')

/** Whether a madd at `start` is the يَٰٓ / هَٰٓ joined to the next word (يَٰٓأَيُّهَا، هَٰٓأَنتُمۡ): two words, so munfasil. */
export function vocativeMadd(text, start) {
  const from = text.lastIndexOf(' ', start) + 1
  const m = text.slice(from).match(VOCATIVE)
  return Boolean(m) && start < from + m[0].length
}

/** Loads the second rule set's engine from a built quran-ws/quran-tajweed checkout. */
export async function loadEngine(root) {
  const { Tajweed } = await import(pathToFileURL(join(root, 'packages/core/dist/index.js')).href)
  const corpus = JSON.parse(readFileSync(join(root, 'packages/rules/rules.json'), 'utf8'))
  return new Tajweed(corpus, { school: 'ibn-al-jazari' })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [root, second] = process.argv.slice(2)
  if (!root || !second) {
    console.error('usage: node scripts/build-tajweed.mjs <quran-tajweed checkout> <built quran-ws/quran-tajweed checkout>')
    process.exit(1)
  }
  const engine = await loadEngine(second)
  const require = createRequire(import.meta.url)
  const db = new DatabaseSync(join(require.resolve('quran/package.json'), '..', 'data', 'qurandb'), { readOnly: true })
  const tanzil = db.prepare('select ar from ar order by chapter, verse').all().map((r) => r.ar)
  const quran = JSON.parse(readFileSync(new URL('../public/data/quran.json', import.meta.url), 'utf8'))
  const data = JSON.parse(readFileSync(join(root, 'output', 'tajweed.hafs.uthmani-pause-sajdah.json'), 'utf8'))
  if (data.length !== quran.text.length || tanzil.length !== quran.text.length) throw new Error('ayah count mismatch')

  let moved = 0
  let lost = 0
  let filled = 0
  const ayahs = data.map((entry, i) => {
    let source = tanzil[i]
    let annotations = entry.annotations
    // Tanzil puts the basmala (four words, once spelled with a shadda on the ba) in front of the first ayah of
    // each surah; our text does not.
    const bism = source.split(' ').slice(0, 4).join(' ') + ' '
    if (entry.ayah === 1 && entry.surah !== 1 && entry.surah !== 9) {
      source = source.slice(bism.length)
      annotations = annotations
        .filter((a) => a.start >= bism.length)
        .map((a) => ({ ...a, start: a.start - bism.length, end: a.end - bism.length }))
    }
    const text = quran.text[i]
    const extra = engine.analyze(text).flatMap((sp) => {
      if (GHUNNAH_AHKAM.includes(sp.hukumId)) return [[sp.start, sp.end, 'ghunnah']]
      // A madd before a hamza in the same word (تَبُوٓأَ).
      if (sp.hukumId === 'madd-muttasil' && !vocativeMadd(text, sp.start)) return [[sp.start, sp.end, 'madd45']]
      return []
    })
    const r = transfer(source, annotations, quran.text[i], extra)
    moved += r.moved
    lost += r.lost
    filled += r.filled
    // Packed: start delta from the previous run's end, length, class index.
    const out = []
    let last = 0
    for (const [s, e, c] of r.runs) {
      // The first rule set reads some joined vocatives (يَٰٓـَٔادَمُ، هَٰٓؤُلَآءِ) as muttasil.
      const cls = c === 'madd45' && vocativeMadd(text, s) ? 'madd246' : c
      out.push(s - last, e - s, CLASSES.indexOf(cls))
      last = e
    }
    return out
  })

  const share = lost / (moved + lost)
  console.log(`letters coloured: ${moved}, without a matching letter: ${lost} (${(share * 100).toFixed(3)}%)`)
  console.log(`rulings added from the second rule set: ${filled}`)
  if (share > 0.002) {
    console.error('too many annotations could not be placed; the alignment is wrong')
    process.exit(1)
  }
  writeFileSync(
    new URL('../public/data/tajweed.json', import.meta.url),
    JSON.stringify({
      source: `cpfair/quran-tajweed@${COMMIT.slice(0, 7)}, quran-ws/quran-tajweed@${SECOND_COMMIT.slice(0, 7)} (CC BY 4.0)`,
      classes: CLASSES,
      ayahs,
    }),
  )
  console.log(`wrote tajweed for ${ayahs.length} ayahs`)
}
