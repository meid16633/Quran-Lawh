import { useSyncExternalStore } from 'react'

/** A value persisted in localStorage. Storage can be unavailable (private mode), so every access is guarded. */
export interface Store<T> {
  get(): T
  set(value: T | ((prev: T) => T)): void
  subscribe(listener: () => void): () => void
}

export function createStore<T>(key: string, initial: T): Store<T> {
  let value = initial
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      const parsed = JSON.parse(raw)
      value = isRecord(initial) && isRecord(parsed) ? { ...initial, ...parsed } : parsed
    }
  } catch {
    // keep the default
  }
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next) {
      value = typeof next === 'function' ? (next as (prev: T) => T)(value) : next
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {
        // not persisted, still kept in memory for this session
      }
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

export type Theme = 'auto' | 'light' | 'sepia' | 'dark'

export interface Settings {
  theme: Theme
  fontSize: number
}

export interface Bookmark {
  /** Ayah index */
  i: number
  at: number
}

export interface LastRead {
  page: number
  at: number
}

export const settings = createStore<Settings>('lawh:settings', { theme: 'auto', fontSize: 26 })
export const bookmarks = createStore<Bookmark[]>('lawh:bookmarks', [])
export const lastRead = createStore<LastRead | null>('lawh:last-read', null)

export function toggleBookmark(i: number) {
  bookmarks.set((list) =>
    list.some((b) => b.i === i) ? list.filter((b) => b.i !== i) : [{ i, at: Date.now() }, ...list],
  )
}
