import { useEffect, useRef, useState } from 'react'
import { useQuran } from '../lib/context'
import { player } from '../lib/player'
import { arabicDigits } from '../lib/quran'
import { Recorder, type Take, deleteTake, recordingSupported, saveTake, takesOf } from '../lib/recorder'
import { Icon } from './Icon'

interface Props {
  page: number
  pen: boolean
  marks: number
  onPen: () => void
  onRevealAll: () => void
  onToast: (msg: string) => void
  onClose: () => void
}

// Isolated left to right, so minutes stay before seconds inside Arabic text.
const clock = (s: number) =>
  `\u2066${arabicDigits(Math.floor(s / 60))}:${arabicDigits(Math.floor(s % 60)).padStart(2, '٠')}\u2069`

/** «سمّع لنفسك»: record the page from memory, then listen to yourself and to the reciter, and mark mistakes. */
export function ReciteBar({ page, pen, marks, onPen, onRevealAll, onToast, onClose }: Props) {
  const q = useQuran()
  const [first, end] = q.pageRange(page)
  const [takes, setTakes] = useState<Take[]>([])
  const [current, setCurrent] = useState<Take | null>(null)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [mine, setMine] = useState<'mine' | 'compare' | null>(null)
  const recorder = useRef<Recorder | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const objectUrl = useRef<string | null>(null)

  useEffect(() => {
    takesOf(page).then(setTakes, () => {})
  }, [page])

  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => setElapsed(recorder.current?.elapsed ?? 0), 250)
    return () => clearInterval(t)
  }, [recording])

  // Leaving the page or closing the bar stops everything.
  useEffect(
    () => () => {
      recorder.current?.cancel()
      audio.current?.pause()
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    },
    [],
  )

  const stopMine = () => {
    audio.current?.pause()
    setMine(null)
  }

  const start = async () => {
    if (!recordingSupported()) return onToast('التسجيل غير مدعوم في هذا المتصفح')
    player.stop()
    stopMine()
    const r = new Recorder()
    try {
      await r.start()
    } catch (e) {
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
      return onToast(denied ? 'اسمح للتطبيق باستخدام الميكروفون من إعدادات الهاتف' : 'تعذّر تشغيل الميكروفون')
    }
    recorder.current = r
    setElapsed(0)
    setRecording(true)
    navigator.vibrate?.(20)
  }

  const stop = async () => {
    const r = recorder.current
    if (!r) return
    recorder.current = null
    setRecording(false)
    try {
      const { blob, duration } = await r.stop()
      if (duration < 1) return onToast('التسجيل قصير جدًا')
      const take = await saveTake(page, blob, duration)
      setCurrent(take)
      setTakes(await takesOf(page))
      onToast('حُفظ التسجيل. استمع إليه وعلّم أخطاءك')
    } catch {
      onToast('تعذّر حفظ التسجيل')
    }
  }

  const playMine = (thenReciter: boolean) => {
    if (!current) return
    player.stop()
    if (!audio.current) audio.current = new Audio()
    const a = audio.current
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = URL.createObjectURL(current.blob)
    a.src = objectUrl.current
    a.onended = () => {
      setMine(null)
      if (thenReciter) player.play(q, first, end - 1, { once: true })
    }
    void a.play().then(
      () => setMine(thenReciter ? 'compare' : 'mine'),
      () => onToast('تعذّر تشغيل التسجيل'),
    )
  }

  const playReciter = () => {
    stopMine()
    player.play(q, first, end - 1, { once: true })
  }

  const remove = async () => {
    if (!current) return
    stopMine()
    await deleteTake(current.id)
    setCurrent(null)
    setTakes(await takesOf(page))
  }

  return (
    <div className="hifz-bar recite-bar">
      <div className="hifz-row">
        <strong className="recite-title">
          <Icon name="mic" size={18} /> سمّع لنفسك
        </strong>
        <button className="icon-button" aria-label="إغلاق التسميع" onClick={onClose}>
          <Icon name="close" size={20} />
        </button>
      </div>

      {recording ? (
        <div className="hifz-row actions">
          <span className="rec-dot" aria-hidden="true" />
          <span className="rec-time">{clock(elapsed)}</span>
          <button className="tool big primary danger-fill" onClick={stop}>
            <Icon name="stop" size={18} /> إيقاف وحفظ
          </button>
        </div>
      ) : current ? (
        <>
          <div className="hifz-row actions">
            <button className={'tool big' + (mine === 'mine' ? ' active' : '')} onClick={() => (mine ? stopMine() : playMine(false))}>
              <Icon name={mine === 'mine' ? 'pause' : 'play'} size={18} /> تلاوتي
            </button>
            <button className="tool big" onClick={playReciter}>
              <Icon name="headphones" size={18} /> الشيخ
            </button>
            <button className={'tool big' + (mine === 'compare' ? ' active' : '')} onClick={() => (mine ? stopMine() : playMine(true))}>
              <Icon name="refresh" size={18} /> قارن
            </button>
          </div>
          <div className="hifz-row actions">
            <button className="tool big" onClick={onRevealAll}>
              اكشف الصفحة
            </button>
            <button className={'tool big' + (pen ? ' active danger' : '')} aria-pressed={pen} onClick={onPen}>
              <Icon name="pen" size={18} /> {pen ? `الأخطاء: ${arabicDigits(marks)}` : 'علّم أخطائي'}
            </button>
            <button className="tool big" aria-label="حذف التسجيل" onClick={remove}>
              <Icon name="trash" size={18} />
            </button>
          </div>
          <p className="hint">
            «قارن» يشغّل تسجيلك ثم تلاوة الشيخ للصفحة نفسها. اكشف الصفحة واستمع لتسجيلك، واضغط على كل كلمة أخطأت فيها.
          </p>
        </>
      ) : (
        <p className="hint">
          سمّع الصفحة من حفظك والكلمات مخفية، ثم استمع لتسجيلك وقارنه بتلاوة الشيخ. التسجيلات تبقى على جهازك فقط.
        </p>
      )}

      {!recording && (
        <div className="hifz-row actions">
          <button className="tool big primary" onClick={start}>
            <span className="rec-dot still" aria-hidden="true" /> {current ? 'سجّل من جديد' : 'ابدأ التسجيل'}
          </button>
          {takes.length > 0 && (
            <div className="chips compact takes" role="radiogroup" aria-label="تسجيلاتك لهذه الصفحة">
              {takes.map((t) => (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={current?.id === t.id}
                  className="chip"
                  onClick={() => {
                    stopMine()
                    setCurrent(t)
                  }}
                >
                  {formatTake(t)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatTake(t: Take): string {
  const d = new Date(t.at)
  const when = d.toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  return `${when} • ${clock(t.duration)}`
}
