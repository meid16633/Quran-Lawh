import { createStore } from './store'

export interface Note {
  text: string
  at: number
}

/** Reflections (تدبّر) per ayah index. */
export const notes = createStore<Record<string, Note>>('lawh:notes', {})

export function saveNote(ayah: number, text: string) {
  notes.set((all) => {
    const next = { ...all }
    if (text.trim()) next[ayah] = { text, at: Date.now() }
    else delete next[ayah]
    return next
  })
}
