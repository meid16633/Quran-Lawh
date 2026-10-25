import { useEffect, useState } from 'react'
import { QuranContext } from './lib/context'
import { loadQuran, type Quran } from './lib/quran'
import { useRoute } from './lib/router'
import { settings, useStore } from './lib/store'
import { Home } from './screens/Home'
import { Reader } from './screens/Reader'
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
    content = <Reader page={page} highlight={ayah === null ? null : Number(ayah)} />
  } else if (screen === 'search') {
    content = <Search initialQuery={route.params.get('q') ?? ''} />
  } else if (screen === 'settings') {
    content = <SettingsScreen />
  } else {
    content = <Home />
  }

  return <QuranContext.Provider value={quran}>{content}</QuranContext.Provider>
}
