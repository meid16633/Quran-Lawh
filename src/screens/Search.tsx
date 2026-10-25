import { useDeferredValue, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { useQuran } from '../lib/context'
import { arabicDigits, type Quran } from '../lib/quran'
import { back, navigate } from '../lib/router'
import { SearchIndex } from '../lib/search'

let cached: { quran: Quran; index: SearchIndex } | null = null

function useSearchIndex(): SearchIndex {
  const q = useQuran()
  if (cached?.quran !== q) cached = { quran: q, index: new SearchIndex(q) }
  return cached.index
}

export function Search({ initialQuery }: { initialQuery: string }) {
  const q = useQuran()
  const index = useSearchIndex()
  const [query, setQuery] = useState(initialQuery)
  const deferred = useDeferredValue(query)

  const { ref, surahs, ayahs } = useMemo(
    () => ({ ref: index.reference(deferred), surahs: index.surahs(deferred), ayahs: index.ayahs(deferred) }),
    [index, deferred],
  )

  const open = (i: number) => {
    navigate(`search?q=${encodeURIComponent(query)}`, { replace: true })
    navigate(`read/${q.pageOf(i)}?a=${i}`)
  }

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-button" aria-label="رجوع" onClick={back}>
          <Icon name="chevronRight" />
        </button>
        <input
          className="input search-input"
          type="search"
          autoFocus
          placeholder="ابحث بكلمة، أو اسم سورة، أو ٢:٢٥٥"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="بحث"
        />
      </header>
      <main className="content">
        {ref !== null && (
          <button className="card" onClick={() => open(ref)}>
            <span className="card-label">انتقل إلى</span>
            <span className="card-title">
              {q.surahs[q.surahOf(ref)].name} • آية {arabicDigits(q.ayahNo(ref))}
            </span>
          </button>
        )}

        {surahs.length > 0 && (
          <ul className="list">
            {surahs.map((s) => (
              <li key={s}>
                <button className="row" onClick={() => navigate(`read/${q.pageOf(q.surahStarts[s])}`)}>
                  <span className="badge">{arabicDigits(s + 1)}</span>
                  <span className="row-main">
                    <span className="row-title quran-font">{q.surahs[s].name}</span>
                    <span className="row-sub">سورة • {arabicDigits(q.surahs[s].ayahs)} آية</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {deferred.trim().length >= 2 && (
          <p className="result-count">
            {ayahs.total === 0
              ? 'لا توجد نتائج'
              : ayahs.total > ayahs.results.length
                ? `${arabicDigits(ayahs.total)} نتيجة (يُعرض أول ${arabicDigits(ayahs.results.length)})`
                : `${arabicDigits(ayahs.total)} نتيجة`}
          </p>
        )}

        <ul className="list">
          {ayahs.results.map((i) => (
            <li key={i}>
              <button className="row result" onClick={() => open(i)}>
                <span className="row-main">
                  <span className="row-sub">
                    {q.surahs[q.surahOf(i)].name} • آية {arabicDigits(q.ayahNo(i))} • ص {arabicDigits(q.pageOf(i))}
                  </span>
                  <span className="quran-font result-text">{q.text[i]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
