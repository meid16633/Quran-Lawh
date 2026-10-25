const PREFIX = 'lawh:'
const FORMAT = 'lawh-backup'

/** Everything the app keeps on this device, as one JSON document. */
export function exportBackup(): string {
  const data: Record<string, unknown> = {}
  for (let k = 0; k < localStorage.length; k++) {
    const key = localStorage.key(k)!
    if (key.startsWith(PREFIX)) data[key] = JSON.parse(localStorage.getItem(key)!)
  }
  return JSON.stringify({ format: FORMAT, version: 1, exportedAt: new Date().toISOString(), data })
}

/** Restores a backup made by exportBackup(). Throws on anything else. */
export function importBackup(text: string): number {
  const doc = JSON.parse(text)
  if (doc?.format !== FORMAT || typeof doc.data !== 'object') throw new Error('not a Lawh backup')
  const entries = Object.entries(doc.data as Record<string, unknown>).filter(([k]) => k.startsWith(PREFIX))
  for (const [key, value] of entries) localStorage.setItem(key, JSON.stringify(value))
  return entries.length
}

export function backupFileName(): string {
  return `lawh-backup-${new Date().toISOString().slice(0, 10)}.json`
}
