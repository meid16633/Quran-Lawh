# لَوْح – احفظ وراجع

**Lawh** is a free, ad-free Quran app for reading, memorization and review. It works fully offline, collects no data, and runs on:

- **iPhone** – as an installable web app (open the site in Safari → Share → *Add to Home Screen*)
- **Android** – as an APK you install directly
- any desktop browser

## Features

**Reading**
- The Madinah mushaf text in Uthmani script with the King Fahd Complex Hafs font
- Navigation by the 604 Madinah mushaf pages, with surah openings, basmala, juz and hizb-quarter
- Swipe between pages (swipe right for the next page, like a printed mushaf)
- Surah and juz index, "go to page", and continue from where you stopped
- Search without diacritics, in modern spelling (الصلاة finds ٱلصَّلَوٰة), by surah name, or by reference (`2:255`, `البقرة ٢٥٥`)
- Tap an ayah to listen from it, bookmark, copy or share it
- Light, paper and night themes, adjustable Quran font size; works offline

**Listening** (12 reciters from [EveryAyah](https://everyayah.com), including Al-Husary's teaching recitation)
- Follow-along: the recited ayah is highlighted and pages turn by themselves
- Repeat each ayah and/or the whole passage (1–10 times or forever), stop at the end of the page, surah or juz
- A pause after every ayah to repeat it yourself, and playback speed
- Lock-screen controls through the Media Session API

**Memorization (الحفظ)**
- Memorization mode in the mushaf: hide the words, or show only the start of each word, keeping the page layout
- Reveal word by word or ayah by ayah, or tap a word to peek at it
- Mistake pen: tap the words you get wrong while reciting; they are remembered and tinted in the mushaf
- Mark pages as memorized (or add whole surahs, juz or page ranges)
- Daily review with spaced repetition: each memorized page comes back just before you would forget it,
  and you grade how the review went (forgot / hard / good / easy)
- A map of all 604 pages coloured by how firmly each one is memorized, and a list of your most frequent mistakes

**Daily wird and khatma (الورد)**
- Plan a khatma over 7–60 days; today's portion is computed automatically and tracked as you read
- Streak of active days and a weekly chart of pages read and reviewed

**Your data**
- Everything stays on the device; no account, no tracking
- Backup and restore as a file (or copied text) to move to another phone

## Get the app

| Platform | How |
|---|---|
| iPhone | Open https://meid16633.github.io/Quran-Lawh in **Safari**, tap Share, then **Add to Home Screen** |
| Android | Download [`lawh.apk`](https://github.com/meid16633/Quran-Lawh/releases/download/android-latest/lawh.apk) and open it (allow installing from your browser when asked) |

Both are built automatically from `main` by GitHub Actions.

## Text source and accuracy

The verse text and the Quran font are the official **King Fahd Glorious Qur'an Printing Complex** release,
*Uthmanic Hafs* version 18 ([qurancomplex.gov.sa](https://qurancomplex.gov.sa/en/techquran/dev/)), as mirrored in
[quran-data-kfgqpc](https://github.com/thetruetruth/quran-data-kfgqpc). `scripts/build-data.mjs` copies it as
published (only the trailing ayah number is removed) and fails the build if any ayah's letters differ from a
second, independent copy of the King Fahd text ([quran-json](https://github.com/risan/quran-json), via
quranenc.com). Page and juz numbers of the Madinah mushaf come from the same release.

The text was also compared, letter by letter, with the independent [Tanzil](https://tanzil.net) Uthmani text:
all 6236 verses match apart from known differences in hamza spelling and in how a few words are joined
(for example بَعۡدَمَا / بَعۡدَ مَا). A unit test pins a SHA-256 checksum of the text so any accidental change
fails CI.

Tafsir al-Muyassar and *al-Muyassar fi Gharib al-Qur'an* (word meanings) are from the King Fahd Complex, via
Tarteel's Quranic Universal Library as packaged in [tafsir_api](https://github.com/spa5k/tafsir_api)
(`scripts/build-tafsir.mjs`). Similar verses (المتشابهات) are computed from the text by
`scripts/build-similar.mjs`. Hizb quarters and sajdas come from [quran-meta](https://github.com/quran-center/quran-meta) (MIT).

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests
npm run build      # production build in dist/
npm run data       # regenerate public/data/quran.json from the pinned source packages
npm run icons      # regenerate icons from public/favicon.svg (needs Playwright)
```

Built with React, TypeScript, Vite and `vite-plugin-pwa`. The Android app wraps the same build with
[Capacitor](https://capacitorjs.com): `npm run android:sync`, then open `android/` in Android Studio or run
`./gradlew assembleRelease` inside it.

### Android signing

CI signs the APK with the keystore in these repository secrets, if present:
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
Without them it falls back to a temporary debug key, which is fine for testing but means each new build has to be
installed after uninstalling the previous one.

## License

The app's source code is released under the [MIT License](LICENSE).
Third-party content keeps its own terms: the Quran text, tafsir and font are © King Fahd Glorious Qur'an
Printing Complex; quran-meta is MIT; tafsir_api is MIT.
