/**
 * An iCalendar file with a daily reminder. iPhone web apps cannot schedule notifications, but
 * opening this file adds a repeating event with an alert to the phone's calendar.
 */
export function dailyReminderIcs(opts: {
  title: string
  description: string
  /** Local date of the first reminder. */
  first: Date
  /** "HH:MM" local time. */
  time: string
  /** Last day to remind, inclusive. */
  until: Date
  url?: string
}): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const [hour, minute] = opts.time.split(':').map(Number)
  const date = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const stamp = (d: Date) => `${date(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  const startAt = new Date(opts.first.getFullYear(), opts.first.getMonth(), opts.first.getDate(), hour, minute)
  const start = stamp(startAt)
  // A 15-minute event; past midnight it ends on the next day.
  const end = stamp(new Date(startAt.getTime() + 15 * 60_000))
  const escape = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lawh//Quran//AR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:lawh-wird-${start}@lawh`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
    // Floating local times: the reminder follows the phone's time zone.
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `RRULE:FREQ=DAILY;UNTIL=${date(opts.until)}T235959`,
    `SUMMARY:${escape(opts.title)}`,
    `DESCRIPTION:${escape(opts.description)}`,
    ...(opts.url ? [`URL:${opts.url}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(opts.title)}`,
    'TRIGGER:PT0S',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n') + '\r\n'
}
