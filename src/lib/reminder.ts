import { Capacitor } from '@capacitor/core'
import { createStore } from './store'

export interface Reminder {
  enabled: boolean
  /** "HH:MM" in local time. */
  time: string
}

export const reminder = createStore<Reminder>('lawh:reminder', { enabled: false, time: '20:00' })

const ID = 1

/** Daily local notifications need the Android app; the web app has no way to wake itself up. */
export const remindersAvailable = () => Capacitor.isNativePlatform()

/** Applies the saved reminder: cancels the old one and schedules the new one. Returns false if notifications are not allowed. */
export async function applyReminder(r: Reminder): Promise<boolean> {
  if (!remindersAvailable()) return false
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.cancel({ notifications: [{ id: ID }] })
  if (!r.enabled) return true
  let perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
  if (perm.display !== 'granted') return false
  const [hour, minute] = r.time.split(':').map(Number)
  await LocalNotifications.schedule({
    notifications: [
      {
        id: ID,
        title: 'لوح',
        body: 'حان وقت وردك اليومي ومراجعة محفوظك',
        schedule: { on: { hour, minute }, allowWhileIdle: true },
        smallIcon: 'ic_stat_lawh',
        iconColor: '#1F6B52',
        // A reminder does not need an exact alarm, so never send the user to the alarm settings.
        isExactNotification: false,
      },
    ],
  })
  return true
}
