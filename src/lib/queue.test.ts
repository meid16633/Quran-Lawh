import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Quran, type QuranData } from './quran'
import { type Position, type Repeats, nextPosition, startAt } from './queue'

const data = JSON.parse(readFileSync(new URL('../../public/data/quran.json', import.meta.url), 'utf8')) as QuranData
const q = new Quran(data)

function run(from: number, to: number, repeats: Repeats, limit = 100): string[] {
  const out: string[] = []
  let pos: Position | null = startAt(from, q)
  while (pos && out.length < limit) {
    out.push(pos.basmala ? 'B' : `${q.surahOf(pos.i) + 1}:${q.ayahNo(pos.i)}`)
    pos = nextPosition(pos, { from, to }, repeats, q)
  }
  return out
}

describe('playback queue', () => {
  it('plays a range once', () => {
    expect(run(q.indexOf(1, 5), q.indexOf(1, 7), { ayah: 1, range: 1 })).toEqual(['1:5', '1:6', '1:7'])
  })

  it('adds the basmala before a surah, except Al-Fatiha and At-Tawbah', () => {
    expect(run(q.indexOf(1, 7), q.indexOf(2, 1), { ayah: 1, range: 1 })).toEqual(['1:7', 'B', '2:1'])
    expect(run(q.indexOf(8, 75), q.indexOf(9, 1), { ayah: 1, range: 1 })).toEqual(['8:75', '9:1'])
    expect(run(q.indexOf(1, 1), q.indexOf(1, 1), { ayah: 1, range: 1 })).toEqual(['1:1'])
  })

  it('repeats each ayah and then the range', () => {
    expect(run(q.indexOf(112, 1), q.indexOf(112, 2), { ayah: 2, range: 2 })).toEqual([
      'B', '112:1', '112:1', '112:2', '112:2',
      'B', '112:1', '112:1', '112:2', '112:2',
    ])
  })

  it('keeps going when repeat is forever', () => {
    expect(run(q.indexOf(114, 6), q.indexOf(114, 6), { ayah: 0, range: 1 }, 5)).toHaveLength(5)
  })
})
