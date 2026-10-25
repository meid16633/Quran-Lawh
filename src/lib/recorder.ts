/**
 * Recording your own recitation of a page, to listen back and compare with a reciter. Recordings stay on the device
 * (IndexedDB), a few per page.
 */

export interface Take {
  id: number
  page: number
  /** Time recorded (ms since epoch). */
  at: number
  /** Length in seconds. */
  duration: number
  blob: Blob
}

/** Recordings kept per page; older ones are removed. */
export const TAKES_PER_PAGE = 5

export function recordingSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
}

/** The first container the browser can record: Opus in WebM on Android and desktop, AAC in MP4 on iPhone. */
function mimeType(): string | undefined {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'].find((t) => MediaRecorder.isTypeSupported(t))
}

export class Recorder {
  private media: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
  private started = 0

  /** Asks for the microphone and starts recording. Rejects with a DOMException named NotAllowedError when refused. */
  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    })
    const type = mimeType()
    this.media = new MediaRecorder(this.stream, type ? { mimeType: type } : undefined)
    this.chunks = []
    this.media.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data)
    }
    this.media.start(1000)
    this.started = Date.now()
  }

  get elapsed(): number {
    return this.started ? (Date.now() - this.started) / 1000 : 0
  }

  /** Stops and returns the recording and its length in seconds. */
  stop(): Promise<{ blob: Blob; duration: number }> {
    return new Promise((resolve, reject) => {
      const media = this.media
      if (!media) return reject(new Error('not recording'))
      const duration = this.elapsed
      media.onstop = () => {
        resolve({ blob: new Blob(this.chunks, { type: media.mimeType || 'audio/webm' }), duration })
        this.release()
      }
      media.stop()
    })
  }

  cancel() {
    if (this.media && this.media.state !== 'inactive') {
      this.media.onstop = null
      this.media.stop()
    }
    this.release()
  }

  private release() {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.media = null
    this.started = 0
  }
}

// ---- storage ----

const DB = 'lawh-recordings'
const STORE = 'takes'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      store.createIndex('page', 'page')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await open()
  try {
    const tx = db.transaction(STORE, mode)
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    const result = await fn(tx.objectStore(STORE))
    await done
    return result
  } finally {
    db.close()
  }
}

/** Recordings of a page, newest first. */
export async function takesOf(page: number): Promise<Take[]> {
  const all = await withStore('readonly', (s) => request(s.index('page').getAll(page) as IDBRequest<Take[]>))
  return all.sort((a, b) => b.at - a.at)
}

/** Saves a recording and removes the oldest beyond TAKES_PER_PAGE. Returns the saved take. */
export async function saveTake(page: number, blob: Blob, duration: number): Promise<Take> {
  const take = { page, at: Date.now(), duration, blob }
  const id = await withStore('readwrite', (s) => request(s.add(take)) as Promise<number>)
  const old = (await takesOf(page)).slice(TAKES_PER_PAGE)
  for (const t of old) await deleteTake(t.id)
  return { ...take, id }
}

export function deleteTake(id: number): Promise<void> {
  return withStore('readwrite', (s) => request(s.delete(id)).then(() => undefined))
}

/** Number of recordings and their total size in bytes. */
export async function recordingsUsage(): Promise<{ count: number; bytes: number }> {
  const all = await withStore('readonly', (s) => request(s.getAll() as IDBRequest<Take[]>))
  return { count: all.length, bytes: all.reduce((n, t) => n + t.blob.size, 0) }
}

export function deleteAllTakes(): Promise<void> {
  return withStore('readwrite', (s) => request(s.clear()).then(() => undefined))
}
