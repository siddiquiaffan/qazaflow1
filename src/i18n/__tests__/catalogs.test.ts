import { ar } from '../catalogs/ar';
import { en } from '../catalogs/en';
import { hi } from '../catalogs/hi';
import { ur } from '../catalogs/ur';

const forms = (e: unknown): string[] => (typeof e === 'string' ? [e] : Object.values(e as Record<string, string>));
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
const catalogs = { hi, ur, ar } as const;

describe.each(Object.entries(catalogs))('%s catalog', (_name, cat) => {
  it('has exactly the English keys', () => {
    expect(Object.keys(cat).sort()).toEqual(Object.keys(en).sort());
  });

  it('uses the same placeholders as English in every plural form', () => {
    const problems: string[] = [];
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const wanted = new Set(forms(en[key]).flatMap(placeholders));
      for (const form of forms(cat[key])) {
        const got = new Set(placeholders(form));
        // A plural form may drop {count} when the number is spelled out ("one prayer").
        for (const p of got) if (!wanted.has(p)) problems.push(`${key}: unexpected {${p}}`);
        for (const p of wanted) if (!got.has(p) && p !== 'count') problems.push(`${key}: missing {${p}}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('has no empty strings and an "other" form on every plural', () => {
    for (const [key, entry] of Object.entries(cat)) {
      for (const form of forms(entry)) expect(form.trim()).not.toBe('');
      if (typeof entry !== 'string') expect((entry as Record<string, string>).other).toBeTruthy();
      expect(key).toBeTruthy();
    }
  });
});

it('never mentions a school of jurisprudence', () => {
  const all = [en, hi, ur, ar].flatMap((c) => Object.values(c).flatMap(forms)).join('\n');
  expect(all).not.toMatch(/hanafi|fiqh|حنفی|حنفي|हनफ़ी|हनफी|فقہ|فقه/i);
});
