import { Capacitor } from '@capacitor/core'
import { ADHKAR, type Book, HADITHS } from '../data/reminders'
import { arabicDigits, type Quran } from './quran'
import { createStore } from './store'

/**
 * Periodic reminders: an ayah, a hadith or a dhikr on the lock screen every few minutes, hours or days. The Android
 * app schedules a batch of notifications ahead and tops it up whenever the app is opened; on iPhone the same texts
 * can be added to the calendar as events with an alert.
 */

export type Unit = 'minute' | 'hour' | 'day'
export type Kind = 'ayah' | 'hadith' | 'dhikr'

export interface Periodic {
  enabled: boolean
  every: number
  unit: Unit
  /** "HH:MM": when a daily (or every few days) reminder comes. */
  time: string
  kinds: Kind[]
  quiet: { enabled: boolean; from: string; to: string }
  sound: boolean
}

export const periodic = createStore<Periodic>('lawh:periodic', {
  enabled: false,
  every: 3,
  unit: 'hour',
  time: '09:00',
  kinds: ['ayah', 'hadith', 'dhikr'],
  quiet: { enabled: true, from: '23:00', to: '07:00' },
  sound: true,
})

/** The shortest interval offered: closer reminders would only be noise (and Android batches them anyway). */
export const MIN_MINUTES = 15

export interface Nudge {
  at: Date
  kind: Kind
  title: string
  body: string
  /** Ayah index, to open the mushaf on it. */
  ayah?: number
}

const MINUTE = 60_000
const UNIT_MS: Record<Unit, number> = { minute: MINUTE, hour: 60 * MINUTE, day: 24 * 60 * MINUTE }

export function intervalMs(p: Pick<Periodic, 'every' | 'unit'>): number {
  return Math.max(MIN_MINUTES * MINUTE, Math.max(1, Math.round(p.every)) * UNIT_MS[p.unit])
}

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Whether a time falls in the quiet hours, which may run past midnight (23:00 – 07:00). */
export function inQuiet(d: Date, quiet: Periodic['quiet']): boolean {
  if (!quiet.enabled) return false
  const t = d.getHours() * 60 + d.getMinutes()
  const from = minutesOf(quiet.from)
  const to = minutesOf(quiet.to)
  return from <= to ? t >= from && t < to : t >= from || t < to
}

/** The next `n` reminder times after `now`. */
export function upcomingTimes(p: Periodic, now: Date, n: number): Date[] {
  const step = intervalMs(p)
  const out: Date[] = []
  if (p.unit === 'day') {
    // Every few days at a set time, starting with the next time that comes.
    const [h, m] = p.time.split(':').map(Number)
    const first = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
    if (first <= now) first.setDate(first.getDate() + 1)
    for (let k = 0; k < n; k++) {
      const d = new Date(first)
      d.setDate(first.getDate() + k * Math.max(1, Math.round(p.every)))
      out.push(d)
    }
    return out
  }
  let t = now.getTime() + step
  // A year of quiet hours is an upper bound on the times skipped.
  for (let guard = 0; out.length < n && guard < n + 400_000; guard++, t += step) {
    const d = new Date(t)
    if (!inQuiet(d, p.quiet)) out.push(d)
  }
  return out
}

let shortAyahs: number[] | null = null

/** Ayahs short enough to read at a glance on the lock screen. */
function ayahPool(q: Quran): number[] {
  shortAyahs ??= q.plain.flatMap((t, i) => {
    const n = t.split(' ').length
    return n >= 4 && n <= 18 ? [i] : []
  })
  return shortAyahs
}

const narrated = (b: Book) => (b === 'متفق عليه' ? 'متفق عليه' : `رواه ${b}`)

/** A small deterministic generator, so a batch does not repeat itself and tests can fix the seed. */
function random(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

function shuffled<T>(list: T[], rnd: () => number): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** The reminders for the given times: the chosen kinds take turns, and no text repeats until each has been shown. */
export function nudges(q: Quran, p: Periodic, times: Date[], seed: number): Nudge[] {
  const kinds = p.kinds.length ? p.kinds : (['ayah'] as Kind[])
  const rnd = random(seed)
  const lists = {
    ayah: shuffled(ayahPool(q), rnd),
    hadith: shuffled(HADITHS, rnd),
    dhikr: shuffled(ADHKAR, rnd),
  }
  const used = { ayah: 0, hadith: 0, dhikr: 0 }
  const start = Math.floor(rnd() * kinds.length)
  return times.map((at, k) => {
    const kind = kinds[(start + k) % kinds.length]
    const n = used[kind]++
    if (kind === 'ayah') {
      const i = lists.ayah[n % lists.ayah.length]
      const s = q.surahs[q.surahOf(i)]
      return { at, kind, title: `${s.name} • آية ${arabicDigits(q.ayahNo(i))}`, body: `﴿${q.plain[i]}﴾`, ayah: i }
    }
    const t = kind === 'hadith' ? lists.hadith[n % lists.hadith.length] : lists.dhikr[n % lists.dhikr.length]
    return { at, kind, title: `${kind === 'hadith' ? 'قال رسول الله ﷺ' : 'ذكر'} • ${narrated(t.source)}`, body: t.text }
  })
}

// ---- Android ----

/** Notifications scheduled ahead; ids FIRST_ID … FIRST_ID + BATCH - 1. */
export const BATCH = 100
const FIRST_ID = 1000

export const periodicAvailable = () => Capacitor.isNativePlatform()

/**
 * Replaces the scheduled batch with a fresh one starting from now (or cancels it). Called when the settings change
 * and whenever the app comes to the foreground, so the reminders never run out while the app is in use.
 * Returns false if notifications are not allowed.
 */
export async function applyPeriodic(q: Quran, p: Periodic): Promise<boolean> {
  if (!periodicAvailable()) return false
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.cancel({ notifications: Array.from({ length: BATCH }, (_, k) => ({ id: FIRST_ID + k })) })
  if (!p.enabled) return true
  let perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
  if (perm.display !== 'granted') return false
  // Channels cannot change once created, so sound and silence are two of them. Both show on the lock screen.
  await LocalNotifications.createChannel({ id: 'lawh-nudges', name: 'آيات وأذكار', importance: 3, visibility: 1 })
  await LocalNotifications.createChannel({
    id: 'lawh-nudges-silent',
    name: 'آيات وأذكار (بدون صوت)',
    importance: 2,
    visibility: 1,
  })
  const batch = nudges(q, p, upcomingTimes(p, new Date(), BATCH), Date.now())
  await LocalNotifications.schedule({
    notifications: batch.map((n, k) => ({
      id: FIRST_ID + k,
      title: n.title,
      body: n.body,
      largeBody: n.body,
      channelId: p.sound ? 'lawh-nudges' : 'lawh-nudges-silent',
      schedule: { at: n.at, allowWhileIdle: true },
      smallIcon: 'ic_stat_lawh',
      iconColor: '#1F6B52',
      isExactNotification: false,
      extra: n.ayah === undefined ? undefined : { ayah: n.ayah },
    })),
  })
  return true
}

/** Shows one reminder a few seconds from now, to see how it looks. */
export async function previewPeriodic(q: Quran, p: Periodic): Promise<boolean> {
  if (!periodicAvailable()) return false
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  let perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
  if (perm.display !== 'granted') return false
  const [n] = nudges(q, p, [new Date(Date.now() + 5000)], Date.now())
  await LocalNotifications.schedule({
    notifications: [
      {
        id: FIRST_ID + BATCH,
        title: n.title,
        body: n.body,
        largeBody: n.body,
        schedule: { at: n.at, allowWhileIdle: true },
        smallIcon: 'ic_stat_lawh',
        iconColor: '#1F6B52',
        isExactNotification: false,
        extra: n.ayah === undefined ? undefined : { ayah: n.ayah },
      },
    ],
  })
  return true
}

// ---- iPhone: calendar ----

/** Events added to the calendar at once; the file can be added again when they run out. */
export const CALENDAR_EVENTS = 100

/** Calendar alerts suit reminders an hour or more apart; closer ones would bury the calendar. */
export const calendarAllowed = (p: Periodic) => intervalMs(p) >= UNIT_MS.hour

/** An iCalendar file with one event per reminder, its text as the title so the alert shows it. */
export function periodicIcs(q: Quran, p: Periodic, now: Date, seed: number, url?: string): { ics: string; last: Date } {
  const list = nudges(q, p, upcomingTimes(p, now, CALENDAR_EVENTS), seed)
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  const escape = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lawh//Quran//AR', 'CALSCALE:GREGORIAN']
  for (const n of list) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:lawh-nudge-${stamp(n.at)}@lawh`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${stamp(n.at)}`,
      `DTEND:${stamp(new Date(n.at.getTime() + 5 * MINUTE))}`,
      `SUMMARY:${escape(n.body)}`,
      `DESCRIPTION:${escape(n.title)}`,
      ...(url ? [`URL:${url}`] : []),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escape(n.body)}`,
      'TRIGGER:PT0S',
      'END:VALARM',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return { ics: fold(lines).join('\r\n') + '\r\n', last: list[list.length - 1].at }
}

/** iCalendar lines are at most 75 octets; longer ones continue on the next line after a space. */
function fold(lines: string[]): string[] {
  const enc = new TextEncoder()
  return lines.map((line) => {
    if (enc.encode(line).length <= 75) return line
    const parts: string[] = []
    let cur = ''
    for (const ch of line) {
      if (enc.encode(cur + ch).length > (parts.length ? 74 : 75)) {
        parts.push(cur)
        cur = ''
      }
      cur += ch
    }
    parts.push(cur)
    return parts.join('\r\n ')
  })
}
