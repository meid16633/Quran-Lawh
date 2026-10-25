import { useState } from 'react'
import { Icon } from '../components/Icon'
import { backupFileName, exportBackup, importBackup } from '../lib/backup'
import { useQuran } from '../lib/context'
import { mistakes } from '../lib/hifz'
import { arabicDigits } from '../lib/quran'
import { back } from '../lib/router'
import { readerPrefs, settings, useStore, type Theme } from '../lib/store'

const THEMES: [Theme, string][] = [
  ['auto', 'تلقائي'],
  ['light', 'فاتح'],
  ['sepia', 'ورقي'],
  ['dark', 'ليلي'],
]

export function SettingsScreen() {
  const q = useQuran()
  const s = useStore(settings)
  const prefs = useStore(readerPrefs)

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-button" aria-label="رجوع" onClick={back}>
          <Icon name="chevronRight" />
        </button>
        <h1 className="topbar-title">الإعدادات</h1>
      </header>
      <main className="content">
        <section className="card settings-section">
          <h2>المظهر</h2>
          <div className="segmented" role="radiogroup" aria-label="المظهر">
            {THEMES.map(([id, label]) => (
              <button
                key={id}
                role="radio"
                aria-checked={s.theme === id}
                onClick={() => settings.set((prev) => ({ ...prev, theme: id }))}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="card settings-section">
          <h2>حجم خط المصحف</h2>
          <div className="slider-row">
            <span className="slider-end small">ع</span>
            <input
              type="range"
              min={18}
              max={44}
              step={1}
              value={s.fontSize}
              onChange={(e) => settings.set((prev) => ({ ...prev, fontSize: Number(e.target.value) }))}
              aria-label="حجم الخط"
            />
            <span className="slider-end large">ع</span>
          </div>
          <p className="preview quran-font">
            {q.text[1]} {arabicDigits(2)}
          </p>
        </section>

        <section className="card settings-section">
          <h2>الحفظ</h2>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={prefs.showMistakes}
              onChange={(e) => readerPrefs.set((p) => ({ ...p, showMistakes: e.target.checked }))}
            />
            <span>تلوين الكلمات التي أخطأت فيها أثناء القراءة العادية</span>
          </label>
          <ClearMistakes />
        </section>

        <Backup />

        <section className="card settings-section about">
          <h2>عن التطبيق</h2>
          <p>
            <strong>لَوْح</strong> مصحف مجاني بالكامل، بدون إعلانات، ولا يجمع أي بيانات عنك. كل ما تحفظه من علامات
            وإعدادات يبقى على جهازك فقط.
          </p>
          <h3>مصدر النص</h3>
          <p>
            نص المصحف بالرسم العثماني من مجمع الملك فهد لطباعة المصحف الشريف، عن موسوعة القرآن الكريم
            (quranenc.com)، دون أي تعديل. وقد قورن آليًا بنص مشروع تنزيل (tanzil.net) فتطابقت حروف جميع الآيات، عدا فروق معروفة في طريقة رسم الهمزة وبعض الكلمات الموصولة.
          </p>
          <p>
            الخط: خط حفص العثماني من مجمع الملك فهد. أرقام الصفحات والأجزاء على مصحف المدينة المنورة (٦٠٤ صفحة).
          </p>
          <p className="muted" dir="ltr">
            {q.source.text}. {q.source.meta}.
          </p>
          <p className="muted">الإصدار {__APP_VERSION__}</p>
        </section>
      </main>
    </div>
  )
}

function ClearMistakes() {
  const all = useStore(mistakes)
  const [confirm, setConfirm] = useState(false)
  const n = Object.keys(all).length
  if (!n) return null
  return confirm ? (
    <div className="button-row">
      <button className="button danger" onClick={() => mistakes.set({})}>
        نعم، امسح كل الأخطاء
      </button>
      <button className="button ghost" onClick={() => setConfirm(false)}>
        تراجع
      </button>
    </div>
  ) : (
    <button className="text-button" onClick={() => setConfirm(true)}>
      <Icon name="trash" size={18} /> مسح كل الأخطاء المسجّلة ({arabicDigits(n)} كلمة)
    </button>
  )
}

function Backup() {
  const [text, setText] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const save = async () => {
    const json = exportBackup()
    const file = new File([json], backupFileName(), { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'نسخة احتياطية من لوح' })
        return
      }
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return
      // Sharing is not available here: fall back to a download.
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file)
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    setText(json)
    setMessage('حُفظ الملف. إن لم يظهر، انسخ النص أدناه واحتفظ به.')
  }

  const restore = (json: string) => {
    try {
      const n = importBackup(json)
      setMessage(`استُعيدت ${arabicDigits(n)} من البيانات، جارٍ إعادة التحميل…`)
      setTimeout(() => location.reload(), 900)
    } catch {
      setMessage('هذا ليس ملف نسخة احتياطية من لوح.')
    }
  }

  return (
    <section className="card settings-section">
      <h2>النسخ الاحتياطي</h2>
      <p className="muted">
        محفوظك وأخطاؤك وختمتك وعلاماتك محفوظة على هذا الجهاز فقط. احفظ نسخة احتياطية لتنقلها إلى جهاز آخر أو تستعيدها لاحقًا.
      </p>
      <div className="backup-actions">
        <button className="button" onClick={save}>
          حفظ نسخة احتياطية
        </button>
        <label className="button secondary">
          استعادة من ملف
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (f) restore(await f.text())
            }}
          />
        </label>
      </div>
      <textarea
        className="backup-text"
        placeholder="أو الصق نص النسخة الاحتياطية هنا"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {text && (
        <div className="backup-actions">
          <button className="button ghost" onClick={() => navigator.clipboard?.writeText(text)}>
            <Icon name="copy" size={18} /> نسخ النص
          </button>
          <button className="button ghost" onClick={() => restore(text)}>
            استعادة من النص
          </button>
        </div>
      )}
      {message && <p className="muted">{message}</p>}
    </section>
  )
}
