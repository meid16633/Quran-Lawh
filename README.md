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
- Tajweed colours (madd by length, ghunnah, qalqalah, idgham, silent letters) with a colour guide, checked against a
  second, independent rule set

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
- Plan a khatma by pages per day (e.g. 3 pages → 202 days) or by length, from any page; the app shows the
  finish date (Gregorian and Hijri), tracks today's portion as you read, and can re-plan mid-khatma
- A wird bookmark (علامة الورد), separate from the last page opened: it moves forward as you read and can be
  placed on any ayah; the home screen continues the wird, not the last lookup
- A daily reminder at a chosen time: a notification in the Android app, or a repeating calendar event on iPhone
- Streak of active days and a weekly chart of pages read and reviewed

**Study (التدبر والفهم)**
- Tafsir al-Muyassar and the meanings of unusual words for every ayah
- Similar verses (المتشابهات) with the differing words highlighted
- A reflection journal, ayah of the day, and ayahs shared as designed image cards

**Testing and motivation**
- «اختبر حفظك»: what comes next, which surah, and the missing word — wrong options are taken from similar
  verses, so the quiz trains exactly the places people confuse
- Badges and statistics (pages read, reviews, khatmas, longest streak, quiz accuracy)
- Daily reminder in the Android app

**Offline listening**
- Download surahs per reciter and listen without internet (EveryAyah allows CORS, so files are stored in
  Cache Storage and played from there)

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

Tajweed colours come from [quran-tajweed](https://github.com/cpfair/quran-tajweed) (CC BY 4.0), built from the
Dar al-Maarifah colour-coded mushaf. Its annotations point into the Tanzil text, so `scripts/build-tajweed.mjs` moves
them onto the King Fahd text letter by letter (an alignment of the base letters of both texts; 1 letter of 73,000
finds no match). The scholar-authored rule corpus of [quran-ws/quran-tajweed](https://github.com/quran-ws/quran-tajweed)
(CC BY 4.0) runs directly on our text and fills the few ghunnah and muttasil rulings the first set misses;
`scripts/check-tajweed.mjs` compares the two colour by colour (agreement: ghunnah 99.5%, qalqalah 100%,
necessary madd 98.6%, muttasil 99.8%, idgham without ghunnah 95.5%; the differences reviewed are encoding gaps in
the second set, such as the open tanween and the hamza written under a yeh).

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests
npm run build      # production build in dist/
npm run data       # regenerate public/data/quran.json from the pinned source packages
npm run tajweed -- <quran-tajweed> <quran-ws>   # regenerate public/data/tajweed.json (see the script header)
npm run icons      # regenerate icons from public/favicon.svg (needs Playwright)
```

Built with React, TypeScript, Vite and `vite-plugin-pwa`. The Android app wraps the same build with
[Capacitor](https://capacitorjs.com): `npm run android:sync`, then open `android/` in Android Studio or run
`./gradlew assembleRelease` inside it.

### Android signing

The app's signing key is in the repository, encrypted: `android/signing/lawh.p12.enc` (PKCS#12, alias `lawh`,
AES-256 with PBKDF2, 600,000 iterations, under a random 32-character password). CI decrypts it with the repository
secret `ANDROID_SIGNING_PASSWORD`, which is also the keystore and key password, so every build is signed with the same
key and installs over the previous one. Keep a copy of that password: without it the key cannot be recovered, and a
new key means every user has to uninstall once.

A keystore of your own can be used instead through `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`. With no secret at all, CI falls back to a temporary debug key.

## License

The app's source code is released under the [MIT License](LICENSE).
Third-party content keeps its own terms: the Quran text, tafsir and font are © King Fahd Glorious Qur'an
Printing Complex; quran-meta is MIT; tafsir_api is MIT; the tajweed annotations (cpfair/quran-tajweed and
quran-ws/quran-tajweed) are CC BY 4.0.
