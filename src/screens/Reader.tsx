import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { AyahStudy, type StudyTab } from '../components/AyahStudy'
import { Icon } from '../components/Icon'
import { PlayerBar } from '../components/PlayerBar'
import { ShareImage } from '../components/ShareImage'
import { Sheet } from '../components/Sheet'
import { TajweedGuide } from '../components/TajweedGuide'
import { count, mistakesWord } from '../lib/arabic'
import { useQuran } from '../lib/context'
import { dayNumber } from '../lib/dates'
import {
  addMistake,
  gradePage,
  khatma,
  markMemorized,
  memorized,
  mistakes,
  pageFinished,
  removeMistake,
  setWirdMark,
  unmarkMemorized,
  wirdMark,
} from '../lib/hifz'
import { khatmaStatus } from '../lib/khatma'
import { notes } from '../lib/notes'
import { player, playerSettings, playerState } from '../lib/player'
import { arabicDigits } from '../lib/quran'
import { back, navigate } from '../lib/router'
import { type Grade, suggestGrade } from '../lib/srs'
import { type SimilarData, loadSimilar } from '../lib/study'
import { bookmarks, createMemoryStore, lastRead, readerPrefs, toggleBookmark, useStore } from '../lib/store'
import { type TajweedData, loadTajweed, pieces, runsOf } from '../lib/tajweed'
import { firstLetter, wordKey, words } from '../lib/words'

interface Props {
  page: number
  highlight: number | null
  review: boolean
}

// Survives page turns (the reader remounts for every page).
const chromeStore = createMemoryStore(true)

export function Reader({ page, highlight, review }: Props) {
  const q = useQuran()
  const [first, end] = q.pageRange(page)
  const prefs = useStore(readerPrefs)
  const chrome = useStore(chromeStore)
  const mistakeMap = useStore(mistakes)
  const memo = useStore(memorized)
  const plan = useStore(khatma)
  const pstate = useStore(playerState)
  const psettings = useStore(playerSettings)
  const [selected, setSelected] = useState<number | null>(highlight)
  const [toast, setToast] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())
  const [pen, setPen] = useState(false)
  const [marks, setMarks] = useState<Set<string>>(() => new Set())
  const [grading, setGrading] = useState(false)
  const [study, setStudy] = useState<{ index: number; tab: StudyTab } | null>(null)
  const [sharing, setSharing] = useState<number | null>(null)
  const [similar, setSimilar] = useState<SimilarData | null>(null)
  const [tajweed, setTajweed] = useState<TajweedData | null>(null)
  const [guide, setGuide] = useState(false)
  const noteMap = useStore(notes)
  const mark = useStore(wirdMark)
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSimilar().then(setSimilar, () => {})
  }, [])

  useEffect(() => {
    if (prefs.tajweed) loadTajweed().then(setTajweed, () => showToast('تعذّر تحميل ألوان التجويد'))
  }, [prefs.tajweed])

  const toggleTajweed = () => {
    const on = !prefs.tajweed
    readerPrefs.set((p) => ({ ...p, tajweed: on, tajweedGuideSeen: true }))
    if (on && !prefs.tajweedGuideSeen) setGuide(true)
    else showToast(on ? 'ألوان التجويد ظاهرة' : 'أُخفيت ألوان التجويد')
  }

  const mode = prefs.hifz
  const playing = pstate.status !== 'idle' && pstate.pos && !pstate.pos.basmala ? pstate.pos.i : null
  const suffix = review ? '?review=1' : ''

  const goTo = (p: number) => {
    if (p < 1 || p > q.pageCount) return
    if (p === page + 1) pageFinished(page, q.pageRange(p)[0])
    navigate(`read/${p}${suffix}`, { replace: true })
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1800)
  }

  useEffect(() => {
    lastRead.set({ page, at: Date.now() })
    if (review && readerPrefs.get().hifz === 'off') readerPrefs.set((p) => ({ ...p, hifz: p.lastHifz }))
  }, [page, review])

  useEffect(() => {
    if (highlight !== null) document.querySelector(`[data-ayah="${highlight}"]`)?.scrollIntoView({ block: 'center' })
  }, [highlight])

  // Follow the recitation: turn to its page and keep the ayah in view.
  useEffect(() => {
    if (playing === null || !psettings.follow) return
    const p = q.pageOf(playing)
    if (p !== page) navigate(`read/${p}${suffix}`, { replace: true })
    else document.querySelector(`[data-ayah="${playing}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [playing])

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

  // ---- memorization ----
  const pageWords: string[][] = []
  for (let i = first; i < end; i++) pageWords.push(words(q.text[i]))
  const isHidden = (key: string) => mode !== 'off' && !revealed.has(key)

  const reveal = (keys: string[]) => setRevealed((prev) => new Set([...prev, ...keys]))

  const firstHidden = (): [number, number] | null => {
    for (let a = 0; a < pageWords.length; a++)
      for (let w = 0; w < pageWords[a].length; w++) if (isHidden(wordKey(first + a, w))) return [first + a, w]
    return null
  }

  const revealNextWord = () => {
    const next = firstHidden()
    if (!next) return showToast('ظهرت الصفحة كلها')
    const key = wordKey(...next)
    reveal([key])
    document.querySelector(`[data-word="${key}"]`)?.scrollIntoView({ block: 'nearest' })
  }

  const revealNextAyah = () => {
    const next = firstHidden()
    if (!next) return showToast('ظهرت الصفحة كلها')
    const [a] = next
    reveal(pageWords[a - first].map((_, w) => wordKey(a, w)))
    document.querySelector(`[data-ayah="${a}"]`)?.scrollIntoView({ block: 'nearest' })
  }

  const toggleMark = (key: string) => {
    if (marks.has(key)) {
      removeMistake(key)
      setMarks((m) => new Set([...m].filter((k) => k !== key)))
    } else {
      addMistake(key)
      setMarks((m) => new Set([...m, key]))
      navigator.vibrate?.(15)
    }
  }

  const onWord = (key: string) => (e: React.MouseEvent) => {
    if (pen) {
      e.stopPropagation()
      toggleMark(key)
    } else if (isHidden(key)) {
      e.stopPropagation()
      reveal([key])
    }
  }

  const setMode = (hifz: 'off' | 'hide' | 'first') => {
    readerPrefs.set((p) => ({ ...p, hifz, lastHifz: hifz === 'off' ? p.lastHifz : hifz }))
    setRevealed(new Set())
    if (hifz === 'off') setPen(false)
  }

  // ---- page content ----
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
    const ws = pageWords[i - first]
    const runs = prefs.tajweed && tajweed ? runsOf(tajweed, i) : null
    let offset = 0
    run.push(
      <span
        key={i}
        data-ayah={i}
        className={'ayah' + (selected === i ? ' selected' : '') + (playing === i ? ' playing' : '')}
        onClick={(e) => {
          e.stopPropagation()
          if (!pen) setSelected(selected === i ? null : i)
        }}
      >
        {mark?.ayah === i && (
          <span className="wird-ribbon" title="علامة الورد" aria-label="علامة الورد">
            <Icon name="flag" size={20} />
          </span>
        )}
        {ws.map((w, k) => {
          const key = wordKey(i, k)
          const from = offset
          offset += w.length + 1
          const m = mistakeMap[key]
          let cls = 'w'
          if (isHidden(key)) cls += mode === 'hide' ? ' hidden' : ' first'
          if (m && (prefs.showMistakes || mode !== 'off' || pen)) cls += ` mistake m${Math.min(m.n, 3)}`
          if (marks.has(key)) cls += ' marked'
          return (
            <Fragment key={k}>
              {k > 0 && ' '}
              <span
                className={cls}
                data-word={key}
                data-first={mode === 'first' ? firstLetter(w) : undefined}
                onClick={onWord(key)}
              >
                {runs && !isHidden(key)
                  ? pieces(q.text[i], runs, from, from + w.length).map((p, n) =>
                      p.cls ? (
                        <span key={n} className={`tj-${p.cls}`}>
                          {p.text}
                        </span>
                      ) : (
                        p.text
                      ),
                    )
                  : w}
              </span>
            </Fragment>
          )
        })}
        {/* A no-break space keeps the ayah number on the same line as the last word. */}
        {'\u00A0'}
        <span className={'ayah-num' + (noteMap[i] ? ' noted' : '')}>{arabicDigits(n)}</span>{' '}
      </span>,
    )
  }
  flush()

  const headerSurah = q.surahs[q.surahOf(first)]
  const isMemorized = Boolean(memo[page])
  const wird = plan ? khatmaStatus(plan, dayNumber()) : null
  const wirdEndsHere = wird && !wird.doneToday && page === plan!.progress + 1 && (page === wird.to || page === q.pageCount)
  const playerActive = pstate.status !== 'idle'

  return (
    <div className="reader">
      <header className={'topbar reader-bar' + (chrome || mode !== 'off' ? '' : ' hidden')}>
        <button className="icon-button" aria-label="رجوع" onClick={back}>
          <Icon name="chevronRight" />
        </button>
        <div className="reader-title">
          <span className="quran-font">{headerSurah.name}</span>
          <span className="reader-meta">
            {review ? 'مراجعة • ' : ''}الجزء {arabicDigits(q.juzOf(first))} • الربع {arabicDigits(q.hizbQuarterOf(first))}
          </span>
        </div>
        <button
          className={'icon-button' + (mode !== 'off' ? ' on' : '')}
          aria-label="وضع الحفظ"
          aria-pressed={mode !== 'off'}
          onClick={() => setMode(mode === 'off' ? prefs.lastHifz : 'off')}
        >
          <Icon name="eye" />
        </button>
        <button
          className={'icon-button' + (playerActive ? ' on' : '')}
          aria-label="استماع"
          onClick={() => (playerActive ? player.toggle() : player.play(q, selected ?? first))}
        >
          <Icon name="headphones" />
        </button>
        <button
          className={'icon-button' + (prefs.tajweed ? ' on' : '')}
          aria-label="ألوان التجويد"
          aria-pressed={prefs.tajweed}
          onClick={toggleTajweed}
        >
          <Icon name="palette" />
        </button>
        <button className="icon-button" aria-label="بحث" onClick={() => navigate('search')}>
          <Icon name="search" />
        </button>
      </header>

      <div
        className={'page-scroll' + (pen ? ' pen-mode' : '')}
        ref={pageRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => (selected !== null ? setSelected(null) : chromeStore.set((c) => !c))}
      >
        <article className={'page' + (mode !== 'off' ? ' with-tools' : '')}>
          {blocks}
          {wirdEndsHere && (
            <button
              className="button wide wird-done"
              onClick={(e) => {
                e.stopPropagation()
                pageFinished(page, page < q.pageCount ? q.pageRange(page + 1)[0] : null)
                showToast(page === q.pageCount ? 'ختمت القرآن، تقبّل الله منك' : 'أتممت ورد اليوم، بارك الله فيك')
              }}
            >
              <Icon name="check" /> {page === q.pageCount ? 'أتممت الختمة' : 'أتممت ورد اليوم'}
            </button>
          )}
          <footer className="page-number">{arabicDigits(page)}</footer>
        </article>
      </div>

      <div className="bottom-stack" onClick={(e) => e.stopPropagation()}>
        {selected !== null ? (
          <AyahActions
            index={selected}
            similar={similar?.[selected]?.length ?? 0}
            onClose={() => setSelected(null)}
            onToast={showToast}
            onStudy={(tab) => setStudy({ index: selected, tab })}
            onImage={() => setSharing(selected)}
            onWirdMark={() => {
              setWirdMark(selected, page)
              setSelected(null)
              showToast(plan ? 'وُضعت علامة الورد هنا، وستكمل ختمتك منها' : 'وُضعت علامة الورد هنا')
            }}
          />
        ) : (
          <>
            {mode !== 'off' && (
              <HifzBar
                mode={mode}
                pen={pen}
                review={review}
                memorized={isMemorized}
                marks={marks.size}
                onMode={setMode}
                onPen={() => setPen((p) => !p)}
                onWord={revealNextWord}
                onAyah={revealNextAyah}
                onHide={() => setRevealed(new Set())}
                onMemorized={() => {
                  if (isMemorized) {
                    unmarkMemorized(page)
                    showToast('أُزيلت من المحفوظ')
                  } else {
                    markMemorized([page])
                    showToast('أُضيفت للمحفوظ، وستظهر في مراجعاتك')
                  }
                }}
                onFinish={() => setGrading(true)}
              />
            )}
            {playerActive ? (
              <PlayerBar />
            ) : (
              mode === 'off' && (
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
              )
            )}
          </>
        )}
      </div>

      {study && <AyahStudy index={study.index} tab={study.tab} onClose={() => setStudy(null)} />}
      {sharing !== null && <ShareImage index={sharing} onClose={() => setSharing(null)} />}
      {grading && <GradeSheet page={page} mistakes={marks.size} onClose={() => setGrading(false)} />}
      {guide && <TajweedGuide onClose={() => setGuide(false)} />}
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

interface HifzBarProps {
  mode: 'hide' | 'first'
  pen: boolean
  review: boolean
  memorized: boolean
  marks: number
  onMode: (m: 'hide' | 'first') => void
  onPen: () => void
  onWord: () => void
  onAyah: () => void
  onHide: () => void
  onMemorized: () => void
  onFinish: () => void
}

function HifzBar(p: HifzBarProps) {
  return (
    <div className="hifz-bar">
      <div className="hifz-row">
        <div className="chips compact" role="radiogroup" aria-label="طريقة الإخفاء">
          <button role="radio" aria-checked={p.mode === 'hide'} className="chip" onClick={() => p.onMode('hide')}>
            إخفاء
          </button>
          <button role="radio" aria-checked={p.mode === 'first'} className="chip" onClick={() => p.onMode('first')}>
            أوائل الكلمات
          </button>
        </div>
        <button className={'tool' + (p.pen ? ' active danger' : '')} aria-pressed={p.pen} onClick={p.onPen}>
          <Icon name="pen" size={18} />
          <span>{p.pen ? `الأخطاء: ${arabicDigits(p.marks)}` : 'قلم الأخطاء'}</span>
        </button>
        {!p.review && (
          <button className={'tool' + (p.memorized ? ' active' : '')} aria-pressed={p.memorized} onClick={p.onMemorized}>
            <Icon name={p.memorized ? 'check' : 'star'} size={18} />
            <span>{p.memorized ? 'محفوظة' : 'حفظتها'}</span>
          </button>
        )}
      </div>
      {p.pen && <p className="hint">اضغط على أي كلمة أخطأت فيها لتسجيلها، واضغط مرة أخرى للتراجع.</p>}
      <div className="hifz-row actions">
        <button className="tool big" onClick={p.onWord}>اكشف كلمة</button>
        <button className="tool big" onClick={p.onAyah}>اكشف آية</button>
        <button className="tool big" aria-label="إخفاء الكل" onClick={p.onHide}>
          <Icon name="refresh" size={18} />
        </button>
        {p.review && (
          <button className="tool big primary" onClick={p.onFinish}>
            إنهاء المراجعة
          </button>
        )}
      </div>
    </div>
  )
}

const GRADES: [Grade, string, string][] = [
  [0, 'نسيتها', 'تعود غدًا'],
  [3, 'صعبة', 'تعود قريبًا'],
  [4, 'جيدة', 'تتباعد'],
  [5, 'ممتازة', 'تتباعد أكثر'],
]

function GradeSheet({ page, mistakes: n, onClose }: { page: number; mistakes: number; onClose: () => void }) {
  const q = useQuran()
  const suggested = suggestGrade(n)
  const grade = (g: Grade) => {
    gradePage(page, g)
    const today = dayNumber()
    const due = Object.entries(memorized.get())
      .filter(([p, c]) => Number(p) !== page && c.due <= today)
      .sort((a, b) => a[1].due - b[1].due || Number(a[0]) - Number(b[0]))
    if (due.length) navigate(`read/${due[0][0]}?review=1`, { replace: true })
    else navigate('hifz?done=1', { replace: true })
  }
  return (
    <Sheet title={`كيف كانت مراجعة صفحة ${arabicDigits(page)}؟`} onClose={onClose}>
      <p className="grade-summary">
        {q.surahs[q.surahOf(q.pageRange(page)[0])].name}: {n === 0 ? 'لم تسجّل أي خطأ.' : `عدد الأخطاء المسجّلة: ${count(n, mistakesWord)}.`}
      </p>
      <div className="grades">
        {GRADES.map(([g, label, sub]) => (
          <button key={g} className={'grade g' + g + (g === suggested ? ' suggested' : '')} onClick={() => grade(g)}>
            <strong>{label}</strong>
            <small>{sub}</small>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

interface AyahActionsProps {
  index: number
  similar: number
  onClose: () => void
  onToast: (m: string) => void
  onStudy: (tab: StudyTab) => void
  onImage: () => void
  onWirdMark: () => void
}

function AyahActions({ index, similar, onClose, onToast, onStudy, onImage, onWirdMark }: AyahActionsProps) {
  const q = useQuran()
  const marks = useStore(bookmarks)
  const noteMap = useStore(notes)
  const mark = useStore(wirdMark)
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
    <div className="sheet">
      <div className="sheet-head">
        <div className="sheet-title">{ref}</div>
        <button className="icon-button" aria-label="إغلاق" onClick={onClose}>
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="sheet-actions">
        <button
          className="sheet-button"
          onClick={() => {
            player.play(q, index)
            onClose()
          }}
        >
          <Icon name="play" />
          <span>استماع</span>
        </button>
        <button className="sheet-button" onClick={() => onStudy('tafsir')}>
          <Icon name="book" />
          <span>تفسير</span>
        </button>
        <button className={'sheet-button' + (similar ? ' badge-host' : '')} onClick={() => onStudy('similar')}>
          <Icon name="layers" />
          <span>متشابهات</span>
          {similar > 0 && <b className="count">{arabicDigits(similar)}</b>}
        </button>
        <button className={'sheet-button' + (noteMap[index] ? ' active' : '')} onClick={() => onStudy('note')}>
          <Icon name="pen" />
          <span>تدبّر</span>
        </button>
        <button
          className={'sheet-button' + (marked ? ' active' : '')}
          onClick={() => {
            toggleBookmark(index)
            onToast(marked ? 'أُزيلت العلامة' : 'أُضيفت العلامة')
          }}
        >
          <Icon name={marked ? 'bookmarkFilled' : 'bookmark'} />
          <span>{marked ? 'إزالة' : 'علامة'}</span>
        </button>
        <button className={'sheet-button' + (mark?.ayah === index ? ' active' : '')} onClick={onWirdMark}>
          <Icon name="flag" />
          <span>علامة الورد</span>
        </button>
        <button className="sheet-button" onClick={onImage}>
          <Icon name="image" />
          <span>صورة</span>
        </button>
        <button className="sheet-button" onClick={copy}>
          <Icon name="copy" />
          <span>نسخ</span>
        </button>
        <button className="sheet-button" onClick={share}>
          <Icon name="share" />
          <span>مشاركة</span>
        </button>
      </div>
    </div>
  )
}
