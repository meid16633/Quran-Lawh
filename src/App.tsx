import { useEffect, useState } from 'react'
import { BADGES, earned } from './lib/achievements'
import { badgesEarned, currentProgress, watchedStores } from './lib/progress'
import { QuranContext } from './lib/context'
import { khatma, wirdMark } from './lib/hifz'
import { applyPeriodic, periodic, periodicAvailable } from './lib/periodic'
import { loadQuran, type Quran } from './lib/quran'
import { navigate, useRoute } from './lib/router'
import { lastRead, settings, useStore } from './lib/store'
import { syncWidget, widgetAvailable } from './lib/widget'
import { Achievements } from './screens/Achievements'
import { Downloads } from './screens/Downloads'
import { Hifz } from './screens/Hifz'
import { Home } from './screens/Home'
import { Quiz } from './screens/Quiz'
import { Reader } from './screens/Reader'
import { Wird } from './screens/Wird'
import { Search } from './screens/Search'
import { SettingsScreen } from './screens/Settings'

export function App() {
  const [quran, setQuran] = useState<Quran | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { theme, fontSize } = useStore(settings)
  const route = useRoute()

  useEffect(() => {
    loadQuran().then(setQuran, (e: Error) => setError(e.message))
  }, [])

  // Celebrate newly earned badges, whatever screen earned them.
  const [celebrate, setCelebrate] = useState<string | null>(null)
  useEffect(() => {
    const check = () => {
      const have = badgesEarned.get()
      const fresh = earned(currentProgress()).filter((id) => !have[id])
      if (!fresh.length) return
      const now = Date.now()
      badgesEarned.set({ ...have, ...Object.fromEntries(fresh.map((id) => [id, now])) })
      const first = BADGES.find((b) => b.id === fresh[0])!
      setCelebrate(fresh.length === 1 ? `وسام جديد: ${first.title}` : `أوسمة جديدة: ${fresh.length}`)
      setTimeout(() => setCelebrate(null), 3500)
    }
    check()
    const unsubscribe = watchedStores.map((s) => s.subscribe(check))
    return () => unsubscribe.forEach((u) => u())
  }, [])

  // Android: keep the periodic reminders topped up whenever the app comes to the foreground, and open the mushaf on
  // the ayah of a reminder that was tapped.
  useEffect(() => {
    if (!quran || !periodicAvailable()) return
    const refresh = () => {
      if (periodic.get().enabled) void applyPeriodic(quran, periodic.get())
    }
    refresh()
    const handles = Promise.all([
      import('@capacitor/app').then(({ App: CapApp }) => CapApp.addListener('resume', refresh)),
      import('@capacitor/local-notifications').then(({ LocalNotifications }) =>
        LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
          const ayah = notification.extra?.ayah
          if (typeof ayah === 'number') navigate(`read/${quran.pageOf(ayah)}?a=${ayah}`)
        }),
      ),
    ])
    return () => {
      void handles.then((hs) => hs.forEach((h) => void h.remove()))
    }
  }, [quran])

  // Android home-screen widget: keep its texts current, and follow its links (lawh://wird, lawh://ayah/<index>).
  useEffect(() => {
    if (!quran || !widgetAvailable()) return
    const sync = () => void syncWidget(quran).catch(() => {})
    sync()
    const unsubscribe = [khatma.subscribe(sync), wirdMark.subscribe(sync)]
    const open = (url: string | undefined) => {
      if (!url?.startsWith('lawh://')) return
      const ayah = url.match(/^lawh:\/\/ayah\/(\d+)/)
      if (ayah) {
        const i = Number(ayah[1])
        navigate(`read/${quran.pageOf(i)}?a=${i}`)
      } else {
        const mark = wirdMark.get()
        const plan = khatma.get()
        if (mark) navigate(`read/${mark.page}?a=${mark.ayah}`)
        else if (plan && plan.progress < quran.pageCount) navigate(`read/${plan.progress + 1}`)
        else navigate(lastRead.get() ? `read/${lastRead.get()!.page}` : 'wird')
      }
    }
    const handles = import('@capacitor/app').then(async ({ App: CapApp }) => {
      open((await CapApp.getLaunchUrl())?.url)
      return Promise.all([CapApp.addListener('appUrlOpen', (e) => open(e.url)), CapApp.addListener('resume', sync)])
    })
    return () => {
      unsubscribe.forEach((u) => u())
      void handles.then((hs) => hs.forEach((h) => void h.remove()))
    }
  }, [quran])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = theme
    root.style.setProperty('--quran-size', `${fontSize}px`)
  }, [theme, fontSize])

  if (error) {
    return (
      <main className="center-screen">
        <p>تعذّر تحميل المصحف</p>
        <button className="button" onClick={() => location.reload()}>
          إعادة المحاولة
        </button>
      </main>
    )
  }
  if (!quran) {
    return (
      <main className="center-screen">
        <div className="logo">لَوْح</div>
      </main>
    )
  }

  const [screen, arg] = route.path
  let content
  if (screen === 'read') {
    const page = Math.min(Math.max(Number(arg) || 1, 1), quran.pageCount)
    const ayah = route.params.get('a')
    content = (
      <Reader key={page} page={page} highlight={ayah === null ? null : Number(ayah)} review={route.params.get('review') === '1'} />
    )
  } else if (screen === 'hifz') {
    content = <Hifz done={route.params.get('done') === '1'} />
  } else if (screen === 'achievements') {
    content = <Achievements />
  } else if (screen === 'downloads') {
    content = <Downloads />
  } else if (screen === 'quiz') {
    content = <Quiz />
  } else if (screen === 'wird') {
    content = <Wird />
  } else if (screen === 'search') {
    content = <Search initialQuery={route.params.get('q') ?? ''} />
  } else if (screen === 'settings') {
    content = <SettingsScreen />
  } else {
    content = <Home />
  }

  return (
    <QuranContext.Provider value={quran}>
      {content}
      {celebrate && (
        <button className="celebrate-toast" onClick={() => navigate('achievements')}>
          🏆 {celebrate}
        </button>
      )}
    </QuranContext.Provider>
  )
}
