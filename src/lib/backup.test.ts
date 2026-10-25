import { beforeEach, describe, expect, it } from 'vitest'
import { exportBackup, importBackup } from './backup'

// Minimal localStorage for the node test environment.
class MemoryStorage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null
  }
  getItem(k: string) {
    return this.map.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.map.set(k, v)
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
  clear() {
    this.map.clear()
  }
}

describe('backup', () => {
  beforeEach(() => {
    globalThis.localStorage = new MemoryStorage() as unknown as Storage
  })

  it('round-trips the app data and ignores other keys', () => {
    localStorage.setItem('lawh:memorized', JSON.stringify({ 582: { due: 1 } }))
    localStorage.setItem('lawh:khatma', JSON.stringify({ start: 1, days: 30, progress: 5 }))
    localStorage.setItem('other', 'x')
    const backup = exportBackup()
    localStorage.clear()
    expect(importBackup(backup)).toBe(2)
    expect(JSON.parse(localStorage.getItem('lawh:khatma')!).progress).toBe(5)
    expect(localStorage.getItem('other')).toBeNull()
  })

  it('rejects other JSON', () => {
    expect(() => importBackup('{"a":1}')).toThrow()
    expect(() => importBackup('not json')).toThrow()
  })
})
