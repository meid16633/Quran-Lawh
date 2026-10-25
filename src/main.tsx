import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { App } from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (!Capacitor.isNativePlatform()) {
  // Ask the browser not to evict bookmarks and the offline copy, then install the service worker.
  navigator.storage?.persist?.().catch(() => {})
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}
