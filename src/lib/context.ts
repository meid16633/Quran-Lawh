import { createContext, useContext } from 'react'
import type { Quran } from './quran'

export const QuranContext = createContext<Quran | null>(null)

export function useQuran(): Quran {
  const q = useContext(QuranContext)
  if (!q) throw new Error('useQuran outside QuranContext')
  return q
}
