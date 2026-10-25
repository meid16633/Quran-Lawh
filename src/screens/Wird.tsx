import { useState } from 'react'
import { Icon } from '../components/Icon'
import { ReminderControls } from '../components/ReminderControls'
import { TabLayout } from '../components/TabLayout'
import { TopBar } from '../components/TopBar'
import { count, daysWord, pagesWord } from '../lib/arabic'
import { useQuran } from '../lib/context'
import { dayNumber, formatDay, streak } from '../lib/dates'
import { activity, khatma, startKhatma, wirdMark } from '../lib/hifz'
import { TOTAL_PAGES, khatmaStatus, pagesForDays, planLength } from '../lib/khatma'
import { applyReminder, reminder } from '../lib/reminder'
import { arabicDigits } from '../lib/quran'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { activeDays } from './Hifz'

const PAGE_CHOICES = [1, 2, 3, 4, 5, 10, 20]
const DAY_CHOICES = [7, 10, 15, 20, 30, 60, 90]

export function Wird() {
  const plan = useStore(khatma)
  const log = useStore(activity)
  const today = dayNumber()
  const days = streak(activeDays(log), today)

  return (
    <TabLayout tab="wird">
      <TopBar>
        <span className="screen-title">الورد والختمة</span>
      </TopBar>
      <main className="content">
        <WirdMarkCard />
        {plan ? <PlanCard /> : <NewPlan />}

        <button className="card quiz-entry" onClick={() => navigate('achievements')}>
          <Icon name="trophy" size={26} />
          <span className="row-main">
            <span className="mini-title">إنجازاتي</span>
            <span className="mini-sub">الأوسمة والإحصاءات</span>
          </span>
          <Icon name="chevronLeft" />
        </button>

        <section className="card">
          <div className="section-head">
            <h2>نشاطك</h2>
            <span className="flame">
              <Icon name="flame" size={18} /> سلسلة {days ? count(days, daysWord) : 'لم تبدأ بعد'}
            </span>
          </div>
          <WeekChart log={log} today={today} />
        </section>
      </main>
    </TabLayout>
  )
}

/** Where the daily wird continues, independent of the last page opened. */
function WirdMarkCard() {
  const q = useQuran()
  const mark = useStore(wirdMark)
  if (!mark) {
    return (
      <p className="muted hint-card">
        <Icon name="flag" size={18} /> لتحديد موضع وردك: اضغط على أي آية في المصحف ثم «علامة الورد». ستتقدّم العلامة وحدها كلما
        قرأت.
      </p>
    )
  }
  return (
    <button className="card wird-mark" onClick={() => navigate(`read/${mark.page}?a=${mark.ayah}`)}>
      <Icon name="flag" size={24} />
      <span className="row-main">
        <span className="mini-title">تابع وردك</span>
        <span className="mini-sub">
          {q.surahs[q.surahOf(mark.ayah)].name} • آية {arabicDigits(q.ayahNo(mark.ayah))} • صفحة {arabicDigits(mark.page)}
        </span>
      </span>
      <Icon name="chevronLeft" />
    </button>
  )
}

interface PlanChoice {
  pagesPerDay: number
  from: number
}

/** Choosing a khatma by pages per day or by length, with its finish date and a reminder. */
function PlanForm({ initial, submitLabel, onSubmit }: { initial: PlanChoice; submitLabel: string; onSubmit: (c: PlanChoice) => void }) {
  const q = useQuran()
  const mark = useStore(wirdMark)
  const [by, setBy] = useState<'pages' | 'days'>('pages')
  const [pages, setPages] = useState(initial.pagesPerDay)
  const [days, setDays] = useState(30)
  const [from, setFrom] = useState(String(initial.from))
  const start = Math.min(Math.max(Number(from) || 1, 1), TOTAL_PAGES)
  const pagesPerDay = by === 'pages' ? Math.max(1, pages) : pagesForDays(start, days)
  const length = planLength(start, pagesPerDay)
  const finish = formatDay(dayNumber() + length - 1)

  return (
    <div className="plan-form">
      <div className="chips" role="tablist">
        <button role="tab" className="chip" aria-selected={by === 'pages'} onClick={() => setBy('pages')}>
          بعدد الصفحات يوميًا
        </button>
        <button role="tab" className="chip" aria-selected={by === 'days'} onClick={() => setBy('days')}>
          بمدة الختمة
        </button>
      </div>

      {by === 'pages' ? (
        <div className="field">
          <div className="field-label">كم صفحة تقرأ كل يوم؟</div>
          <div className="chips">
            {PAGE_CHOICES.map((n) => (
              <button key={n} className="chip" aria-pressed={pages === n} onClick={() => setPages(n)}>
                {arabicDigits(n)}
              </button>
            ))}
            <input
              className="input number-input"
              inputMode="numeric"
              aria-label="عدد آخر"
              placeholder="عدد آخر"
              value={PAGE_CHOICES.includes(pages) ? '' : String(pages)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)))
                if (n > 0 && n <= TOTAL_PAGES) setPages(Math.round(n))
              }}
            />
          </div>
        </div>
      ) : (
        <div className="field">
          <div className="field-label">في كم يومًا تختم؟</div>
          <div className="chips">
            {DAY_CHOICES.map((d) => (
              <button key={d} className="chip" aria-pressed={days === d} onClick={() => setDays(d)}>
                {count(d, daysWord)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <div className="field-label">تبدأ من صفحة</div>
        <div className="chips">
          <input className="input number-input" inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="صفحة البداية" />
          {mark && mark.page !== start && (
            <button className="chip" onClick={() => setFrom(String(mark.page))}>
              من علامة الورد (ص {arabicDigits(mark.page)})
            </button>
          )}
          {start !== 1 && (
            <button className="chip" onClick={() => setFrom('1')}>
              من أول المصحف
            </button>
          )}
        </div>
      </div>

      <div className="plan-summary">
        <p>
          وردك اليومي <strong>{count(pagesPerDay, pagesWord)}</strong>، وتستغرق الختمة <strong>{count(length, daysWord)}</strong>
          {start > 1 && <> من صفحة {arabicDigits(start)} ({q.surahs[q.surahOf(q.pageRange(start)[0])].name})</>}.
        </p>
        <p>
          تنتهي بإذن الله يوم <strong>{finish.gregorian}</strong>
          {finish.hijri && <> ({finish.hijri})</>}.
        </p>
      </div>

      <div className="field">
        <div className="field-label">التذكير اليومي</div>
        <ReminderControls untilDay={dayNumber() + length - 1} text={`حان وقت وردك: ${count(pagesPerDay, pagesWord)} من ختمتك`} />
      </div>

      <button className="button wide" onClick={() => onSubmit({ pagesPerDay, from: start })}>
        {submitLabel}
      </button>
    </div>
  )
}

function NewPlan() {
  const q = useQuran()
  const mark = useStore(wirdMark)
  return (
    <section className="card onboarding">
      <strong>خطّط لختمتك</strong>
      <p>حدّد كم صفحة تقرأ كل يوم أو في كم يومًا تختم، وسيحسب «لوح» موعد الختمة ويتابع تقدّمك ويذكّرك كل يوم.</p>
      <PlanForm
        initial={{ pagesPerDay: 3, from: 1 }}
        submitLabel="ابدأ الختمة"
        onSubmit={({ pagesPerDay, from }) => {
          startKhatma({ start: dayNumber(), pagesPerDay, from, progress: from - 1 }, q.pageRange(from)[0])
          void applyReminder(reminder.get())
        }}
      />
      {mark && <p className="muted">ستبدأ الختمة من الصفحة التي تختارها، وتنتقل علامة الورد إليها.</p>}
    </section>
  )
}

function PlanCard() {
  const q = useQuran()
  const plan = useStore(khatma)!
  const mark = useStore(wirdMark)
  const [confirm, setConfirm] = useState(false)
  const [editing, setEditing] = useState(false)
  const s = khatmaStatus(plan, dayNumber())
  const finish = formatDay(s.finishDay)
  const first = plan.from ?? 1
  // Today's reading starts at the wird mark when it is on the next page to read.
  const target = mark && mark.page === s.from ? `read/${mark.page}?a=${mark.ayah}` : `read/${s.from}`

  return (
    <>
      <section className="card khatma">
        <div className="ring" style={{ '--p': s.percent } as React.CSSProperties}>
          <span>{arabicDigits(s.percent)}٪</span>
        </div>
        <div className="khatma-info">
          <strong>{s.finished ? 'ختمت القرآن، تقبّل الله منك' : `اليوم ${arabicDigits(Math.min(s.day, s.totalDays))} من ${arabicDigits(s.totalDays)}`}</strong>
          <span className="muted">
            {count(s.pagesPerDay, pagesWord)} يوميًا • قرأت {arabicDigits(Math.max(0, Math.min(plan.progress, TOTAL_PAGES) - first + 1))} من{' '}
            {arabicDigits(TOTAL_PAGES - first + 1)}
          </span>
          {!s.finished && (
            <span className="muted">
              الختام: {finish.gregorian}
              {finish.hijri && ` • ${finish.hijri}`}
            </span>
          )}
          {s.behind > 0 && !s.finished && <span className="warn">متأخر {count(s.behind, pagesWord)} عن الخطة</span>}
        </div>
      </section>

      {s.finished ? (
        <button
          className="button wide"
          onClick={() => startKhatma({ start: dayNumber(), pagesPerDay: s.pagesPerDay, from: 1, progress: 0 }, 0)}
        >
          ابدأ ختمة جديدة
        </button>
      ) : s.doneToday ? (
        <div className="card celebrate">
          <Icon name="check" size={28} />
          <strong>أتممت ورد اليوم</strong>
          <button className="text-button" onClick={() => navigate(target)}>
            تابع القراءة من صفحة {arabicDigits(s.from)}
          </button>
        </div>
      ) : (
        <button className="card continue" onClick={() => navigate(target)}>
          <span className="card-label">ورد اليوم</span>
          <span className="card-title">
            من صفحة {arabicDigits(s.from)} إلى {arabicDigits(s.to)}
          </span>
          <span className="card-sub">
            {count(s.to - s.from + 1, pagesWord)} • {q.surahs[q.surahOf(q.pageRange(s.from)[0])].name} • اقرأ الآن
          </span>
        </button>
      )}
      <p className="muted center">تُحسب الصفحة مقروءة عندما تنتقل منها إلى التالية، وتتقدّم علامة الورد معها.</p>

      {editing ? (
        <section className="card">
          <div className="section-head">
            <h2>تعديل الخطة</h2>
            <button className="icon-button" aria-label="إغلاق" onClick={() => setEditing(false)}>
              <Icon name="close" />
            </button>
          </div>
          <PlanForm
            initial={{ pagesPerDay: s.pagesPerDay, from: Math.min(plan.progress + 1, TOTAL_PAGES) }}
            submitLabel="حفظ الخطة"
            onSubmit={({ pagesPerDay, from }) => {
              // Continue the same khatma from the chosen page with a fresh schedule.
              khatma.set({ ...plan, start: dayNumber(), pagesPerDay, days: undefined, progress: from - 1, startProgress: from - 1 })
              if (from !== plan.progress + 1) wirdMark.set({ ayah: q.pageRange(from)[0], page: from, at: Date.now() })
              void applyReminder(reminder.get())
              setEditing(false)
            }}
          />
        </section>
      ) : (
        <div className="button-row center">
          <button className="button secondary" onClick={() => setEditing(true)}>
            تعديل الخطة والتذكير
          </button>
        </div>
      )}

      {confirm ? (
        <div className="card">
          <strong>إلغاء الختمة الحالية؟</strong>
          <div className="button-row">
            <button className="button danger" onClick={() => khatma.set(null)}>
              نعم، ألغِها
            </button>
            <button className="button ghost" onClick={() => setConfirm(false)}>
              تراجع
            </button>
          </div>
        </div>
      ) : (
        <button className="text-button center" onClick={() => setConfirm(true)}>
          إلغاء الختمة
        </button>
      )}
    </>
  )
}

const DAY_NAMES = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']

function WeekChart({ log, today }: { log: Record<string, { read: number; reviewed: number }>; today: number }) {
  const week = Array.from({ length: 7 }, (_, k) => today - 6 + k)
  const values = week.map((d) => log[d] ?? { read: 0, reviewed: 0 })
  const max = Math.max(1, ...values.map((v) => v.read + v.reviewed))
  const total = values.reduce((a, v) => ({ read: a.read + v.read, reviewed: a.reviewed + v.reviewed }), { read: 0, reviewed: 0 })
  return (
    <>
      <div className="week" role="img" aria-label="الصفحات خلال آخر سبعة أيام">
        {week.map((d, k) => {
          const v = values[k]
          // Day 0 (1970-01-01) was a Thursday.
          const name = DAY_NAMES[(d + 4) % 7]
          return (
            <div key={d} className="week-day">
              <div className="bars">
                <span className="bar read" style={{ height: `${(v.read / max) * 100}%` }} />
                <span className="bar reviewed" style={{ height: `${(v.reviewed / max) * 100}%` }} />
              </div>
              <span className={'week-label' + (d === today ? ' today' : '')}>{name}</span>
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span>
          <i className="cell bar-read" /> قراءة: {count(total.read, pagesWord)}
        </span>
        <span>
          <i className="cell bar-reviewed" /> مراجعة: {count(total.reviewed, pagesWord)}
        </span>
      </div>
    </>
  )
}
