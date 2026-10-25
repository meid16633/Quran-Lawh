import type { Quran } from './quran'
import { type Reciter, ayahUrl } from './reciters'

/**
 * Recitations downloaded for offline listening, kept in Cache Storage keyed by their EveryAyah URL
 * (EveryAyah serves the files with CORS, so they can be fetched and stored).
 */
const CACHE = 'lawh-audio-v1'

const supported = () => typeof caches !== 'undefined'

/** A playable URL for a downloaded file, or null when it is not downloaded. The caller revokes it. */
export async function cachedUrl(url: string): Promise<string | null> {
  if (!supported()) return null
  try {
    const res = await (await caches.open(CACHE)).match(url)
    return res ? URL.createObjectURL(await res.blob()) : null
  } catch {
    return null
  }
}

export function surahUrls(q: Quran, reciter: Reciter, surah: number): string[] {
  const urls = Array.from({ length: q.surahs[surah].ayahs }, (_, k) => ayahUrl(reciter, surah + 1, k + 1))
  // The basmala played before the surah is Al-Fatiha's first ayah.
  if (surah !== 0 && surah !== 8) urls.push(ayahUrl(reciter, 1, 1))
  return urls
}

/** Downloads every ayah of a surah, a few at a time. Resolves with the number of bytes stored. */
export async function downloadSurah(
  q: Quran,
  reciter: Reciter,
  surah: number,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<number> {
  const cache = await caches.open(CACHE)
  const urls = surahUrls(q, reciter, surah)
  let done = 0
  let bytes = 0
  const queue = [...urls]
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
      if (!(await cache.match(url))) {
        const res = await fetch(url, { mode: 'cors', signal })
        if (!res.ok) throw new Error(`${res.status} ${url}`)
        const blob = await res.blob()
        bytes += blob.size
        await cache.put(url, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }))
      }
      onProgress(++done, urls.length)
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  return bytes
}

/** Surah indexes fully downloaded for a reciter. */
export async function downloadedSurahs(q: Quran, reciter: Reciter): Promise<Set<number>> {
  const out = new Set<number>()
  if (!supported()) return out
  const keys = new Set((await (await caches.open(CACHE)).keys()).map((r) => r.url))
  q.surahs.forEach((_, s) => {
    if (surahUrls(q, reciter, s).every((u) => keys.has(u))) out.add(s)
  })
  return out
}

export async function deleteSurah(q: Quran, reciter: Reciter, surah: number) {
  const cache = await caches.open(CACHE)
  // Keep the shared basmala file; it is tiny and other surahs use it.
  const urls = surahUrls(q, reciter, surah).filter((u) => !u.endsWith('/001001.mp3') || surah === 0)
  await Promise.all(urls.map((u) => cache.delete(u)))
}

export async function storageUsed(): Promise<number | null> {
  try {
    return (await navigator.storage?.estimate?.())?.usage ?? null
  } catch {
    return null
  }
}
