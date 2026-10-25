import type { ReactNode } from 'react'
import { navigate } from '../lib/router'
import { Icon } from './Icon'

/** Header of the main tab screens: a title, then search and settings. */
export function TopBar({ children }: { children: ReactNode }) {
  return (
    <header className="topbar">
      <div className="brand">{children}</div>
      <button className="icon-button" aria-label="بحث" onClick={() => navigate('search')}>
        <Icon name="search" />
      </button>
      <button className="icon-button" aria-label="الإعدادات" onClick={() => navigate('settings')}>
        <Icon name="settings" />
      </button>
    </header>
  )
}
