import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { deleteSurah, downloadSurah, downloadedSurahs, storageUsed } from '../lib/audioCache'
import { useQuran } from '../lib/context'
import { playerSettings } from '../lib/player'
import { arabicDigits } from '../lib/quran'
import { RECITERS, reciterById } from '../lib/reciters'
import { back } from '../lib/router'
import { useStore } from '../lib/store'

interface Progress {
  surah: number
  done: number
  total: number
}

export function Downloads() {
  const q = useQuran()
  const settings = useStore(playerSettings)
  const reciter = reciterById(settings.reciter)
  const [have, setHave] = useState<Set<number> | null>(null)
  const [queue, setQueue] = useState<number[]>([])
  const [progress, setProgress] = useState<Progress | null>(null)
  const [used, setUsed] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const supported = typeof caches !== 'undefined'

  const refresh = useCallback(async () => {
    setHave(await downloadedSurahs(q, reciter))
    setUsed(await storageUsed())
  }, [q, reciter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Work through the queue one surah at a time.
  useEffect(() => {
    if (progress || !queue.length) return
    const surah = queue[0]
    const ctrl = new AbortController()
    abort.current = ctrl
    setProgress({ surah, done: 0, total: 1 })
    downloadSurah(q, reciter, surah, (done, total) => setProgress({ surah, done, total }), ctrl.signal)
      .then(
        () => setError(null),
        (e: Error) => {
          if (e.name !== 'AbortError') setError('توقف التحميل. تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى.')
          setQueue([])
        },
      )
      .finally(() => {
        setProgress(null)
        setQueue((list) => list.filter((s) => s !== surah))
        void refresh()
      })
  }, [queue, progress, q, reciter, refresh])

  useEffect(() => () => abort.current?.abort(), [])

  const enqueue = (surahs: number[]) =>
    setQueue((list) => [...list, ...surahs.filter((s) => !list.includes(s) && !have?.has(s))])

  if (!supported) {
    return (
      <Shell>
        <p className="muted">هذا المتصفح لا يدعم حفظ التلاوات على الجهاز.</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <section className="card settings-section">
        <h2>القارئ</h2>
        <select
          className="input"
          value={settings.reciter}
          disabled={Boolean(progress)}
          onChange={(e) => playerSettings.set((s) => ({ ...s, reciter: e.target.value }))}
        >
          {RECITERS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <p className="muted">
          السورة تُحمَّل مرة واحدة ثم تعمل بدون إنترنت. المصحف كاملًا بصوت قارئ واحد قرابة ١ جيجابايت، وجزء عمّ نحو ٤٠ ميجابايت.
          {used !== null && ` المساحة المستخدمة الآن: ${arabicDigits(Math.round(used / 1e6))} ميجابايت.`}
        </p>
        <div className="button-row">
          <button className="button secondary" onClick={() => enqueue(Array.from({ length: 37 }, (_, k) => 77 + k))}>
            تحميل جزء عمّ
          </button>
          <button className="button secondary" onClick={() => enqueue([0, 1, 17, 35, 66])}>
            الفاتحة والبقرة والكهف ويس والملك
          </button>
          {queue.length > 0 && (
            <button
              className="button ghost"
              onClick={() => {
                setQueue([])
                abort.current?.abort()
              }}
            >
              إيقاف التحميل
            </button>
          )}
        </div>
        {error && <p className="warn">{error}</p>}
      </section>

      <ul className="list">
        {q.surahs.map((s, i) => {
          const isDone = have?.has(i)
          const active = progress?.surah === i
          const waiting = !active && queue.includes(i)
          return (
            <li key={i} className="row-with-action">
              <div className="row">
                <span className="badge">{arabicDigits(i + 1)}</span>
                <span className="row-main">
                  <span className="row-title quran-font">{s.name}</span>
                  {active ? (
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                    </span>
                  ) : (
                    <span className="row-sub">
                      {isDone ? 'محمّلة ✓' : waiting ? 'في الانتظار…' : `${arabicDigits(s.ayahs)} آية`}
                    </span>
                  )}
                </span>
              </div>
              {isDone ? (
                <button
                  className="icon-button"
                  aria-label={`حذف ${s.name}`}
                  onClick={async () => {
                    await deleteSurah(q, reciter, i)
                    void refresh()
                  }}
                >
                  <Icon name="trash" size={18} />
                </button>
              ) : (
                <button className="icon-button" aria-label={`تحميل ${s.name}`} disabled={active || waiting} onClick={() => enqueue([i])}>
                  <Icon name="download" size={20} />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-button" aria-label="رجوع" onClick={back}>
          <Icon name="chevronRight" />
        </button>
        <h1 className="topbar-title">الاستماع بدون إنترنت</h1>
      </header>
      <main className="content">{children}</main>
    </div>
  )
}
