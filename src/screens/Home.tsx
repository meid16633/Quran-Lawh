import { useState } from 'react'
import { Icon } from '../components/Icon'
import { useQuran } from '../lib/context'
import { arabicDigits } from '../lib/quran'
import { navigate } from '../lib/router'
import { bookmarks, lastRead, toggleBookmark, useStore } from '../lib/store'

type Tab = 'surahs' | 'juz' | 'bookmarks'

const TAB_KEY = 'lawh:home-tab'

function initialTab(): Tab {
  try {
    const t = sessionStorage.getItem(TAB_KEY)
    if (t === 'surahs' || t === 'juz' || t === 'bookmarks') return t
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
    <div className="screen">
      <header className="topbar">
        <div className="brand">
          <span className="logo">لَوْح</span>
          <span className="tagline">احفظ وراجع</span>
        </div>
        <button className="icon-button" aria-label="بحث" onClick={() => navigate('search')}>
          <Icon name="search" />
        </button>
        <button className="icon-button" aria-label="الإعدادات" onClick={() => navigate('settings')}>
          <Icon name="settings" />
        </button>
      </header>

      <main className="content">
        <ContinueCard />
        <GoToPage />

        <div className="tabs" role="tablist">
          {(
            [
              ['surahs', 'السور'],
              ['juz', 'الأجزاء'],
              ['bookmarks', 'العلامات'],
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
      </main>
    </div>
  )
}

function ContinueCard() {
  const q = useQuran()
  const last = useStore(lastRead)
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
        const words = q.text[start].replace('۞', '').trim().split(' ').slice(0, 4).join(' ')
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
