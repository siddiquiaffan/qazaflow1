// Writes docs/translations-review.csv: one row per string, one column per language, for native-speaker review.
// Run: node --experimental-strip-types scripts/export-translations.mts
import { writeFileSync } from 'node:fs';

import { ar } from '../src/i18n/catalogs/ar.ts';
import { en } from '../src/i18n/catalogs/en.ts';
import { hi } from '../src/i18n/catalogs/hi.ts';
import { ur } from '../src/i18n/catalogs/ur.ts';

const text = (e: unknown) =>
  typeof e === 'string'
    ? e
    : Object.entries(e as Record<string, string>)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');
const q = (s: string) => `"${s.replaceAll('"', '""')}"`;

const rows = [['key', 'English', 'हिन्दी', 'اردو', 'العربية'].map(q).join(',')];
for (const key of Object.keys(en) as (keyof typeof en)[]) {
  rows.push([key, text(en[key]), text(hi[key]), text(ur[key]), text(ar[key])].map(q).join(','));
}
writeFileSync(new URL('../docs/translations-review.csv', import.meta.url), `﻿${rows.join('\n')}\n`);
console.log(`${rows.length - 1} strings`);
