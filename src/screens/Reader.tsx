import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { useQuran } from '../lib/context'
import { arabicDigits } from '../lib/quran'
import { back, navigate } from '../lib/router'
import { bookmarks, lastRead, toggleBookmark, useStore } from '../lib/store'

interface Props {
  page: number
  highlight: number | null
}

export function Reader({ page, highlight }: Props) {
  const q = useQuran()
  const [first, end] = q.pageRange(page)
  const [selected, setSelected] = useState<number | null>(highlight)
  const [chrome, setChrome] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  const goTo = (p: number) => {
    if (p < 1 || p > q.pageCount) return
    setSelected(null)
    navigate(`read/${p}`, { replace: true })
  }

  useEffect(() => {
    lastRead.set({ page, at: Date.now() })
  }, [page])

  useEffect(() => {
    setSelected(highlight)
    if (highlight !== null) {
      document.querySelector(`[data-ayah="${highlight}"]`)?.scrollIntoView({ block: 'center' })
    } else {
      pageRef.current?.scrollTo({ top: 0 })
    }
  }, [page, highlight])

  // Arabic mushaf: the next page is to the left.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goTo(page + 1)
      else if (e.key === 'ArrowRight') goTo(page - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(dx > 0 ? page + 1 : page - 1)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1800)
  }

  // Split the page into runs of ayahs, starting a new run at every surah opening.
  const blocks: ReactNode[] = []
  let run: ReactNode[] = []
  const flush = () => {
    if (run.length) blocks.push(<p key={`r${blocks.length}`} className="ayat">{run}</p>)
    run = []
  }
  for (let i = first; i < end; i++) {
    const s = q.surahOf(i)
    const n = q.ayahNo(i)
    if (n === 1) {
      flush()
      blocks.push(<SurahHeader key={`h${s}`} surah={s} />)
    }
    run.push(
      <span
        key={i}
        data-ayah={i}
        className={'ayah' + (selected === i ? ' selected' : '')}
        onClick={(e) => {
          e.stopPropagation()
          setSelected(selected === i ? null : i)
        }}
      >
        {/* A no-break space keeps the ayah number on the same line as the last word. */}
        {q.text[i]}{'\u00a0'}<span className="ayah-num">{arabicDigits(n)}</span>{' '}
      </span>,
    )
  }
  flush()

  const headerSurah = q.surahs[q.surahOf(first)]

  return (
    <div className="reader">
      <header className={'topbar reader-bar' + (chrome ? '' : ' hidden')}>
        <button className="icon-button" aria-label="رجوع" onClick={back}>
          <Icon name="chevronRight" />
        </button>
        <div className="reader-title">
          <span className="quran-font">{headerSurah.name}</span>
          <span className="reader-meta">
            الجزء {arabicDigits(q.juzOf(first))} • الربع {arabicDigits(q.hizbQuarterOf(first))}
          </span>
        </div>
        <button className="icon-button" aria-label="بحث" onClick={() => navigate('search')}>
          <Icon name="search" />
        </button>
        <button className="icon-button" aria-label="الرئيسية" onClick={() => navigate('', { replace: true })}>
          <Icon name="home" />
        </button>
      </header>

      <div
        className="page-scroll"
        ref={pageRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => (selected !== null ? setSelected(null) : setChrome((c) => !c))}
      >
        <article className="page">
          {blocks}
          <footer className="page-number">{arabicDigits(page)}</footer>
        </article>
      </div>

      {selected !== null ? (
        <AyahActions
          index={selected}
          onClose={() => setSelected(null)}
          onToast={showToast}
        />
      ) : (
        <nav className={'pager' + (chrome ? '' : ' hidden')}>
          <button className="icon-button" aria-label="الصفحة السابقة" onClick={() => goTo(page - 1)} disabled={page <= 1}>
            <Icon name="chevronRight" />
          </button>
          <span className="pager-label">
            صفحة {arabicDigits(page)} من {arabicDigits(q.pageCount)}
          </span>
          <button className="icon-button" aria-label="الصفحة التالية" onClick={() => goTo(page + 1)} disabled={page >= q.pageCount}>
            <Icon name="chevronLeft" />
          </button>
        </nav>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function SurahHeader({ surah }: { surah: number }) {
  const q = useQuran()
  const s = q.surahs[surah]
  // Al-Fatiha's first ayah is the basmala itself; At-Tawbah has none.
  const basmala = surah !== 0 && surah !== 8
  return (
    <div className="surah-opening">
      <div className="surah-frame">
        <span className="surah-frame-side">{s.meccan ? 'مكية' : 'مدنية'}</span>
        <span className="surah-frame-name quran-font">{s.name}</span>
        <span className="surah-frame-side">{arabicDigits(s.ayahs)} آية</span>
      </div>
      {basmala && <p className="basmala quran-font">{q.text[0]}</p>}
    </div>
  )
}

function AyahActions({ index, onClose, onToast }: { index: number; onClose: () => void; onToast: (m: string) => void }) {
  const q = useQuran()
  const marks = useStore(bookmarks)
  const marked = marks.some((b) => b.i === index)
  const surah = q.surahs[q.surahOf(index)]
  const ref = `${surah.name} • آية ${arabicDigits(q.ayahNo(index))}`
  const shareText = `${q.text[index]}\n[${surah.name}: ${arabicDigits(q.ayahNo(index))}]`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      onToast('تم نسخ الآية')
    } catch {
      onToast('تعذّر النسخ')
    }
  }
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText })
      } catch {
        // cancelled
      }
    } else {
      await copy()
    }
  }

  return (
    <div className="sheet" onClick={(e) => e.stopPropagation()}>
      <div className="sheet-title">{ref}</div>
      <div className="sheet-actions">
        <button
          className={'sheet-button' + (marked ? ' active' : '')}
          onClick={() => {
            toggleBookmark(index)
            onToast(marked ? 'أُزيلت العلامة' : 'أُضيفت العلامة')
          }}
        >
          <Icon name={marked ? 'bookmarkFilled' : 'bookmark'} />
          <span>{marked ? 'إزالة العلامة' : 'علامة'}</span>
        </button>
        <button className="sheet-button" onClick={copy}>
          <Icon name="copy" />
          <span>نسخ</span>
        </button>
        <button className="sheet-button" onClick={share}>
          <Icon name="share" />
          <span>مشاركة</span>
        </button>
        <button className="sheet-button" onClick={onClose}>
          <Icon name="close" />
          <span>إغلاق</span>
        </button>
      </div>
    </div>
  )
}
