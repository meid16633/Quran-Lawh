import { useState } from 'react'
import { Icon } from '../components/Icon'
import { TabLayout } from '../components/TabLayout'
import { TopBar } from '../components/TopBar'
import { count, daysWord, pagesWord } from '../lib/arabic'
import { dayNumber, streak } from '../lib/dates'
import { activity, khatma } from '../lib/hifz'
import { TOTAL_PAGES, khatmaStatus } from '../lib/khatma'
import { arabicDigits } from '../lib/quran'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { activeDays } from './Hifz'

const PLANS = [7, 10, 15, 20, 30, 60]

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

function NewPlan() {
  const [days, setDays] = useState(30)
  return (
    <section className="card onboarding">
      <strong>خطّط لختمتك</strong>
      <p>اختر المدة، وسيقسّم «لوح» المصحف إلى ورد يومي ويتابع تقدّمك تلقائيًا وأنت تقرأ.</p>
      <div className="chips">
        {PLANS.map((d) => (
          <button key={d} className="chip" aria-pressed={days === d} onClick={() => setDays(d)}>
            {count(d, daysWord)}
          </button>
        ))}
      </div>
      <p className="muted">الورد اليومي: {count(Math.ceil(TOTAL_PAGES / days), pagesWord)}</p>
      <button className="button" onClick={() => khatma.set({ start: dayNumber(), days, progress: 0 })}>
        ابدأ الختمة
      </button>
    </section>
  )
}

function PlanCard() {
  const plan = useStore(khatma)!
  const [confirm, setConfirm] = useState(false)
  const s = khatmaStatus(plan, dayNumber())

  return (
    <>
      <section className="card khatma">
        <div className="ring" style={{ '--p': s.percent } as React.CSSProperties}>
          <span>{arabicDigits(s.percent)}٪</span>
        </div>
        <div className="khatma-info">
          <strong>{s.finished ? 'ختمت القرآن، تقبّل الله منك' : `اليوم ${arabicDigits(Math.min(s.day, plan.days))} من ${arabicDigits(plan.days)}`}</strong>
          <span className="muted">
            قرأت {count(Math.min(plan.progress, TOTAL_PAGES), pagesWord)} من {arabicDigits(TOTAL_PAGES)}
          </span>
          {s.behind > 0 && !s.finished && <span className="warn">متأخر {count(s.behind, pagesWord)} عن الخطة</span>}
        </div>
      </section>

      {s.finished ? (
        <button className="button wide" onClick={() => khatma.set({ start: dayNumber(), days: plan.days, progress: 0 })}>
          ابدأ ختمة جديدة
        </button>
      ) : s.doneToday ? (
        <div className="card celebrate">
          <Icon name="check" size={28} />
          <strong>أتممت ورد اليوم</strong>
          <button className="text-button" onClick={() => navigate(`read/${s.from}`)}>
            تابع القراءة من صفحة {arabicDigits(s.from)}
          </button>
        </div>
      ) : (
        <button className="card continue" onClick={() => navigate(`read/${s.from}`)}>
          <span className="card-label">ورد اليوم</span>
          <span className="card-title">
            من صفحة {arabicDigits(s.from)} إلى {arabicDigits(s.to)}
          </span>
          <span className="card-sub">{count(s.to - s.from + 1, pagesWord)} • اقرأ الآن</span>
        </button>
      )}
      <p className="muted center">تُحسب الصفحة مقروءة عندما تنتقل منها إلى التالية.</p>

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
