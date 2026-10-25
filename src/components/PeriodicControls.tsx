import { useState } from 'react'
import { useQuran } from '../lib/context'
import {
  BATCH,
  CALENDAR_EVENTS,
  type Kind,
  MIN_MINUTES,
  type Periodic,
  type Unit,
  applyPeriodic,
  calendarAllowed,
  intervalMs,
  nudges,
  periodic,
  periodicAvailable,
  periodicIcs,
  previewPeriodic,
} from '../lib/periodic'
import { arabicDigits } from '../lib/quran'
import { useStore } from '../lib/store'
import { Icon } from './Icon'

const KINDS: [Kind, string][] = [
  ['ayah', 'آيات'],
  ['hadith', 'أحاديث'],
  ['dhikr', 'أذكار'],
]

const UNITS: [Unit, string][] = [
  ['minute', 'دقيقة'],
  ['hour', 'ساعة'],
  ['day', 'يوم'],
]

const PRESETS: [number, Unit, string][] = [
  [15, 'minute', 'ربع ساعة'],
  [30, 'minute', 'نصف ساعة'],
  [1, 'hour', 'ساعة'],
  [3, 'hour', '٣ ساعات'],
  [6, 'hour', '٦ ساعات'],
  [1, 'day', 'يوميًا'],
]

/** «آية وذكر على شاشة القفل»: what to show, how often, and when to stay quiet. */
export function PeriodicControls() {
  const q = useQuran()
  const p = useStore(periodic)
  const native = periodicAvailable()
  const [message, setMessage] = useState<string | null>(null)
  const [sample, setSample] = useState(() => nudges(q, p, [new Date()], Date.now())[0])

  const update = async (patch: Partial<Periodic>) => {
    const next = { ...periodic.get(), ...patch }
    periodic.set(next)
    if (!native) return setMessage(null)
    const ok = await applyPeriodic(q, next)
    if (!ok && next.enabled) {
      periodic.set({ ...next, enabled: false })
      setMessage('لم يُسمح بالإشعارات. فعّلها للتطبيق من إعدادات الهاتف ثم حاول مرة أخرى.')
    } else {
      setMessage(next.enabled ? `ستظهر لك ${describe(next)}.` : null)
    }
  }

  const toggleKind = (k: Kind) => {
    const kinds = p.kinds.includes(k) ? p.kinds.filter((x) => x !== k) : [...p.kinds, k]
    if (kinds.length) void update({ kinds })
  }

  const preview = async () => {
    if (native) {
      const ok = await previewPeriodic(q, p)
      setMessage(ok ? 'سيظهر إشعار تجريبي بعد ثوانٍ.' : 'لم يُسمح بالإشعارات. فعّلها من إعدادات الهاتف.')
    } else {
      setSample(nudges(q, p, [new Date()], Date.now())[0])
    }
  }

  const addToCalendar = () => {
    const { ics, last } = periodicIcs(q, p, new Date(), Date.now(), location.href.split('#')[0])
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
    a.download = 'lawh-adhkar.ics'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    const until = last.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })
    setMessage(
      `افتح الملف واختر «إضافة الكل»: ${arabicDigits(CALENDAR_EVENTS)} تنبيه حتى ${until}، وبعدها أضف ملفًا جديدًا من هنا.`,
    )
  }

  const tooShort = p.unit === 'minute' && p.every < MIN_MINUTES

  return (
    <div className="reminder periodic">
      {native && (
        <label className="toggle-row">
          <input type="checkbox" checked={p.enabled} onChange={(e) => void update({ enabled: e.target.checked })} />
          <span>أظهر لي آية أو حديثًا أو ذكرًا على شاشة القفل</span>
        </label>
      )}

      <div className="field">
        <div className="field-label">ماذا يظهر</div>
        <div className="chips" role="group" aria-label="ماذا يظهر">
          {KINDS.map(([k, label]) => (
            <button key={k} className="chip" aria-pressed={p.kinds.includes(k)} onClick={() => toggleKind(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <div className="field-label">كل كم؟</div>
        <div className="chips" role="radiogroup" aria-label="كل كم">
          {PRESETS.map(([every, unit, label]) => (
            <button
              key={label}
              role="radio"
              aria-checked={p.every === every && p.unit === unit}
              className="chip"
              onClick={() => void update({ every, unit })}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="interval-row">
          <span>أو كل</span>
          <input
            className="input number-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={p.every}
            aria-label="العدد"
            onChange={(e) => {
              const every = Math.min(999, Math.max(1, Math.round(Number(e.target.value) || 1)))
              void update({ every })
            }}
          />
          <select className="input" value={p.unit} aria-label="الوحدة" onChange={(e) => void update({ unit: e.target.value as Unit })}>
            {UNITS.map(([u, label]) => (
              <option key={u} value={u}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {tooShort && <p className="muted">أقصر مدة {arabicDigits(MIN_MINUTES)} دقيقة، فستظهر كل {arabicDigits(MIN_MINUTES)} دقيقة.</p>}
      </div>

      {p.unit === 'day' ? (
        <label className="toggle-row">
          <span>في الساعة</span>
          <input className="input time-input" type="time" value={p.time} onChange={(e) => void update({ time: e.target.value })} />
        </label>
      ) : (
        <div className="field">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={p.quiet.enabled}
              onChange={(e) => void update({ quiet: { ...p.quiet, enabled: e.target.checked } })}
            />
            <span>لا تُظهر شيئًا وقت النوم</span>
          </label>
          {p.quiet.enabled && (
            <div className="interval-row">
              <span>من</span>
              <input
                className="input time-input"
                type="time"
                value={p.quiet.from}
                aria-label="من"
                onChange={(e) => void update({ quiet: { ...p.quiet, from: e.target.value } })}
              />
              <span>إلى</span>
              <input
                className="input time-input"
                type="time"
                value={p.quiet.to}
                aria-label="إلى"
                onChange={(e) => void update({ quiet: { ...p.quiet, to: e.target.value } })}
              />
            </div>
          )}
        </div>
      )}

      {native && (
        <label className="toggle-row">
          <input type="checkbox" checked={p.sound} onChange={(e) => void update({ sound: e.target.checked })} />
          <span>بصوت التنبيه</span>
        </label>
      )}

      {!native && (
        <div className="periodic-sample">
          <small>{sample.title}</small>
          <p>{sample.body}</p>
        </div>
      )}

      <div className="button-row">
        <button className="button secondary" onClick={() => void preview()}>
          <Icon name="bell" size={18} /> {native ? 'جرّب الآن' : 'مثال آخر'}
        </button>
        {!native && calendarAllowed(p) && (
          <button className="button secondary" onClick={addToCalendar}>
            <Icon name="calendar" size={18} /> أضف إلى التقويم
          </button>
        )}
      </div>
      {!native && (
        <p className="muted">
          {calendarAllowed(p)
            ? 'على الآيفون لا يستطيع الموقع إظهار إشعارات وحده، فتُضاف التذكيرات إلى تقويم الهاتف وتظهر تنبيهاته على شاشة القفل.'
            : 'على الآيفون تُضاف التذكيرات إلى تقويم الهاتف، وهذا يناسب مدة ساعة أو أكثر. في تطبيق أندرويد تعمل كل المدد.'}
        </p>
      )}
      {native && p.enabled && (
        <p className="muted">تُجدَّد التذكيرات كلما فتحت التطبيق، فإن لم تفتحه طويلًا تتوقف بعد {describeBatch(p)}.</p>
      )}
      {message && <p className="muted">{message}</p>}
    </div>
  )
}

function describe(p: Periodic): string {
  const n = Math.max(1, Math.round(p.every))
  const what = p.kinds.length === 3 ? 'آية أو حديث أو ذكر' : p.kinds.map((k) => KINDS.find(([x]) => x === k)![1]).join(' و')
  if (p.unit === 'day') return `${what} ${n === 1 ? 'كل يوم' : `كل ${arabicDigits(n)} أيام`} الساعة ${arabicDigits(p.time)}`
  const minutes = intervalMs(p) / 60_000
  const every =
    minutes === 60 ? 'كل ساعة' : minutes % 60 ? `كل ${arabicDigits(minutes)} دقيقة` : `كل ${arabicDigits(minutes / 60)} ساعات`
  return `${what} ${every}`
}

/** How long a scheduled batch lasts, in words (longer in fact, since quiet hours are skipped). */
function describeBatch(p: Periodic): string {
  const days = (intervalMs(p) * BATCH) / 86_400_000
  if (days < 2) return `${arabicDigits(Math.round(days * 24))} ساعة تقريبًا`
  return `${arabicDigits(Math.round(days))} يومًا تقريبًا`
}
