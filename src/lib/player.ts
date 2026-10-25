import { cachedUrl } from './audioCache'
import type { Quran } from './quran'
import { type Position, type Range, nextPosition, startAt } from './queue'
import { ayahUrl, reciterById } from './reciters'
import { createMemoryStore, createStore } from './store'

export type Until = 'page' | 'surah' | 'juz' | 'end'

export interface PlayerSettings {
  reciter: string
  speed: number
  /** Times each ayah is played; 0 = forever. */
  ayahRepeat: number
  /** Times the whole range is played; 0 = forever. */
  rangeRepeat: number
  /** Silence after each ayah, in seconds, to repeat after the reciter. */
  gap: number
  until: Until
  /** Turn pages and highlight the ayah being recited. */
  follow: boolean
}

export const playerSettings = createStore<PlayerSettings>('lawh:player', {
  reciter: 'alafasy',
  speed: 1,
  ayahRepeat: 1,
  rangeRepeat: 1,
  gap: 0,
  until: 'end',
  follow: true,
})

export type Status = 'idle' | 'loading' | 'playing' | 'paused' | 'waiting' | 'error'

export interface PlayerState {
  status: Status
  pos: Position | null
  range: Range | null
}

export const playerState = createMemoryStore<PlayerState>({ status: 'idle', pos: null, range: null })

/** The last ayah of the range playback should stop at, starting from ayah `i`. */
export function rangeEnd(q: Quran, i: number, until: Until): number {
  if (until === 'page') return q.pageRange(q.pageOf(i))[1] - 1
  if (until === 'surah') {
    const s = q.surahOf(i)
    return q.surahStarts[s] + q.surahs[s].ayahs - 1
  }
  if (until === 'juz') {
    const j = q.juzOf(i)
    return j < 30 ? q.juzStart(j + 1) - 1 : q.text.length - 1
  }
  return q.text.length - 1
}

class Player {
  private audio: HTMLAudioElement | null = null
  private preload: HTMLAudioElement | null = null
  private quran: Quran | null = null
  private gapTimer: ReturnType<typeof setTimeout> | null = null
  /** The EveryAyah URL now loaded, and the local copy's object URL when it was downloaded. */
  private loadedUrl: string | null = null
  private objectUrl: string | null = null
  private loadToken = 0

  private get state() {
    return playerState.get()
  }

  private set(patch: Partial<PlayerState>) {
    playerState.set((s) => ({ ...s, ...patch }))
  }

  private element(): HTMLAudioElement {
    if (!this.audio) {
      const a = new Audio()
      a.preload = 'auto'
      a.addEventListener('playing', () => this.set({ status: 'playing' }))
      a.addEventListener('waiting', () => this.set({ status: 'loading' }))
      a.addEventListener('ended', () => this.advance())
      a.addEventListener('error', () => {
        if (this.state.status !== 'idle') this.set({ status: 'error' })
      })
      this.audio = a
      this.preload = new Audio()
      this.preload.preload = 'auto'
      this.setupMediaSession()
    }
    return this.audio
  }

  /** Start playing from ayah `from`. The end of the range comes from the "until" setting unless given. */
  play(quran: Quran, from: number, to?: number) {
    this.quran = quran
    const until = to ?? rangeEnd(quran, from, playerSettings.get().until)
    this.clearGap()
    this.set({ range: { from, to: Math.max(from, until) } })
    this.load(startAt(from, quran))
  }

  toggle() {
    const a = this.audio
    if (!a || !this.state.pos) return
    if (this.state.status === 'paused' || this.state.status === 'error') {
      if (this.state.status === 'error') {
        this.loadedUrl = null
        this.load(this.state.pos)
      }
      else void a.play().catch(() => this.set({ status: 'error' }))
      this.set({ status: 'playing' })
    } else {
      this.clearGap()
      a.pause()
      this.set({ status: 'paused' })
    }
  }

  stop() {
    this.clearGap()
    this.audio?.pause()
    this.set({ status: 'idle', pos: null, range: null })
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none'
  }

  /** Jump to the next or previous ayah within the mushaf, keeping the range end. */
  skip(delta: 1 | -1) {
    const { pos, range } = this.state
    if (!pos || !range || !this.quran) return
    const i = Math.min(Math.max(pos.i + delta, 0), this.quran.text.length - 1)
    this.clearGap()
    this.set({ range: { from: Math.min(range.from, i), to: Math.max(range.to, i) } })
    this.load(startAt(i, this.quran, pos.rangePass))
  }

  /** Apply a changed speed right away. */
  refreshSettings() {
    if (this.audio) this.audio.playbackRate = playerSettings.get().speed
  }

  private url(pos: Position): string {
    const q = this.quran!
    const reciter = reciterById(playerSettings.get().reciter)
    if (pos.basmala) return ayahUrl(reciter, 1, 1)
    return ayahUrl(reciter, q.surahOf(pos.i) + 1, q.ayahNo(pos.i))
  }

  private load(pos: Position) {
    const a = this.element()
    this.set({ pos, status: 'loading' })
    const url = this.url(pos)
    const token = ++this.loadToken
    const start = (src: string | null) => {
      if (token !== this.loadToken) return // a newer load replaced this one
      // Repeating the same ayah rewinds instead of loading the file again.
      if (src === null) a.currentTime = 0
      else a.src = src
      a.defaultPlaybackRate = a.playbackRate = playerSettings.get().speed
      void a.play().catch((e: DOMException) => {
        // Autoplay refused (no user gesture) leaves the player paused rather than broken.
        this.set({ status: e.name === 'NotAllowedError' ? 'paused' : 'error' })
      })
    }
    if (url === this.loadedUrl) {
      start(null)
    } else {
      // Use the downloaded copy when there is one, otherwise stream.
      void cachedUrl(url).then((local) => {
        if (token !== this.loadToken) {
          if (local) URL.revokeObjectURL(local)
          return
        }
        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl)
        this.objectUrl = local
        this.loadedUrl = url
        start(local ?? url)
      })
    }
    this.updateMediaSession(pos)
    const next = this.peek(pos)
    if (next && this.preload) {
      const nextUrl = this.url(next)
      if (nextUrl !== url) {
        this.preload.src = nextUrl
        this.preload.load()
      }
    }
  }

  private peek(pos: Position): Position | null {
    const { range } = this.state
    if (!range || !this.quran) return null
    const s = playerSettings.get()
    return nextPosition(pos, range, { ayah: s.ayahRepeat, range: s.rangeRepeat }, this.quran)
  }

  private advance() {
    const { pos } = this.state
    if (!pos) return
    const next = this.peek(pos)
    if (!next) {
      this.stop()
      return
    }
    const gap = pos.basmala ? 0 : playerSettings.get().gap
    if (gap > 0) {
      this.set({ status: 'waiting' })
      this.gapTimer = setTimeout(() => this.load(next), gap * 1000)
    } else {
      this.load(next)
    }
  }

  private clearGap() {
    if (this.gapTimer) clearTimeout(this.gapTimer)
    this.gapTimer = null
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    ms.setActionHandler('play', () => this.toggle())
    ms.setActionHandler('pause', () => this.toggle())
    ms.setActionHandler('stop', () => this.stop())
    ms.setActionHandler('nexttrack', () => this.skip(1))
    ms.setActionHandler('previoustrack', () => this.skip(-1))
  }

  private updateMediaSession(pos: Position) {
    if (!('mediaSession' in navigator) || !this.quran || typeof MediaMetadata === 'undefined') return
    const q = this.quran
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${q.surahs[q.surahOf(pos.i)].name} – آية ${q.ayahNo(pos.i)}`,
      artist: reciterById(playerSettings.get().reciter).name,
      album: 'لوح',
    })
    navigator.mediaSession.playbackState = 'playing'
  }
}

export const player = new Player()
