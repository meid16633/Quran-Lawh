import { useState } from 'react'
import { dailyReminderIcs } from '../lib/calendar'
import { dateOfDay, dayNumber } from '../lib/dates'
import { type Reminder, applyReminder, reminder, reminderText, remindersAvailable } from '../lib/reminder'
import { useStore } from '../lib/store'
import { Icon } from './Icon'

/**
 * The daily reminder: a notification in the Android app; on iPhone and the web, a repeating
 * event added to the phone's calendar (the only free way to get a reminder there).
 */
export function ReminderControls({ untilDay, text }: { untilDay?: number; text?: string }) {
  const r = useStore(reminder)
  const [message, setMessage] = useState<string | null>(null)
  const native = remindersAvailable()

  const update = async (patch: Partial<Reminder>) => {
    const next = { ...r, ...patch }
    reminder.set(next)
    if (!native) return
    const ok = await applyReminder(next)
    if (!ok && next.enabled) {
      reminder.set({ ...next, enabled: false })
      setMessage('لم يُسمح بالإشعارات. فعّلها للتطبيق من إعدادات الهاتف ثم حاول مرة أخرى.')
    } else {
      setMessage(next.enabled ? 'سيصلك التذكير كل يوم في الموعد المحدد.' : null)
    }
  }

  const addToCalendar = () => {
    const today = dayNumber()
    const ics = dailyReminderIcs({
      title: 'ورد لوح',
      description: text ?? reminderText(),
      first: dateOfDay(today),
      time: r.time,
      until: dateOfDay(untilDay ?? today + 365),
      url: location.href.split('#')[0],
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
    a.download = 'lawh-wird.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    setMessage('افتح الملف واختر «إضافة الكل» ليُضاف التذكير إلى التقويم.')
  }

  return (
    <div className="reminder">
      {native && (
        <label className="toggle-row">
          <input type="checkbox" checked={r.enabled} onChange={(e) => void update({ enabled: e.target.checked })} />
          <span>ذكّرني بالورد كل يوم</span>
        </label>
      )}
      <label className="toggle-row">
        <span>موعد التذكير</span>
        <input className="input time-input" type="time" value={r.time} onChange={(e) => void update({ time: e.target.value })} />
      </label>
      {!native && (
        <button className="button secondary" onClick={addToCalendar}>
          <Icon name="calendar" size={18} /> أضف التذكير اليومي إلى التقويم
        </button>
      )}
      {message && <p className="muted">{message}</p>}
    </div>
  )
}
