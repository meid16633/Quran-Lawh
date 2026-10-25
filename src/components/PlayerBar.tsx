import { useState } from 'react'
import { useQuran } from '../lib/context'
import { player, playerSettings, playerState } from '../lib/player'
import { arabicDigits } from '../lib/quran'
import { reciterById } from '../lib/reciters'
import { useStore } from '../lib/store'
import { Icon } from './Icon'
import { PlayerSheet } from './PlayerSheet'

export function PlayerBar() {
  const q = useQuran()
  const state = useStore(playerState)
  const settings = useStore(playerSettings)
  const [open, setOpen] = useState(false)
  if (state.status === 'idle' || !state.pos) return open ? <PlayerSheet onClose={() => setOpen(false)} /> : null

  const { pos } = state
  const surah = q.surahs[q.surahOf(pos.i)]
  const repeat =
    settings.ayahRepeat !== 1 ? ` • تكرار ${settings.ayahRepeat === 0 ? '∞' : `${arabicDigits(pos.ayahPass)}/${arabicDigits(settings.ayahRepeat)}`}` : ''
  const label =
    state.status === 'error'
      ? 'تعذّر تحميل التلاوة – تأكد من الإنترنت'
      : state.status === 'waiting'
        ? 'دورك… ردّد الآية'
        : `${reciterById(settings.reciter).name}${repeat}`
  const playing = state.status === 'playing' || state.status === 'loading' || state.status === 'waiting'

  return (
    <>
      <div className="player-bar" onClick={(e) => e.stopPropagation()}>
        <button className="icon-button play-button" aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل'} onClick={() => player.toggle()}>
          <Icon name={playing ? 'pause' : 'play'} />
        </button>
        <div className="player-info">
          <span className="player-title">
            {pos.basmala ? 'البسملة' : `${surah.name} • آية ${arabicDigits(q.ayahNo(pos.i))}`}
            {state.status === 'loading' && <span className="dot-loader" aria-hidden="true" />}
          </span>
          <span className={'player-sub' + (state.status === 'error' ? ' error' : '')}>{label}</span>
        </div>
        <button className="icon-button" aria-label="الآية السابقة" onClick={() => player.skip(-1)}>
          <Icon name="skipRight" />
        </button>
        <button className="icon-button" aria-label="الآية التالية" onClick={() => player.skip(1)}>
          <Icon name="skipLeft" />
        </button>
        <button className="icon-button" aria-label="إعدادات التلاوة" onClick={() => setOpen(true)}>
          <Icon name="tune" />
        </button>
        <button className="icon-button" aria-label="إيقاف" onClick={() => player.stop()}>
          <Icon name="close" />
        </button>
      </div>
      {open && <PlayerSheet onClose={() => setOpen(false)} />}
    </>
  )
}
