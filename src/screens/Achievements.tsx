import { Icon } from '../components/Icon'
import { BADGES } from '../lib/achievements'
import { count, daysWord, pagesWord } from '../lib/arabic'
import { quizStats } from '../lib/hifz'
import { badgesEarned, useProgress } from '../lib/progress'
import { arabicDigits } from '../lib/quran'
import { back } from '../lib/router'
import { useStore } from '../lib/store'

export function Achievements() {
  const p = useProgress()
  const got = useStore(badgesEarned)
  const quiz = useStore(quizStats)
  const unlocked = BADGES.filter((b) => got[b.id]).length

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-button" aria-label="رجوع" onClick={back}>
          <Icon name="chevronRight" />
        </button>
        <h1 className="topbar-title">إنجازاتي</h1>
      </header>
      <main className="content">
        <div className="stats">
          <div className="stat">
            <strong>{arabicDigits(p.pagesRead)}</strong>
            <span>صفحة مقروءة</span>
          </div>
          <div className="stat">
            <strong>{arabicDigits(p.reviews)}</strong>
            <span>مراجعة</span>
          </div>
          <div className="stat">
            <strong>{arabicDigits(p.khatmas)}</strong>
            <span>ختمة</span>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <strong className="flame">
              <Icon name="flame" size={18} />
              {arabicDigits(p.bestStreak)}
            </strong>
            <span>أطول سلسلة</span>
          </div>
          <div className="stat">
            <strong>{arabicDigits(p.memorizedPages)}</strong>
            <span>صفحة محفوظة</span>
          </div>
          <div className="stat">
            <strong>{quiz.answered ? `${arabicDigits(Math.round((quiz.correct / quiz.answered) * 100))}٪` : '—'}</strong>
            <span>دقة الاختبارات</span>
          </div>
        </div>

        <section className="card">
          <div className="section-head">
            <h2>الأوسمة</h2>
            <span className="muted">
              {arabicDigits(unlocked)} من {arabicDigits(BADGES.length)}
            </span>
          </div>
          <ul className="badges">
            {BADGES.map((b) => {
              const value = Math.min(b.value(p), b.target)
              const done = Boolean(got[b.id])
              return (
                <li key={b.id} className={'badge-item' + (done ? ' done' : '')}>
                  <span className="badge-icon">
                    <Icon name={b.icon} size={24} />
                  </span>
                  <span className="row-main">
                    <strong>{b.title}</strong>
                    <span className="row-sub">{b.description}</span>
                    {done ? (
                      <span className="row-sub good">نلته في {new Date(got[b.id]).toLocaleDateString('ar-EG')}</span>
                    ) : (
                      b.target > 1 && (
                        <span className="bar-track" aria-label={`${value} من ${b.target}`}>
                          <span className="bar-fill" style={{ width: `${(value / b.target) * 100}%` }} />
                        </span>
                      )
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
        <p className="muted center">
          {p.bestStreak ? `أطول سلسلة لك ${count(p.bestStreak, daysWord)}، ` : ''}
          {p.pagesRead ? `وقرأت ${count(p.pagesRead, pagesWord)}.` : 'ابدأ القراءة لتظهر إحصاءاتك هنا.'}
        </p>
      </main>
    </div>
  )
}
