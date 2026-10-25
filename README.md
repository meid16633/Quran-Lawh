# لَوْح – احفظ وراجع

**Lawh** is a free, ad-free Quran app for reading, memorization and review. It works fully offline, collects no data, and runs on:

- **iPhone** – as an installable web app (open the site in Safari → Share → *Add to Home Screen*)
- **Android** – as an APK you install directly
- any desktop browser

## Features (phase 1)

- The Madinah mushaf text in Uthmani script with the King Fahd Complex Hafs font
- Navigation by the 604 Madinah mushaf pages, with surah openings, basmala, juz and hizb-quarter
- Swipe between pages (swipe right for the next page, like a printed mushaf)
- Surah and juz index, "go to page", and continue from where you stopped
- Search without diacritics, in modern spelling (الصلاة finds ٱلصَّلَوٰة), by surah name, or by reference (`2:255`, `البقرة ٢٥٥`)
- Tap an ayah to bookmark, copy or share it
- Light, paper and night themes, adjustable Quran font size
- Works offline after the first visit

## Get the app

| Platform | How |
|---|---|
| iPhone | Open https://meid16633.github.io/Quran-Lawh in **Safari**, tap Share, then **Add to Home Screen** |
| Android | Download [`lawh.apk`](https://github.com/meid16633/Quran-Lawh/releases/download/android-latest/lawh.apk) and open it (allow installing from your browser when asked) |

Both are built automatically from `main` by GitHub Actions.

## Text source and accuracy

The verse text is the Uthmani text of the **King Fahd Glorious Qur'an Printing Complex**, as published by
[The Noble Qur'an Encyclopedia](https://quranenc.com) and packaged by
[quran-json](https://github.com/risan/quran-json) (CC BY-SA 4.0). It is copied byte-for-byte by
`scripts/build-data.mjs` and never edited.

Before release, every one of the 6236 verses was compared automatically, letter by letter, with the independent
[Tanzil](https://tanzil.net) Uthmani text. All verses match, apart from known differences in how the two sources
encode hamza and join a few words (for example بَعۡدَمَا / بَعۡدَ مَا).
A unit test pins a SHA-256 checksum of the text so any accidental change fails CI.

Page, juz and hizb boundaries come from [quran-meta](https://github.com/quran-center/quran-meta) (MIT).
The Quran font is *KFGQPC Uthmanic Script HAFS* © King Fahd Glorious Qur'an Printing Complex.

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
Third-party content keeps its own terms: the Quran text data in `public/data/quran.json` is from quran-json
(CC BY-SA 4.0), and the Quran font in `src/assets/fonts/` is © King Fahd Glorious Qur'an Printing Complex.
