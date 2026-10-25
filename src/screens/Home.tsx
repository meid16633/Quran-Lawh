import { useState } from 'react'
import { Icon } from '../components/Icon'
import { ShareImage } from '../components/ShareImage'
import { TabLayout } from '../components/TabLayout'
import { TopBar } from '../components/TopBar'
import { useQuran } from '../lib/context'
import { count, pagesWord } from '../lib/arabic'
import { ayahOfTheDay } from '../lib/daily'
import { dayNumber } from '../lib/dates'
import { khatma, memorized, wirdMark } from '../lib/hifz'
import { khatmaStatus } from '../lib/khatma'
import { notes } from '../lib/notes'
import { arabicDigits } from '../lib/quran'
import { navigate } from '../lib/router'
import { isDue } from '../lib/srs'
import { verseOnly } from '../lib/words'
import { bookmarks, lastRead, toggleBookmark, useStore } from '../lib/store'

type Tab = 'surahs' | 'juz' | 'bookmarks' | 'notes'

const TAB_KEY = 'lawh:home-tab'

function initialTab(): Tab {
  try {
    const t = sessionStorage.getItem(TAB_KEY)
    if (t === 'surahs' || t === 'juz' || t === 'bookmarks' || t === 'notes') return t
  } catch {
    // ignore
  }
  return 'surahs'
}

export function Home() {
  const [tab, setTabState] = useState<Tab>(initialTab)
  const setTab = (t: Tab) => {
    setTabState(t)
    try {
      sessionStorage.setItem(TAB_KEY, t)
    } catch {
      // ignore
    }
  }

  return (
    <TabLayout tab="mushaf">
      <TopBar>
        <span className="logo">لَوْح</span>
        <span className="tagline">احفظ وراجع</span>
      </TopBar>

      <main className="content">
        <ContinueCard />
        <TodayCards />
        <DailyAyah />
        <GoToPage />

        <div className="tabs" role="tablist">
          {(
            [
              ['surahs', 'السور'],
              ['juz', 'الأجزاء'],
              ['bookmarks', 'العلامات'],
              ['notes', 'تدبّراتي'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className="tab" onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'surahs' && <SurahList />}
        {tab === 'juz' && <JuzList />}
        {tab === 'bookmarks' && <BookmarkList />}
        {tab === 'notes' && <NotesList />}
      </main>
    </TabLayout>
  )
}

/** Today's wird and review at a glance, linking to their tabs. */
function TodayCards() {
  const plan = useStore(khatma)
  const memo = useStore(memorized)
  const today = dayNumber()
  const due = Object.values(memo).filter((c) => isDue(c, today)).length
  const wird = plan ? khatmaStatus(plan, today) : null
  return (
    <div className="today">
      <button className="card mini" onClick={() => navigate('wird')}>
        <Icon name="calendar" />
        <span className="mini-title">ورد اليوم</span>
        <span className="mini-sub">
          {!wird
            ? 'خطط لختمتك'
            : wird.finished
              ? 'ختمت، ما شاء الله'
              : wird.doneToday
                ? 'أتممته ✓'
                : `المتبقي ${count(wird.to - wird.from + 1, pagesWord)}`}
        </span>
      </button>
      <button className="card mini" onClick={() => navigate('hifz')}>
        <Icon name="cap" />
        <span className="mini-title">مراجعة اليوم</span>
        <span className="mini-sub">
          {Object.keys(memo).length === 0 ? 'سجّل ما تحفظه' : due === 0 ? 'لا شيء اليوم ✓' : count(due, pagesWord)}
        </span>
      </button>
    </div>
  )
}

function ContinueCard() {
  const q = useQuran()
  const last = useStore(lastRead)
  const mark = useStore(wirdMark)
  const plan = useStore(khatma)

  // The daily wird has its own mark; the last page opened may just be a lookup.
  if (mark) {
    const wird = plan ? khatmaStatus(plan, dayNumber()) : null
    return (
      <div className="continue-group">
        <button className="card continue" onClick={() => navigate(`read/${mark.page}?a=${mark.ayah}`)}>
          <span className="card-label">
            <Icon name="flag" size={16} /> تابع وردك
          </span>
          <span className="card-title quran-font">{q.surahs[q.surahOf(mark.ayah)].name}</span>
          <span className="card-sub">
            آية {arabicDigits(q.ayahNo(mark.ayah))} • الصفحة {arabicDigits(mark.page)} • الجزء {arabicDigits(q.juzOf(mark.ayah))}
            {wird && !wird.finished && (wird.doneToday ? ' • أتممت ورد اليوم ✓' : ` • ورد اليوم حتى ص ${arabicDigits(wird.to)}`)}
          </span>
        </button>
        {last && last.page !== mark.page && (
          <button className="last-opened" onClick={() => navigate(`read/${last.page}`)}>
            آخر صفحة فتحتها: {q.surahs[q.surahOf(q.pageRange(last.page)[0])].name} • ص {arabicDigits(last.page)}
            <Icon name="chevronLeft" size={18} />
          </button>
        )}
      </div>
    )
  }

  if (!last) {
    return (
      <button className="card continue" onClick={() => navigate('read/1')}>
        <span className="card-label">ابدأ القراءة</span>
        <span className="card-title quran-font">{q.surahs[0].name}</span>
        <span className="card-sub">الصفحة {arabicDigits(1)}</span>
      </button>
    )
  }
  const [first] = q.pageRange(last.page)
  const surah = q.surahs[q.surahOf(first)]
  return (
    <button className="card continue" onClick={() => navigate(`read/${last.page}`)}>
      <span className="card-label">تابع من حيث توقفت</span>
      <span className="card-title quran-font">{surah.name}</span>
      <span className="card-sub">
        الصفحة {arabicDigits(last.page)} • الجزء {arabicDigits(q.juzOf(first))}
      </span>
    </button>
  )
}

function GoToPage() {
  const q = useQuran()
  const [value, setValue] = useState('')
  const page = Number(value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)))
  const valid = Number.isInteger(page) && page >= 1 && page <= q.pageCount
  return (
    <form
      className="goto"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) navigate(`read/${page}`)
      }}
    >
      <input
        className="input"
        inputMode="numeric"
        placeholder={`انتقل إلى صفحة (١–${arabicDigits(q.pageCount)})`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="رقم الصفحة"
      />
      <button className="button" disabled={!valid}>
        انتقال
      </button>
    </form>
  )
}

function SurahList() {
  const q = useQuran()
  return (
    <ul className="list">
      {q.surahs.map((s, i) => {
        const start = q.surahStarts[i]
        const page = q.pageOf(start)
        return (
          <li key={i}>
            <button className="row" onClick={() => navigate(`read/${page}`)}>
              <span className="badge">{arabicDigits(i + 1)}</span>
              <span className="row-main">
                <span className="row-title quran-font">{s.name}</span>
                <span className="row-sub">
                  {s.meccan ? 'مكية' : 'مدنية'} • {arabicDigits(s.ayahs)} آية
                </span>
              </span>
              <span className="row-end">ص {arabicDigits(page)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function JuzList() {
  const q = useQuran()
  return (
    <ul className="list">
      {Array.from({ length: 30 }, (_, j) => {
        const start = q.juzStart(j + 1)
        const page = q.pageOf(start)
        const words = q.text[start].replace('\u06DE', '').trim().split(' ').slice(0, 4).join(' ')
        return (
          <li key={j}>
            <button className="row" onClick={() => navigate(`read/${page}`)}>
              <span className="badge">{arabicDigits(j + 1)}</span>
              <span className="row-main">
                <span className="row-title">الجزء {arabicDigits(j + 1)}</span>
                <span className="row-sub">
                  <span className="quran-font">{words}</span> • {q.surahs[q.surahOf(start)].name}{' '}
                  {arabicDigits(q.ayahNo(start))}
                </span>
              </span>
              <span className="row-end">ص {arabicDigits(page)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function BookmarkList() {
  const q = useQuran()
  const list = useStore(bookmarks)
  if (list.length === 0) {
    return <p className="empty">لا توجد علامات بعد. اضغط على أي آية أثناء القراءة لإضافة علامة.</p>
  }
  return (
    <ul className="list">
      {list.map((b) => {
        const s = q.surahOf(b.i)
        const page = q.pageOf(b.i)
        return (
          <li key={b.i} className="row-with-action">
            <button className="row" onClick={() => navigate(`read/${page}?a=${b.i}`)}>
              <span className="row-main">
                <span className="row-title">
                  {q.surahs[s].name} • آية {arabicDigits(q.ayahNo(b.i))}
                </span>
                <span className="row-sub quran-font snippet">{q.text[b.i]}</span>
              </span>
              <span className="row-end">ص {arabicDigits(page)}</span>
            </button>
            <button className="icon-button" aria-label="حذف العلامة" onClick={() => toggleBookmark(b.i)}>
              <Icon name="close" size={18} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function DailyAyah() {
  const q = useQuran()
  const i = ayahOfTheDay(q, dayNumber())
  const [sharing, setSharing] = useState(false)
  return (
    <section className="card daily">
      <span className="card-label">آية اليوم</span>
      <p className="quran-font daily-text">
        {verseOnly(q.text[i])} {arabicDigits(q.ayahNo(i))}
      </p>
      <div className="daily-foot">
        <span className="muted">
          {q.surahs[q.surahOf(i)].name} • آية {arabicDigits(q.ayahNo(i))}
        </span>
        <button className="text-button" onClick={() => navigate(`read/${q.pageOf(i)}?a=${i}`)}>
          في المصحف
        </button>
        <button className="text-button" onClick={() => setSharing(true)}>
          <Icon name="image" size={18} /> صورة
        </button>
      </div>
      {sharing && <ShareImage index={i} onClose={() => setSharing(false)} />}
    </section>
  )
}

function NotesList() {
  const q = useQuran()
  const all = useStore(notes)
  const list = Object.entries(all)
    .map(([i, n]) => ({ i: Number(i), ...n }))
    .sort((a, b) => b.at - a.at)
  if (!list.length) {
    return (
      <p className="empty">
        لم تكتب تدبّرات بعد. اضغط على أي آية أثناء القراءة، ثم «تدبّر»، واكتب ما وقع في قلبك منها.
      </p>
    )
  }
  return (
    <ul className="list">
      {list.map((n) => (
        <li key={n.i}>
          <button className="row note-row" onClick={() => navigate(`read/${q.pageOf(n.i)}?a=${n.i}`)}>
            <span className="row-main">
              <span className="row-sub">
                {q.surahs[q.surahOf(n.i)].name} • آية {arabicDigits(q.ayahNo(n.i))} •{' '}
                {new Date(n.at).toLocaleDateString('ar-EG')}
              </span>
              <span className="quran-font snippet">{q.text[n.i]}</span>
              <span className="note-body">{n.text}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
