import { useEffect, useState } from 'react'
import { useQuran } from '../lib/context'
import { notes, saveNote } from '../lib/notes'
import { arabicDigits } from '../lib/quran'
import { navigate } from '../lib/router'
import { type SimilarData, type TafsirData, loadSimilar, loadTafsir, parseGharib, sharedWords } from '../lib/study'
import { useStore } from '../lib/store'
import { words } from '../lib/words'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

export type StudyTab = 'tafsir' | 'words' | 'similar' | 'note'

/** Tafsir, word meanings, similar ayahs and a personal note for one ayah, with prev/next. */
export function AyahStudy({ index, tab: initialTab, onClose }: { index: number; tab: StudyTab; onClose: () => void }) {
  const q = useQuran()
  const [i, setI] = useState(index)
  const [tab, setTab] = useState<StudyTab>(initialTab)
  const [data, setData] = useState<{ tafsir: TafsirData; similar: SimilarData } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    Promise.all([loadTafsir(), loadSimilar()]).then(
      ([tafsir, similar]) => setData({ tafsir, similar }),
      () => setFailed(true),
    )
  }, [])

  const surah = q.surahs[q.surahOf(i)]
  const similarCount = data?.similar[i]?.length ?? 0

  return (
    <Sheet title={`${surah.name} • آية ${arabicDigits(q.ayahNo(i))}`} onClose={onClose}>
      <div className="study-ayah">
        <button className="icon-button" aria-label="الآية السابقة" disabled={i === 0} onClick={() => setI(i - 1)}>
          <Icon name="chevronRight" />
        </button>
        <p className="quran-font">
          {q.text[i]} {arabicDigits(q.ayahNo(i))}
        </p>
        <button className="icon-button" aria-label="الآية التالية" disabled={i === q.text.length - 1} onClick={() => setI(i + 1)}>
          <Icon name="chevronLeft" />
        </button>
      </div>

      <div className="chips study-tabs" role="tablist">
        {(
          [
            ['tafsir', 'التفسير'],
            ['words', 'المعاني'],
            ['similar', similarCount ? `المتشابهات (${arabicDigits(similarCount)})` : 'المتشابهات'],
            ['note', 'تدبّري'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className="chip" onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'note' ? (
        <NoteEditor key={i} ayah={i} />
      ) : failed ? (
        <p className="muted">تعذّر تحميل البيانات. أعد فتح التطبيق وهو متصل بالإنترنت مرة واحدة.</p>
      ) : !data ? (
        <p className="muted">جارٍ التحميل…</p>
      ) : tab === 'tafsir' ? (
        <div className="study-text">
          {data.tafsir.muyassar[i].split(/\n+/).map((p, k) => (
            <p key={k}>{p}</p>
          ))}
          <p className="muted">التفسير الميسر – مجمع الملك فهد لطباعة المصحف الشريف</p>
        </div>
      ) : tab === 'words' ? (
        <WordMeanings text={data.tafsir.gharib[i]} />
      ) : (
        <SimilarList index={i} list={data.similar[i] ?? []} onGo={onClose} />
      )}
    </Sheet>
  )
}

function WordMeanings({ text }: { text: string }) {
  const meanings = parseGharib(text)
  if (!meanings.length) return <p className="muted">لا توجد في هذه الآية كلمات غريبة تحتاج إلى بيان.</p>
  return (
    <>
      <dl className="meanings">
        {meanings.map((m, k) => (
          <div key={k}>
            {m.words && <dt className="quran-font">{m.words}</dt>}
            <dd>{m.meaning}</dd>
          </div>
        ))}
      </dl>
      <p className="muted">الميسر في غريب القرآن الكريم</p>
    </>
  )
}

function SimilarList({ index, list, onGo }: { index: number; list: [number, number][]; onGo: () => void }) {
  const q = useQuran()
  if (!list.length) return <p className="muted">لا توجد آيات قريبة اللفظ من هذه الآية.</p>
  const base = words(q.text[index])
  return (
    <>
      <p className="muted">الكلمات الملوّنة هي مواضع الاختلاف عن هذه الآية، وهي التي يكثر الخطأ فيها عند الحفظ.</p>
      <ul className="similar-list">
        {list.map(([j, score]) => {
          const w = words(q.text[j])
          const shared = sharedWords(base, w)
          return (
            <li key={j}>
              <button
                className="similar-item"
                onClick={() => {
                  onGo()
                  navigate(`read/${q.pageOf(j)}?a=${j}`)
                }}
              >
                <span className="row-sub">
                  {q.surahs[q.surahOf(j)].name} • آية {arabicDigits(q.ayahNo(j))} • تشابه {arabicDigits(score)}٪
                </span>
                <span className="quran-font similar-text">
                  {w.map((x, k) => (
                    <span key={k} className={shared[k] ? undefined : 'diff'}>
                      {x}{' '}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function NoteEditor({ ayah }: { ayah: number }) {
  const all = useStore(notes)
  const [text, setText] = useState(all[ayah]?.text ?? '')
  const saved = (all[ayah]?.text ?? '') === text
  return (
    <div className="note-editor">
      <textarea
        className="note-text"
        placeholder="اكتب ما وقع في قلبك من هذه الآية: معنى، أو عبرة، أو دعاء، أو عمل تنوي أن تعمل به…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => saveNote(ayah, text)}
      />
      <div className="note-actions">
        <button className="button" disabled={saved} onClick={() => saveNote(ayah, text)}>
          {saved && text ? 'محفوظ ✓' : 'حفظ'}
        </button>
        {all[ayah] && (
          <span className="muted">آخر تعديل {new Date(all[ayah].at).toLocaleDateString('ar-EG')}</span>
        )}
      </div>
    </div>
  )
}
