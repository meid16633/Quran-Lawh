import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { TabLayout } from '../components/TabLayout'
import { TopBar } from '../components/TopBar'
import { count as countOf, daysWord, mistakesWord, pagesWord } from '../lib/arabic'
import { useQuran } from '../lib/context'
import { dayNumber, streak } from '../lib/dates'
import { activity, clearMistakes, markMemorized, memorized, mistakes, unmarkMemorized } from '../lib/hifz'
import { arabicDigits, type Quran } from '../lib/quran'
import { navigate } from '../lib/router'
import { type Card, type Strength, strength } from '../lib/srs'
import { useStore } from '../lib/store'
import { parseWordKey, words } from '../lib/words'

const STATE_LABEL: Record<Strength | 'none', string> = {
  none: 'غير محفوظة',
  strong: 'راسخة',
  learning: 'قيد التثبيت',
  due: 'مستحقة للمراجعة',
  weak: 'تحتاج عناية',
}

export function duePages(memo: Record<string, Card>, today: number): number[] {
  return Object.entries(memo)
    .filter(([, c]) => c.due <= today)
    .sort((a, b) => a[1].due - b[1].due || Number(a[0]) - Number(b[0]))
    .map(([p]) => Number(p))
}

export function activeDays(log: Record<string, { read: number; reviewed: number }>): number[] {
  return Object.entries(log)
    .filter(([, a]) => a.read + a.reviewed > 0)
    .map(([d]) => Number(d))
}

/** Mistake counts per page. */
function mistakesByPage(q: Quran, all: Record<string, { n: number }>): Map<number, number> {
  const out = new Map<number, number>()
  for (const [key, m] of Object.entries(all)) {
    const p = q.pageOf(parseWordKey(key)[0])
    out.set(p, (out.get(p) ?? 0) + m.n)
  }
  return out
}

export function Hifz({ done }: { done: boolean }) {
  const q = useQuran()
  const memo = useStore(memorized)
  const log = useStore(activity)
  const mistakeMap = useStore(mistakes)
  const [adding, setAdding] = useState(false)
  const [pageInfo, setPageInfo] = useState<number | null>(null)
  const today = dayNumber()

  const count = Object.keys(memo).length
  const due = duePages(memo, today)
  const days = streak(activeDays(log), today)
  const nextDue = count && !due.length ? Math.min(...Object.values(memo).map((c) => c.due)) - today : 0
  const perPage = useMemo(() => mistakesByPage(q, mistakeMap), [q, mistakeMap])

  return (
    <TabLayout tab="hifz">
      <TopBar>
        <span className="screen-title">الحفظ والمراجعة</span>
      </TopBar>
      <main className="content">
        {done && (
          <div className="card celebrate">
            <Icon name="check" size={28} />
            <strong>أنهيت مراجعة اليوم</strong>
            <span>بارك الله في حفظك. نراك غدًا.</span>
          </div>
        )}

        <div className="stats">
          <div className="stat">
            <strong>{arabicDigits(count)}</strong>
            <span>صفحة محفوظة</span>
            <small>{arabicDigits(Math.round((count / q.pageCount) * 1000) / 10)}٪ من المصحف</small>
          </div>
          <div className="stat">
            <strong>{arabicDigits(due.length)}</strong>
            <span>للمراجعة اليوم</span>
          </div>
          <div className="stat">
            <strong className="flame">
              <Icon name="flame" size={18} />
              {arabicDigits(days)}
            </strong>
            <span>يوم متتالي</span>
          </div>
        </div>

        {count === 0 ? (
          <div className="card onboarding">
            <strong>ابدأ بتسجيل ما تحفظه</strong>
            <p>
              اختر السور أو الأجزاء التي تحفظها، وسيذكّرك «لوح» كل يوم بالصفحات التي تحتاج مراجعة قبل أن تُنسى، ويباعد
              بين مراجعات الصفحات الراسخة.
            </p>
            <button className="button" onClick={() => setAdding(true)}>
              <Icon name="plus" size={18} /> أضف محفوظك
            </button>
          </div>
        ) : due.length ? (
          <button className="card continue" onClick={() => navigate(`read/${due[0]}?review=1`)}>
            <span className="card-label">مراجعة اليوم</span>
            <span className="card-title">ابدأ المراجعة</span>
            <span className="card-sub">
              {countOf(due.length, pagesWord)} • تبدأ بصفحة {arabicDigits(due[0])}
            </span>
          </button>
        ) : (
          <div className="card">
            <strong>لا مراجعات اليوم ✓</strong>
            <span className="muted">المراجعة القادمة بعد {countOf(nextDue, daysWord)}.</span>
          </div>
        )}

        <button className="card quiz-entry" onClick={() => navigate('quiz')}>
          <Icon name="cap" size={26} />
          <span className="row-main">
            <span className="mini-title">اختبر حفظك</span>
            <span className="mini-sub">ما بعد الآية، السورة، الكلمة الناقصة — بخيارات من المتشابهات</span>
          </span>
          <Icon name="chevronLeft" />
        </button>

        <section className="card">
          <div className="section-head">
            <h2>خريطة المصحف</h2>
            <button className="text-button" onClick={() => setAdding(true)}>
              <Icon name="plus" size={18} /> أضف محفوظ
            </button>
          </div>
          <MushafMap memo={memo} perPage={perPage} today={today} onPage={setPageInfo} />
          <div className="legend">
            {(['strong', 'learning', 'due', 'weak', 'none'] as const).map((s) => (
              <span key={s}>
                <i className={'cell ' + s} /> {STATE_LABEL[s]}
              </span>
            ))}
          </div>
        </section>

        <TopMistakes />
      </main>

      {adding && <AddMemorized onClose={() => setAdding(false)} />}
      {pageInfo !== null && (
        <PageInfo page={pageInfo} mistakes={perPage.get(pageInfo) ?? 0} onClose={() => setPageInfo(null)} />
      )}
    </TabLayout>
  )
}

function cellState(card: Card | undefined, pageMistakes: number, today: number): Strength | 'none' {
  if (!card) return 'none'
  const s = strength(card, today)
  return s !== 'due' && pageMistakes >= 5 ? 'weak' : s
}

function MushafMap({
  memo,
  perPage,
  today,
  onPage,
}: {
  memo: Record<string, Card>
  perPage: Map<number, number>
  today: number
  onPage: (p: number) => void
}) {
  const q = useQuran()
  const rows = useMemo(() => {
    const byJuz: number[][] = Array.from({ length: 30 }, () => [])
    for (let p = 1; p <= q.pageCount; p++) byJuz[q.juzOf(q.pageRange(p)[0]) - 1].push(p)
    return byJuz
  }, [q])
  return (
    <div className="map" role="grid" aria-label="صفحات المصحف">
      {rows.map((pages, j) => (
        <div key={j} className="map-row" role="row">
          <span className="map-label">{arabicDigits(j + 1)}</span>
          <div className="map-cells">
            {pages.map((p) => (
              <button
                key={p}
                role="gridcell"
                className={'cell ' + cellState(memo[p], perPage.get(p) ?? 0, today) + ((perPage.get(p) ?? 0) > 0 ? ' has-mistakes' : '')}
                aria-label={`صفحة ${p}`}
                onClick={() => onPage(p)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PageInfo({ page, mistakes: n, onClose }: { page: number; mistakes: number; onClose: () => void }) {
  const q = useQuran()
  const memo = useStore(memorized)
  const card = memo[page]
  const today = dayNumber()
  const [first] = q.pageRange(page)
  const state = cellState(card, n, today)
  return (
    <Sheet title={`صفحة ${arabicDigits(page)} • ${q.surahs[q.surahOf(first)].name}`} onClose={onClose}>
      <ul className="facts">
        <li>
          الحالة: <strong>{STATE_LABEL[state]}</strong>
        </li>
        {card && (
          <li>
            المراجعة القادمة:{' '}
            <strong>{card.due <= today ? 'اليوم' : `بعد ${countOf(card.due - today, daysWord)}`}</strong>
          </li>
        )}
        {card && card.reps + card.lapses > 0 && (
          <li>
            رُوجعت {arabicDigits(card.reps + card.lapses)} مرة، ونُسيت {arabicDigits(card.lapses)} مرة
          </li>
        )}
        <li>الأخطاء المسجّلة: {n ? countOf(n, mistakesWord) : 'لا يوجد'}</li>
      </ul>
      <div className="button-row">
        <button className="button" onClick={() => navigate(`read/${page}`)}>
          اقرأ
        </button>
        {card ? (
          <>
            <button className="button secondary" onClick={() => navigate(`read/${page}?review=1`)}>
              راجعها الآن
            </button>
            <button
              className="button ghost"
              onClick={() => {
                unmarkMemorized(page)
                onClose()
              }}
            >
              إزالة من المحفوظ
            </button>
          </>
        ) : (
          <button
            className="button secondary"
            onClick={() => {
              markMemorized([page])
              onClose()
            }}
          >
            أضف للمحفوظ
          </button>
        )}
      </div>
    </Sheet>
  )
}

function pagesOfSurah(q: Quran, s: number): number[] {
  const start = q.surahStarts[s]
  return range(q.pageOf(start), q.pageOf(start + q.surahs[s].ayahs - 1))
}

function pagesOfJuz(q: Quran, j: number): number[] {
  const startPage = q.pageOf(q.juzStart(j))
  const endPage = j < 30 ? q.pageOf(q.juzStart(j + 1) - 1) : q.pageCount
  return range(startPage, endPage)
}

function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, k) => a + k)
}

function AddMemorized({ onClose }: { onClose: () => void }) {
  const q = useQuran()
  const [by, setBy] = useState<'surah' | 'juz' | 'pages'>('surah')
  const [picked, setPicked] = useState<Set<number>>(() => new Set())
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const toggle = (n: number) =>
    setPicked((s) => {
      const next = new Set(s)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })

  const pages = new Set<number>()
  if (by === 'surah') picked.forEach((s) => pagesOfSurah(q, s).forEach((p) => pages.add(p)))
  if (by === 'juz') picked.forEach((j) => pagesOfJuz(q, j).forEach((p) => pages.add(p)))
  if (by === 'pages') {
    const a = Number(from)
    const b = Number(to || from)
    if (a >= 1 && b >= a && b <= q.pageCount) range(a, b).forEach((p) => pages.add(p))
  }

  return (
    <Sheet title="أضف ما تحفظه" onClose={onClose}>
      <div className="chips" role="tablist">
        {(
          [
            ['surah', 'بالسورة'],
            ['juz', 'بالجزء'],
            ['pages', 'بالصفحات'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={by === id}
            className="chip"
            onClick={() => {
              setBy(id)
              setPicked(new Set())
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {by === 'surah' && (
        <div className="pick-list">
          {q.surahs.map((s, i) => (
            <button key={i} className="pick" aria-pressed={picked.has(i)} onClick={() => toggle(i)}>
              <span className="badge">{arabicDigits(i + 1)}</span>
              <span className="quran-font">{s.name}</span>
              {picked.has(i) && <Icon name="check" size={18} />}
            </button>
          ))}
        </div>
      )}
      {by === 'juz' && (
        <div className="juz-grid">
          {range(1, 30).map((j) => (
            <button key={j} className="chip" aria-pressed={picked.has(j)} onClick={() => toggle(j)}>
              {arabicDigits(j)}
            </button>
          ))}
        </div>
      )}
      {by === 'pages' && (
        <div className="goto">
          <input className="input" inputMode="numeric" placeholder="من صفحة" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="input" inputMode="numeric" placeholder="إلى صفحة" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      )}

      <button
        className="button wide"
        disabled={pages.size === 0}
        onClick={() => {
          markMemorized([...pages])
          onClose()
        }}
      >
        إضافة {pages.size ? countOf(pages.size, pagesWord) : ''}
      </button>
    </Sheet>
  )
}

function TopMistakes() {
  const q = useQuran()
  const all = useStore(mistakes)
  const byAyah = new Map<number, { keys: string[]; words: Set<number>; n: number }>()
  for (const [key, m] of Object.entries(all)) {
    const [a, w] = parseWordKey(key)
    const entry = byAyah.get(a) ?? { keys: [], words: new Set<number>(), n: 0 }
    entry.keys.push(key)
    entry.words.add(w)
    entry.n += m.n
    byAyah.set(a, entry)
  }
  const top = [...byAyah].sort((a, b) => b[1].n - a[1].n).slice(0, 10)

  return (
    <section className="card">
      <div className="section-head">
        <h2>أكثر المواضع أخطاءً</h2>
      </div>
      {top.length === 0 ? (
        <p className="muted">
          لا أخطاء مسجّلة بعد. فعّل وضع الحفظ في المصحف، واستخدم «قلم الأخطاء» لتسجيل الكلمات التي تخطئ فيها أثناء التسميع.
        </p>
      ) : (
        <ul className="mistake-list">
          {top.map(([a, e]) => (
            <li key={a}>
              <button className="mistake-item" onClick={() => navigate(`read/${q.pageOf(a)}?a=${a}`)}>
                <span className="row-sub">
                  {q.surahs[q.surahOf(a)].name} • آية {arabicDigits(q.ayahNo(a))} • {countOf(e.n, mistakesWord)}
                </span>
                <span className="quran-font mistake-text">
                  {words(q.text[a]).map((w, k) => (
                    <span key={k} className={e.words.has(k) ? 'bad' : undefined}>
                      {w}{' '}
                    </span>
                  ))}
                </span>
              </button>
              <button className="icon-button" aria-label="مسح أخطاء هذه الآية" onClick={() => clearMistakes(e.keys)}>
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
