import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ADHKAR, HADITHS } from '../data/reminders'
import { type Periodic, CALENDAR_EVENTS, inQuiet, intervalMs, nudges, periodicIcs, upcomingTimes } from './periodic'
import { Quran, type QuranData } from './quran'

const q = new Quran(JSON.parse(readFileSync(new URL('../../public/data/quran.json', import.meta.url), 'utf8')) as QuranData)

const base: Periodic = {
  enabled: true,
  every: 3,
  unit: 'hour',
  time: '09:00',
  kinds: ['ayah', 'hadith', 'dhikr'],
  quiet: { enabled: true, from: '23:00', to: '07:00' },
  sound: true,
}

const at = (h: number, m = 0) => new Date(2026, 9, 25, h, m)

describe('periodic reminder times', () => {
  it('never goes below fifteen minutes', () => {
    expect(intervalMs({ every: 5, unit: 'minute' })).toBe(15 * 60_000)
    expect(intervalMs({ every: 2, unit: 'hour' })).toBe(2 * 3_600_000)
  })

  it('knows quiet hours that run past midnight', () => {
    expect(inQuiet(at(23, 30), base.quiet)).toBe(true)
    expect(inQuiet(at(3), base.quiet)).toBe(true)
    expect(inQuiet(at(7), base.quiet)).toBe(false)
    expect(inQuiet(at(13), { enabled: true, from: '13:00', to: '14:00' })).toBe(true)
    expect(inQuiet(at(3), { ...base.quiet, enabled: false })).toBe(false)
  })

  it('skips the quiet hours', () => {
    const times = upcomingTimes(base, at(17), 4).map((d) => d.getHours())
    // 20:00, then 23:00 / 02:00 / 05:00 are quiet, then 08:00, 11:00, 14:00.
    expect(times).toEqual([20, 8, 11, 14])
  })

  it('comes at the chosen time every few days', () => {
    const times = upcomingTimes({ ...base, unit: 'day', every: 2, time: '09:30' }, at(10), 3)
    expect(times.map((d) => [d.getDate(), d.getHours(), d.getMinutes()])).toEqual([
      [26, 9, 30],
      [28, 9, 30],
      [30, 9, 30],
    ])
    // Before the time today, the first one is today.
    expect(upcomingTimes({ ...base, unit: 'day', every: 1, time: '09:30' }, at(8), 1)[0].getDate()).toBe(25)
  })
})

describe('periodic reminder texts', () => {
  it('takes turns between the chosen kinds without repeating', () => {
    const times = upcomingTimes({ ...base, quiet: { ...base.quiet, enabled: false } }, at(0), 90)
    const list = nudges(q, base, times, 42)
    const kinds = list.map((n) => n.kind)
    expect(new Set(kinds)).toEqual(new Set(['ayah', 'hadith', 'dhikr']))
    for (let k = 1; k < kinds.length; k++) expect(kinds[k]).not.toBe(kinds[k - 1])
    const hadiths = list.filter((n) => n.kind === 'hadith').map((n) => n.body)
    expect(new Set(hadiths).size).toBe(hadiths.length)
    const ayah = list.find((n) => n.kind === 'ayah')!
    expect(ayah.body).toBe(`﴿${q.plain[ayah.ayah!]}﴾`)
    expect(ayah.title).toContain(q.surahs[q.surahOf(ayah.ayah!)].name)
  })

  it('shows only the chosen kinds', () => {
    const list = nudges(q, { ...base, kinds: ['dhikr'] }, upcomingTimes(base, at(9), 10), 1)
    expect(list.every((n) => n.kind === 'dhikr' && n.title.startsWith('ذكر'))).toBe(true)
  })

  it('has no duplicate hadith or dhikr', () => {
    const all = [...HADITHS, ...ADHKAR].map((t) => t.text)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('calendar file', () => {
  it('has one alert per reminder, with folded lines', () => {
    const { ics, last } = periodicIcs(q, base, at(10), 7, 'https://example.org/')
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(CALENDAR_EVENTS)
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(CALENDAR_EVENTS)
    const enc = new TextEncoder()
    for (const line of ics.split('\r\n')) expect(enc.encode(line).length).toBeLessThanOrEqual(75)
    expect(last.getTime()).toBeGreaterThan(at(10).getTime() + (CALENDAR_EVENTS - 1) * 3 * 3_600_000)
  })
})
