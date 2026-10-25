import { describe, expect, it } from 'vitest'
import { dailyReminderIcs } from './calendar'

describe('daily reminder calendar file', () => {
  it('repeats daily at the chosen local time until the end date, with an alert', () => {
    const ics = dailyReminderIcs({
      title: 'ورد لوح',
      description: 'وردك اليوم ٣ صفحات',
      first: new Date(2026, 9, 26),
      time: '20:30',
      until: new Date(2027, 4, 15),
    })
    expect(ics).toContain('DTSTART:20261026T203000')
    expect(ics).toContain('DTEND:20261026T204500')
    expect(ics).toContain('RRULE:FREQ=DAILY;UNTIL=20270515T235959')
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics).toContain('SUMMARY:ورد لوح')
    expect(ics.split('\r\n').at(-1)).toBe('')
  })

  it('handles an evening time that ends after midnight', () => {
    const ics = dailyReminderIcs({ title: 'x', description: 'y', first: new Date(2026, 0, 1), time: '23:50', until: new Date(2026, 0, 2) })
    expect(ics).toContain('DTEND:20260102T000500')
  })
})
