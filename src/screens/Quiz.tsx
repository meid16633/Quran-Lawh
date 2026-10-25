import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { useQuran } from '../lib/context'
import { memorized, quizStats, recordQuiz } from '../lib/hifz'
import { type Question, type QuestionKind, buildQuiz, seeded } from '../lib/quiz'
import { arabicDigits, type Quran } from '../lib/quran'
import { back, navigate } from '../lib/router'
import { loadSimilar } from '../lib/study'
import { useStore } from '../lib/store'
import { verseOnly, words } from '../lib/words'

type Scope = { kind: 'memorized' } | { kind: 'juz'; juz: number } | { kind: 'surah'; surah: number } | { kind: 'all' }

const KINDS: [QuestionKind, string][] = [
  ['next', 'ما الآية التالية؟'],
  ['surah', 'من أي سورة؟'],
  ['word', 'الكلمة الناقصة'],
]

function poolOf(q: Quran, scope: Scope, memo: Record<string, unknown>): number[] {
  const range = (a: number, b: number) => Array.from({ length: b - a }, (_, k) => a + k)
  if (scope.kind === 'memorized') return Object.keys(memo).flatMap((p) => range(...q.pageRange(Number(p))))
  if (scope.kind === 'juz') return range(q.juzStart(scope.juz), scope.juz < 30 ? q.juzStart(scope.juz + 1) : q.text.length)
  if (scope.kind === 'surah') return range(q.surahStarts[scope.surah], q.surahStarts[scope.surah] + q.surahs[scope.surah].ayahs)
  return range(0, q.text.length)
}

interface Answer {
  question: Question
  chosen: number
}

export function Quiz() {
  const q = useQuran()
  const memo = useStore(memorized)
  const stats = useStore(quizStats)
  const hasMemorized = Object.keys(memo).length > 0
  const [scope, setScope] = useState<Scope>(hasMemorized ? { kind: 'memorized' } : { kind: 'juz', juz: 30 })
  const [kinds, setKinds] = useState<QuestionKind[]>(['next', 'surah', 'word'])
  const [count, setCount] = useState(10)
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setError(null)
    try {
      const similar = await loadSimilar()
      const built = buildQuiz(q, similar, poolOf(q, scope, memo), kinds, count, seeded(Date.now()))
      if (built.length < 3) return setError('النطاق المختار صغير جدًا، اختر نطاقًا أكبر.')
      setAnswers([])
      setQuestions(built)
    } catch {
      setError('تعذّر تحميل البيانات.')
    }
  }

  const finished = questions !== null && answers.length === questions.length
  const current = questions && !finished ? questions[answers.length] : null

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-button" aria-label="رجوع" onClick={back}>
          <Icon name="chevronRight" />
        </button>
        <h1 className="topbar-title">اختبر حفظك</h1>
        {questions && !finished && (
          <span className="quiz-progress">
            {arabicDigits(answers.length + 1)} / {arabicDigits(questions.length)}
          </span>
        )}
      </header>
      <main className="content">
        {!questions ? (
          <Setup
            q={q}
            hasMemorized={hasMemorized}
            scope={scope}
            setScope={setScope}
            kinds={kinds}
            setKinds={setKinds}
            count={count}
            setCount={setCount}
            onStart={start}
            error={error}
            stats={stats}
          />
        ) : finished ? (
          <Results
            answers={answers}
            onAgain={start}
            onSetup={() => setQuestions(null)}
            recorded={() => recordQuiz(answers.length, answers.filter((a) => a.chosen === a.question.answer).length)}
          />
        ) : (
          <QuestionCard
            key={answers.length}
            question={current!}
            onAnswer={(chosen) => setAnswers((a) => [...a, { question: current!, chosen }])}
          />
        )}
      </main>
    </div>
  )
}

function Setup(p: {
  q: Quran
  hasMemorized: boolean
  scope: Scope
  setScope: (s: Scope) => void
  kinds: QuestionKind[]
  setKinds: (k: QuestionKind[]) => void
  count: number
  setCount: (n: number) => void
  onStart: () => void
  error: string | null
  stats: { quizzes: number; answered: number; correct: number }
}) {
  const { q, scope, setScope } = p
  return (
    <>
      <section className="card settings-section">
        <h2>من أين الأسئلة؟</h2>
        <div className="chips">
          {p.hasMemorized && (
            <button className="chip" aria-pressed={scope.kind === 'memorized'} onClick={() => setScope({ kind: 'memorized' })}>
              من محفوظي
            </button>
          )}
          <button className="chip" aria-pressed={scope.kind === 'juz' && scope.juz === 30} onClick={() => setScope({ kind: 'juz', juz: 30 })}>
            جزء عمّ
          </button>
          <button className="chip" aria-pressed={scope.kind === 'juz' && scope.juz === 29} onClick={() => setScope({ kind: 'juz', juz: 29 })}>
            جزء تبارك
          </button>
          <button className="chip" aria-pressed={scope.kind === 'all'} onClick={() => setScope({ kind: 'all' })}>
            المصحف كله
          </button>
        </div>
        <div className="select-row">
          <select
            className="input"
            aria-label="جزء"
            value={scope.kind === 'juz' ? scope.juz : ''}
            onChange={(e) => setScope({ kind: 'juz', juz: Number(e.target.value) })}
          >
            <option value="" disabled>
              اختر جزءًا
            </option>
            {Array.from({ length: 30 }, (_, j) => (
              <option key={j} value={j + 1}>
                الجزء {arabicDigits(j + 1)}
              </option>
            ))}
          </select>
          <select
            className="input"
            aria-label="سورة"
            value={scope.kind === 'surah' ? scope.surah : ''}
            onChange={(e) => setScope({ kind: 'surah', surah: Number(e.target.value) })}
          >
            <option value="" disabled>
              اختر سورة
            </option>
            {q.surahs.map((s, i) => (
              <option key={i} value={i}>
                {arabicDigits(i + 1)}. {s.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card settings-section">
        <h2>نوع الأسئلة</h2>
        <div className="chips">
          {KINDS.map(([k, label]) => (
            <button
              key={k}
              className="chip"
              aria-pressed={p.kinds.includes(k)}
              onClick={() => {
                const next = p.kinds.includes(k) ? p.kinds.filter((x) => x !== k) : [...p.kinds, k]
                if (next.length) p.setKinds(next)
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <h2>عدد الأسئلة</h2>
        <div className="chips">
          {[5, 10, 20].map((n) => (
            <button key={n} className="chip" aria-pressed={p.count === n} onClick={() => p.setCount(n)}>
              {arabicDigits(n)}
            </button>
          ))}
        </div>
      </section>

      {p.error && <p className="warn">{p.error}</p>}
      <button className="button wide" onClick={p.onStart}>
        ابدأ الاختبار
      </button>
      {p.stats.quizzes > 0 && (
        <p className="muted center">
          أجريت {arabicDigits(p.stats.quizzes)} اختبارًا، ودقّتك {arabicDigits(Math.round((p.stats.correct / p.stats.answered) * 100))}٪
        </p>
      )}
      <p className="muted">
        الخيارات الخاطئة مأخوذة غالبًا من الآيات المتشابهة، فهي تختبر التمييز بين المواضع التي يكثر فيها الخلط.
      </p>
    </>
  )
}

const PROMPTS: Record<QuestionKind, string> = {
  next: 'ما الآية التالية؟',
  surah: 'من أي سورة هذه الآية؟',
  word: 'ما الكلمة الناقصة؟',
}

function QuestionCard({ question, onAnswer }: { question: Question; onAnswer: (i: number) => void }) {
  const q = useQuran()
  const [chosen, setChosen] = useState<number | null>(null)
  const w = words(verseOnly(q.text[question.ayah]))
  const shift = words(q.text[question.ayah]).length - w.length

  return (
    <>
      <section className="card quiz-card">
        <span className="card-label">{PROMPTS[question.kind]}</span>
        <p className="quran-font quiz-ayah">
          {question.kind === 'word'
            ? w.map((x, k) => (
                <span key={k}>
                  {k + shift === question.hidden ? (
                    <span className={'blank' + (chosen !== null ? ' filled' : '')}>{chosen !== null ? x : '…………'}</span>
                  ) : (
                    x
                  )}{' '}
                </span>
              ))
            : verseOnly(q.text[question.ayah])}{' '}
          {question.kind !== 'surah' && arabicDigits(q.ayahNo(question.ayah))}
        </p>
      </section>
      <div className="quiz-options">
        {question.options.map((o, k) => {
          let cls = 'quiz-option quran-font'
          if (question.kind === 'next') cls += ' long'
          if (chosen !== null && k === question.answer) cls += ' right'
          else if (chosen === k) cls += ' wrong'
          return (
            <button key={k} className={cls} disabled={chosen !== null} onClick={() => setChosen(k)}>
              {question.kind === 'next' ? verseOnly(o) : o}
            </button>
          )
        })}
      </div>
      {chosen !== null && (
        <div className="quiz-next">
          <span className={chosen === question.answer ? 'good' : 'warn'}>
            {chosen === question.answer ? 'إجابة صحيحة ✓' : 'إجابة خاطئة'}
          </span>
          <button className="button" onClick={() => onAnswer(chosen)}>
            التالي
          </button>
        </div>
      )}
    </>
  )
}

function Results({ answers, onAgain, onSetup, recorded }: { answers: Answer[]; onAgain: () => void; onSetup: () => void; recorded: () => void }) {
  const q = useQuran()
  const saved = useRef(false)
  useEffect(() => {
    if (!saved.current) recorded()
    saved.current = true
  }, [recorded])
  const correct = answers.filter((a) => a.chosen === a.question.answer).length
  const wrong = answers.filter((a) => a.chosen !== a.question.answer)
  const ratio = correct / answers.length
  return (
    <>
      <section className={'card result-card' + (ratio === 1 ? ' perfect' : '')}>
        <strong className="score">
          {arabicDigits(correct)} من {arabicDigits(answers.length)}
        </strong>
        <span>{ratio === 1 ? 'ما شاء الله، حفظ متقن!' : ratio >= 0.7 ? 'أحسنت، واصل المراجعة.' : 'تحتاج هذه المواضع إلى مراجعة.'}</span>
      </section>
      {wrong.length > 0 && (
        <section className="card">
          <div className="section-head">
            <h2>راجع هذه المواضع</h2>
          </div>
          <ul className="mistake-list">
            {wrong.map((a, k) => {
              const i = a.question.kind === 'next' ? a.question.ayah + 1 : a.question.ayah
              return (
                <li key={k}>
                  <button className="mistake-item" onClick={() => navigate(`read/${q.pageOf(i)}?a=${i}`)}>
                    <span className="row-sub">
                      {q.surahs[q.surahOf(i)].name} • آية {arabicDigits(q.ayahNo(i))}
                    </span>
                    <span className="quran-font mistake-text">{verseOnly(q.text[i])}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      <div className="button-row">
        <button className="button" onClick={onAgain}>
          اختبار جديد بنفس الإعدادات
        </button>
        <button className="button ghost" onClick={onSetup}>
          تغيير الإعدادات
        </button>
      </div>
    </>
  )
}
