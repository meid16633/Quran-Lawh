import type { ReactNode } from 'react'
import { navigate } from '../lib/router'
import { Icon, type IconName } from './Icon'
import { PlayerBar } from './PlayerBar'

export type Tab = 'mushaf' | 'hifz' | 'wird'

const TABS: [Tab, string, IconName, string][] = [
  ['mushaf', 'المصحف', 'book', ''],
  ['hifz', 'الحفظ', 'cap', 'hifz'],
  ['wird', 'الورد', 'calendar', 'wird'],
]

/** The three main screens share a bottom navigation, with the mini player above it. */
export function TabLayout({ tab, children }: { tab: Tab; children: ReactNode }) {
  return (
    <div className="screen with-nav">
      {children}
      <div className="nav-stack">
        <PlayerBar />
        <nav className="bottom-nav" aria-label="التنقل">
          {TABS.map(([id, label, icon, path]) => (
            <button
              key={id}
              className="nav-item"
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => tab !== id && navigate(path, { replace: true })}
            >
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
