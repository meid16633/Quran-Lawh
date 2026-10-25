import { Icon } from '../components/Icon'
import { useQuran } from '../lib/context'
import { arabicDigits } from '../lib/quran'
import { back } from '../lib/router'
import { settings, useStore, type Theme } from '../lib/store'

const THEMES: [Theme, string][] = [
  ['auto', 'تلقائي'],
  ['light', 'فاتح'],
  ['sepia', 'ورقي'],
  ['dark', 'ليلي'],
]

export function SettingsScreen() {
  const q = useQuran()
  const s = useStore(settings)

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
