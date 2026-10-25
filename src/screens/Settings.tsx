import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { PeriodicControls } from '../components/PeriodicControls'
import { ReminderControls } from '../components/ReminderControls'
import { TajweedGuide } from '../components/TajweedGuide'
import { backupFileName, exportBackup, importBackup } from '../lib/backup'
import { useQuran } from '../lib/context'
import { mistakes } from '../lib/hifz'
import { arabicDigits } from '../lib/quran'
import { deleteAllTakes, recordingsUsage } from '../lib/recorder'
import { back, navigate } from '../lib/router'
import { readerPrefs, settings, useStore, type Theme } from '../lib/store'
import { widgetAvailable } from '../lib/widget'

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

        <TajweedSection />

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
          <ClearRecordings />
        </section>

        <ReminderSection />

        <section className="card settings-section">
          <h2>آية وذكر على شاشة القفل</h2>
          <PeriodicControls />
        </section>

        {widgetAvailable() && (
          <section className="card settings-section">
            <h2>ويدجت الشاشة الرئيسية</h2>
            <p className="muted">
              اضغط مطولًا على مكان فارغ في الشاشة الرئيسية، واختر «الأدوات» أو «Widgets»، ثم «لوح»: يظهر وردك اليوم وكم
              بقي منه، وآية اليوم. الضغط على الورد يفتحه من علامة الورد، والضغط على الآية يفتحها في المصحف.
            </p>
          </section>
        )}

        <section className="card settings-section">
          <h2>التلاوات</h2>
          <button className="button secondary" onClick={() => navigate('downloads')}>
            <Icon name="download" size={18} /> تحميل السور للاستماع بدون إنترنت
          </button>
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
            نص المصحف بالرسم العثماني من الإصدار الرسمي لمجمع الملك فهد لطباعة المصحف الشريف (المصحف الإلكتروني
            لرواية حفص، الإصدار ١٨)، دون أي تعديل، وبخط حفص العثماني من المجمع. وقد طوبقت حروف كل آية آليًا مع نسخة
            أخرى من نص المجمع (موسوعة القرآن الكريم) ومع نص مشروع تنزيل، فتطابقت عدا فروق معروفة في رسم الهمزة وبعض
            الكلمات الموصولة.
          </p>
          <p>أرقام الصفحات والأجزاء على مصحف المدينة النبوية (٦٠٤ صفحات) من الإصدار نفسه.</p>
          <h3>التفسير ومعاني الكلمات</h3>
          <p>
            «التفسير الميسر» و«الميسر في غريب القرآن الكريم» من مجمع الملك فهد، عن المكتبة القرآنية الشاملة (QUL)
            لمنصة ترتيل. أما «المتشابهات» فتُحسب داخل التطبيق من نص المصحف نفسه.
          </p>
          <h3>الأحاديث والأذكار</h3>
          <p>
            ما يظهر على شاشة القفل نصوص قصيرة من صحيحي البخاري ومسلم فقط، طوبق كل نص منها آليًا كلمةً كلمة مع متن الكتاب
            المنسوب إليه، و«متفق عليه» لما وُجد فيهما معًا.
          </p>
          <h3>ألوان التجويد</h3>
          <p>
            أحكام التجويد من مشروع quran-tajweed (مبني على مصحف التجويد الملون من دار المعرفة)، منقولة حرفًا حرفًا إلى نص
            المجمع، ومراجَعة آليًا على مجموعة قواعد مستقلة من quran.ws مكتوبة من تحفة الأطفال والمقدمة الجزرية، وكلاهما
            برخصة CC BY 4.0.
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

function TajweedSection() {
  const prefs = useStore(readerPrefs)
  const [guide, setGuide] = useState(false)
  return (
    <section className="card settings-section">
      <h2>التجويد</h2>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={prefs.tajweed}
          onChange={(e) => readerPrefs.set((p) => ({ ...p, tajweed: e.target.checked, tajweedGuideSeen: true }))}
        />
        <span>تلوين أحكام التجويد في المصحف</span>
      </label>
      <button className="button secondary" onClick={() => setGuide(true)}>
        <Icon name="palette" size={18} /> دليل الألوان
      </button>
      {guide && <TajweedGuide onClose={() => setGuide(false)} />}
    </section>
  )
}

function ClearRecordings() {
  const [usage, setUsage] = useState<{ count: number; bytes: number } | null>(null)
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    recordingsUsage().then(setUsage, () => {})
  }, [])
  if (!usage?.count) return null
  const mb = arabicDigits(Math.max(0.1, usage.bytes / 1e6).toFixed(1)).replace('.', '٫')
  return confirm ? (
    <div className="button-row">
      <button
        className="button danger"
        onClick={() => deleteAllTakes().then(() => setUsage({ count: 0, bytes: 0 }), () => {})}
      >
        نعم، احذف التسجيلات
      </button>
      <button className="button ghost" onClick={() => setConfirm(false)}>
        تراجع
      </button>
    </div>
  ) : (
    <button className="text-button" onClick={() => setConfirm(true)}>
      <Icon name="trash" size={18} /> حذف تسجيلات «سمّع لنفسك» ({arabicDigits(usage.count)} تسجيل، {mb} م.ب)
    </button>
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

function ReminderSection() {
  return (
    <section className="card settings-section">
      <h2>التذكير اليومي</h2>
      <ReminderControls />
    </section>
  )
}
