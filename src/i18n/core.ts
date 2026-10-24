/** Pure i18n logic (no React, no native modules) so it can be unit tested. */

export const LANGS = ['en', 'hi', 'ur', 'ar'] as const;
export type Lang = (typeof LANGS)[number];
export type Pref = 'system' | Lang;

export const DEFAULT_LANG: Lang = 'en';

/** Name of each language written in that language, for the picker. */
export const NATIVE_NAMES: Record<Lang, string> = {
  en: 'English',
  hi: 'हिन्दी',
  ur: 'اردو',
  ar: 'العربية',
};

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
export type Entry = string | PluralForms;
export type Params = Record<string, string | number>;

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v);
export const isPref = (v: unknown): v is Pref => v === 'system' || isLang(v);
export const isRtl = (lang: Lang): boolean => lang === 'ur' || lang === 'ar';

/** BCP-47 tags handed to Intl for dates; Gregorian calendar is forced so Arabic locales never switch to Hijri. */
const INTL_TAG: Record<Lang, string> = {
  en: 'en-US',
  hi: 'hi-IN-u-ca-gregory',
  ur: 'ur-PK-u-ca-gregory',
  ar: 'ar-u-ca-gregory',
};
export const intlTag = (lang: Lang): string => INTL_TAG[lang];

/**
 * Pick the app language: an explicit choice wins, otherwise the first phone language we support,
 * otherwise English. `deviceCodes` are language codes in the phone's preference order ("ur", "ar", "en"…).
 */
export function resolveLanguage(pref: Pref, deviceCodes: readonly (string | null | undefined)[]): Lang {
  if (pref !== 'system') return pref;
  for (const code of deviceCodes) {
    const base = code?.toLowerCase().split(/[-_]/)[0];
    if (isLang(base)) return base;
  }
  return DEFAULT_LANG;
}

/* ───────────── Digits ───────────── */

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹';

/** Urdu and Arabic show ٣ ٤ ٥; English and Hindi keep 3 4 5. */
export const usesArabicDigits = (lang: Lang): boolean => lang === 'ur' || lang === 'ar';

/** Convert any Arabic-Indic or Persian/Urdu digits in `s` to 0-9 (for parsing what someone typed). */
export function toAsciiDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (ch) => {
    const a = ARABIC_INDIC.indexOf(ch);
    return String(a >= 0 ? a : EXTENDED_ARABIC_INDIC.indexOf(ch));
  });
}

/** Show 0-9 in `s` as ٠-٩ when the language calls for it. Also normalises digits already in another script. */
export function localizeDigits(s: string, lang: Lang): string {
  const ascii = toAsciiDigits(s);
  return usesArabicDigits(lang) ? ascii.replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)]) : ascii;
}

/** 1234567 → "1,234,567" / "١٬٢٣٤٬٥٦٧". */
export function formatNumber(n: number, lang: Lang, maxFractionDigits = 0): string {
  const fixed = Math.abs(n).toFixed(maxFractionDigits);
  const [int, frac] = fixed.split('.');
  const sep = usesArabicDigits(lang) ? '٬' : ',';
  const dec = usesArabicDigits(lang) ? '٫' : '.';
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  const body = frac ? `${grouped}${dec}${frac}` : grouped;
  return localizeDigits(`${n < 0 && Number(fixed) !== 0 ? '-' : ''}${body}`, lang);
}

/** Percent with the right sign for the script ("45%" / "٤٥٪"). */
export function formatPercent(fraction: number, lang: Lang): string {
  const n = formatNumber(Math.round(fraction * 100), lang);
  return usesArabicDigits(lang) ? `${n}٪` : `${n}%`;
}

/* ───────────── Plurals ───────────── */

const rulesCache = new Map<Lang, Intl.PluralRules | null>();

/** CLDR plural category for `n`. Falls back to English rules if Intl.PluralRules is unavailable. */
export function pluralCategory(lang: Lang, n: number): Intl.LDMLPluralRule {
  let rules = rulesCache.get(lang);
  if (rules === undefined) {
    try {
      rules = new Intl.PluralRules(lang);
    } catch {
      rules = null;
    }
    rulesCache.set(lang, rules);
  }
  if (rules) return rules.select(n);
  return n === 1 ? 'one' : 'other';
}

/* ───────────── Translating ───────────── */

function interpolate(text: string, params: Params | undefined, lang: Lang): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const v = params[name];
    if (v === undefined) return whole;
    return typeof v === 'number' ? formatNumber(v, lang, Number.isInteger(v) ? 0 : 1) : v;
  });
}

/** Resolve one catalog entry: choose the plural form from `params.count`, then fill in `{placeholders}`. */
export function renderEntry(entry: Entry, lang: Lang, params?: Params): string {
  if (typeof entry === 'string') return interpolate(entry, params, lang);
  const count = params?.count;
  const form = typeof count === 'number' ? (entry[pluralCategory(lang, count)] ?? entry.other) : entry.other;
  return interpolate(form, params, lang);
}

/* ───────────── Dates and times ───────────── */

export function formatDate(d: Date, lang: Lang, opts: Intl.DateTimeFormatOptions): string {
  return localizeDigits(d.toLocaleDateString(intlTag(lang), opts), lang);
}

export function formatDateTime(d: Date, lang: Lang, opts: Intl.DateTimeFormatOptions): string {
  return localizeDigits(d.toLocaleString(intlTag(lang), opts), lang);
}

/** Day parts people actually say in Hindi and Urdu ("शाम 8:05", "شام 8:05"). */
function dayPart(hour: number): 'night' | 'morning' | 'noon' | 'evening' {
  if (hour < 4) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 16) return 'noon';
  if (hour < 20) return 'evening';
  return 'night';
}

const DAY_PART_WORDS: Record<'hi' | 'ur', Record<ReturnType<typeof dayPart>, string>> = {
  hi: { night: 'रात', morning: 'सुबह', noon: 'दोपहर', evening: 'शाम' },
  ur: { night: 'رات', morning: 'صبح', noon: 'دوپہر', evening: 'شام' },
};

/** 12-hour clock text such as "8:05 PM", "शाम 8:05", "شام ٨:٠٥", "٨:٠٥ م". */
export function formatClock(hour: number, minute: number, lang: Lang): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const time = `${h12}:${String(minute).padStart(2, '0')}`;
  switch (lang) {
    case 'en':
      return `${time} ${hour >= 12 ? 'PM' : 'AM'}`;
    case 'ar':
      return localizeDigits(`${time} ${hour >= 12 ? 'م' : 'ص'}`, lang);
    default:
      return localizeDigits(`${DAY_PART_WORDS[lang][dayPart(hour)]} ${time}`, lang);
  }
}
