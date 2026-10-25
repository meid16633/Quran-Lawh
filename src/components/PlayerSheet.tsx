import { type PlayerSettings, type Until, player, playerSettings } from '../lib/player'
import { RECITERS } from '../lib/reciters'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { Choice, Sheet } from './Sheet'

export function PlayerSheet({ onClose }: { onClose: () => void }) {
  const s = useStore(playerSettings)
  const set = (patch: Partial<PlayerSettings>) => {
    playerSettings.set((prev) => ({ ...prev, ...patch }))
    player.refreshSettings()
  }

  return (
    <Sheet title="إعدادات التلاوة" onClose={onClose}>
      <div className="field">
        <div className="field-label">القارئ</div>
        <div className="reciter-list">
          {RECITERS.map((r) => (
            <button
              key={r.id}
              className="reciter"
              aria-pressed={s.reciter === r.id}
              onClick={() => set({ reciter: r.id })}
            >
              <span>{r.name}</span>
              {r.note && <small>{r.note}</small>}
            </button>
          ))}
        </div>
      </div>
      <Choice<Until>
        label="التشغيل حتى"
        value={s.until}
        options={[
          ['page', 'نهاية الصفحة'],
          ['surah', 'نهاية السورة'],
          ['juz', 'نهاية الجزء'],
          ['end', 'متواصل'],
        ]}
        onChange={(until) => set({ until })}
      />
      <Choice
        label="تكرار كل آية"
        value={s.ayahRepeat}
        options={[
          [1, '١'],
          [2, '٢'],
          [3, '٣'],
          [5, '٥'],
          [10, '١٠'],
          [0, '∞'],
        ]}
        onChange={(ayahRepeat) => set({ ayahRepeat })}
      />
      <Choice
        label="تكرار المقطع كله"
        value={s.rangeRepeat}
        options={[
          [1, '١'],
          [2, '٢'],
          [3, '٣'],
          [5, '٥'],
          [0, '∞'],
        ]}
        onChange={(rangeRepeat) => set({ rangeRepeat })}
      />
      <Choice
        label="مهلة بعد كل آية لتردّدها"
        value={s.gap}
        options={[
          [0, 'بدون'],
          [3, '٣ ث'],
          [5, '٥ ث'],
          [10, '١٠ ث'],
          [20, '٢٠ ث'],
        ]}
        onChange={(gap) => set({ gap })}
      />
      <Choice
        label="السرعة"
        value={s.speed}
        options={[
          [0.75, '٠٫٧٥×'],
          [1, '١×'],
          [1.25, '١٫٢٥×'],
          [1.5, '١٫٥×'],
        ]}
        onChange={(speed) => set({ speed })}
      />
      <label className="toggle-row">
        <input type="checkbox" checked={s.follow} onChange={(e) => set({ follow: e.target.checked })} />
        <span>تتبّع التلاوة: تلوين الآية وتقليب الصفحات تلقائيًا</span>
      </label>
      <button
        className="button secondary"
        onClick={() => {
          onClose()
          navigate('downloads')
        }}
      >
        تحميل السور للاستماع بدون إنترنت
      </button>
      <p className="muted">التلاوات من موقع EveryAyah، وتعمل بدون إنترنت بعد تحميلها.</p>
    </Sheet>
  )
}
