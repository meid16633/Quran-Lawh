import type { IconName } from '../components/Icon'

/** Everything the badges are computed from. */
export interface Progress {
  pagesRead: number
  reviews: number
  bestStreak: number
  khatmas: number
  memorizedPages: number
  juzAmmaPages: number
  notes: number
  quizzes: number
  perfectQuizzes: number
}

export interface Badge {
  id: string
  title: string
  description: string
  icon: IconName
  target: number
  value: (p: Progress) => number
}

export const BADGES: Badge[] = [
  { id: 'first-page', title: 'البداية', description: 'اقرأ أول صفحة', icon: 'book', target: 1, value: (p) => p.pagesRead },
  { id: 'pages-100', title: 'قارئ مثابر', description: 'اقرأ ١٠٠ صفحة', icon: 'book', target: 100, value: (p) => p.pagesRead },
  { id: 'khatma-1', title: 'الختمة الأولى', description: 'أتمّ ختمة كاملة', icon: 'star', target: 1, value: (p) => p.khatmas },
  { id: 'streak-7', title: 'أسبوع متواصل', description: '٧ أيام متتالية من القراءة أو المراجعة', icon: 'flame', target: 7, value: (p) => p.bestStreak },
  { id: 'streak-30', title: 'شهر متواصل', description: '٣٠ يومًا متتاليًا', icon: 'flame', target: 30, value: (p) => p.bestStreak },
  { id: 'juz-amma', title: 'حافظ جزء عمّ', description: 'سجّل صفحات جزء عمّ كلها محفوظة', icon: 'cap', target: 23, value: (p) => p.juzAmmaPages },
  { id: 'memo-100', title: 'مئة صفحة', description: 'احفظ ١٠٠ صفحة (نحو خمسة أجزاء)', icon: 'cap', target: 100, value: (p) => p.memorizedPages },
  { id: 'memo-half', title: 'نصف القرآن', description: 'احفظ ٣٠٢ صفحة', icon: 'cap', target: 302, value: (p) => p.memorizedPages },
  { id: 'memo-all', title: 'حامل القرآن', description: 'احفظ المصحف كاملًا', icon: 'trophy', target: 604, value: (p) => p.memorizedPages },
  { id: 'reviews-50', title: 'متعاهد', description: 'أتمّ ٥٠ مراجعة', icon: 'refresh', target: 50, value: (p) => p.reviews },
  { id: 'quiz-10', title: 'مختبِر', description: 'أجرِ ١٠ اختبارات', icon: 'check', target: 10, value: (p) => p.quizzes },
  { id: 'quiz-perfect', title: 'متقن', description: 'اختبار من ١٠ أسئلة أو أكثر بلا خطأ', icon: 'trophy', target: 1, value: (p) => p.perfectQuizzes },
  { id: 'notes-10', title: 'متدبّر', description: 'اكتب ١٠ تدبّرات', icon: 'pen', target: 10, value: (p) => p.notes },
]

export function earned(p: Progress): string[] {
  return BADGES.filter((b) => b.value(p) >= b.target).map((b) => b.id)
}

/** Longest run of consecutive day numbers. */
export function bestStreak(days: number[]): number {
  const set = new Set(days)
  let best = 0
  for (const d of set) {
    if (set.has(d - 1)) continue
    let n = 1
    while (set.has(d + n)) n++
    best = Math.max(best, n)
  }
  return best
}
