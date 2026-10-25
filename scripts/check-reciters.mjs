// Checks that every reciter folder in src/data/reciters.json exists on EveryAyah,
// by requesting the first and last ayah of the mushaf. Run in CI, which has internet access.
import { readFileSync } from 'node:fs'

const reciters = JSON.parse(readFileSync(new URL('../src/data/reciters.json', import.meta.url), 'utf8'))
let failed = false

// Downloading recitations for offline use needs CORS on the audio host; report it once.
{
  const res = await fetch('https://everyayah.com/data/Alafasy_128kbps/001001.mp3', {
    method: 'GET',
    headers: { Origin: 'https://meid16633.github.io', Range: 'bytes=0-15' },
  })
  const h = (k) => res.headers.get(k) ?? '-'
  console.log(`CORS: status ${res.status}, allow-origin ${h('access-control-allow-origin')}, accept-ranges ${h('accept-ranges')}, cache-control ${h('cache-control')}`)
}
for (const r of reciters) {
  for (const file of ['001001', '114006']) {
    const url = `https://everyayah.com/data/${r.folder}/${file}.mp3`
    let status
    try {
      const res = await fetch(url, { method: 'HEAD' })
      status = res.status
      if (res.ok && !String(res.headers.get('content-type')).includes('audio')) status = `not audio (${res.headers.get('content-type')})`
    } catch (e) {
      status = e.message
    }
    const ok = status === 200
    if (!ok) failed = true
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.id.padEnd(16)} ${status} ${url}`)
  }
}
process.exit(failed ? 1 : 0)
