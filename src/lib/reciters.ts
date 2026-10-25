import list from '../data/reciters.json'

export interface Reciter {
  id: string
  name: string
  folder: string
  note?: string
}

export const RECITERS: Reciter[] = list

export function reciterById(id: string): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0]
}

const pad = (n: number) => String(n).padStart(3, '0')

/** EveryAyah serves one MP3 per ayah: /data/<folder>/<sss><aaa>.mp3 */
export function ayahUrl(reciter: Reciter, surah: number, ayah: number): string {
  return `https://everyayah.com/data/${reciter.folder}/${pad(surah)}${pad(ayah)}.mp3`
}
