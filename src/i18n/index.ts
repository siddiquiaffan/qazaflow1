import { getLocales } from 'expo-localization';
import { useMemo } from 'react';
import { I18nManager } from 'react-native';
import { create } from 'zustand';

import type { Prayer } from '@/domain/prayers';
import { getSetting, setSetting, SETTING_KEYS } from '@/services/settings';

import { ar } from './catalogs/ar';
import { en, type Catalog, type Key } from './catalogs/en';
import { hi } from './catalogs/hi';
import { ur } from './catalogs/ur';
import {
  formatClock,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  isPref,
  isRtl,
  localizeDigits,
  renderEntry,
  resolveLanguage,
  type Lang,
  type Params,
  type Pref,
} from './core';

export * from './core';
export type { Key } from './catalogs/en';

const CATALOGS: Record<Lang, Catalog> = { en, hi, ur, ar };

/* ───────────── Translator ───────────── */

export function makeTranslator(lang: Lang) {
  const t = (key: Key, params?: Params): string => renderEntry(CATALOGS[lang][key] ?? en[key], lang, params);
  return {
    lang,
    rtl: isRtl(lang),
    t,
    /** Localized integer (or decimal with `digits` places). */
    n: (value: number, digits = 0) => formatNumber(value, lang, digits),
    /** Digits inside free text, e.g. text the user typed. */
    digits: (s: string) => localizeDigits(s, lang),
    percent: (fraction: number) => formatPercent(fraction, lang),
    clock: (hour: number, minute: number) => formatClock(hour, minute, lang),
    date: (d: Date, opts: Intl.DateTimeFormatOptions) => formatDate(d, lang, opts),
    dateTime: (d: Date, opts: Intl.DateTimeFormatOptions) => formatDateTime(d, lang, opts),
    prayer: (p: string) => (p in PRAYER_KEYS ? t(PRAYER_KEYS[p as Prayer]) : p),
    prayers: (count: number) => t('count.prayers', { count }),
    /** "Today", "Yesterday", or a short date. */
    friendlyDay: (date: Date, now: Date = new Date()) => {
      const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const diff = Math.round((start(now) - start(date)) / 86_400_000);
      if (diff === 0) return t('common.today');
      if (diff === 1) return t('common.yesterday');
      return formatDate(date, lang, { weekday: 'short', day: 'numeric', month: 'short' });
    },
  };
}

export type Translator = ReturnType<typeof makeTranslator>;

const PRAYER_KEYS: Record<Prayer, Key> = {
  fajr: 'prayer.fajr',
  zuhr: 'prayer.zuhr',
  asr: 'prayer.asr',
  maghrib: 'prayer.maghrib',
  isha: 'prayer.isha',
  witr: 'prayer.witr',
};

const translators = new Map<Lang, Translator>();
function translatorFor(lang: Lang): Translator {
  let tr = translators.get(lang);
  if (!tr) {
    tr = makeTranslator(lang);
    translators.set(lang, tr);
  }
  return tr;
}

/* ───────────── Runtime state ───────────── */

function deviceCodes(): (string | null)[] {
  try {
    return getLocales().map((l) => l.languageCode);
  } catch {
    return [];
  }
}

function readPref(): Pref {
  try {
    const v = getSetting(SETTING_KEYS.language);
    return isPref(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Ask React Native for the layout direction of `lang`. Returns true if it differs from what is on screen now. */
function applyDirection(lang: Lang): boolean {
  I18nManager.allowRTL(true);
  const rtl = isRtl(lang);
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.forceRTL(rtl);
  return true;
}

interface I18nState {
  pref: Pref;
  lang: Lang;
  /** Save a language choice. Returns true when the layout direction changed and the app must restart. */
  setPref: (pref: Pref) => boolean;
}

const initialPref = readPref();
const initialLang = resolveLanguage(initialPref, deviceCodes());
// Direction is read by React Native at launch, so set it before anything renders.
applyDirection(initialLang);

export const useI18n = create<I18nState>((set) => ({
  pref: initialPref,
  lang: initialLang,
  setPref: (pref) => {
    setSetting(SETTING_KEYS.language, pref);
    const lang = resolveLanguage(pref, deviceCodes());
    set({ pref, lang });
    return applyDirection(lang);
  },
}));

/** Hook for components: re-renders when the language changes. */
export function useT(): Translator {
  const lang = useI18n((s) => s.lang);
  return useMemo(() => translatorFor(lang), [lang]);
}

/** Non-hook access for services (notifications, errors). */
export function tr(): Translator {
  return translatorFor(useI18n.getState().lang);
}

/* ───────────── Fonts ───────────── */

export const URDU_FONT = { regular: 'NotoNastaliqUrdu_400Regular', bold: 'NotoNastaliqUrdu_700Bold' } as const;

/** Nastaliq needs generous vertical room or its tall strokes are clipped. */
export const URDU_LINE_HEIGHT = 1.95;
