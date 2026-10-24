import {
  formatClock,
  formatNumber,
  formatPercent,
  localizeDigits,
  pluralCategory,
  renderEntry,
  resolveLanguage,
  toAsciiDigits,
} from '../core';

describe('resolveLanguage', () => {
  it('uses an explicit choice over the phone language', () => {
    expect(resolveLanguage('ur', ['en'])).toBe('ur');
  });
  it('follows the first supported phone language', () => {
    expect(resolveLanguage('system', ['fr', 'ar-SA', 'en'])).toBe('ar');
    expect(resolveLanguage('system', ['hi-IN'])).toBe('hi');
    expect(resolveLanguage('system', ['UR_PK'])).toBe('ur');
  });
  it('falls back to English', () => {
    expect(resolveLanguage('system', ['fr', 'de'])).toBe('en');
    expect(resolveLanguage('system', [null, undefined])).toBe('en');
    expect(resolveLanguage('system', [])).toBe('en');
  });
});

describe('digits', () => {
  it('shows Arabic-Indic digits for Urdu and Arabic only', () => {
    expect(localizeDigits('345', 'ur')).toBe('٣٤٥');
    expect(localizeDigits('345', 'ar')).toBe('٣٤٥');
    expect(localizeDigits('345', 'hi')).toBe('345');
    expect(localizeDigits('345', 'en')).toBe('345');
  });
  it('reads typed Arabic-Indic and Urdu digits back as ASCII', () => {
    expect(toAsciiDigits('٣٤٥')).toBe('345');
    expect(toAsciiDigits('۱۲۳')).toBe('123');
    expect(toAsciiDigits('a٧b8')).toBe('a7b8');
  });
  it('formats numbers with grouping and decimals', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
    expect(formatNumber(1234567, 'hi')).toBe('1,234,567');
    expect(formatNumber(1234, 'ar')).toBe('١٬٢٣٤');
    expect(formatNumber(2.5, 'ur', 1)).toBe('٢٫٥');
    expect(formatNumber(0, 'en')).toBe('0');
    expect(formatNumber(-3, 'en')).toBe('-3');
  });
  it('formats percentages', () => {
    expect(formatPercent(0.456, 'en')).toBe('46%');
    expect(formatPercent(0.5, 'ar')).toBe('٥٠٪');
  });
});

describe('plurals', () => {
  it('uses six categories in Arabic', () => {
    expect([0, 1, 2, 3, 11, 100].map((n) => pluralCategory('ar', n))).toEqual([
      'zero',
      'one',
      'two',
      'few',
      'many',
      'other',
    ]);
  });
  it('treats 0 and 1 as singular in Hindi, only 1 in English and Urdu', () => {
    expect(pluralCategory('hi', 0)).toBe('one');
    expect(pluralCategory('en', 0)).toBe('other');
    expect(pluralCategory('ur', 1)).toBe('one');
    expect(pluralCategory('ur', 2)).toBe('other');
  });
  it('renders the right form and localizes the number', () => {
    const entry = { one: '{count} prayer', other: '{count} prayers' };
    expect(renderEntry(entry, 'en', { count: 1 })).toBe('1 prayer');
    expect(renderEntry(entry, 'en', { count: 1200 })).toBe('1,200 prayers');
    const ar = { one: 'صلاة واحدة', two: 'صلاتان', few: '{count} صلوات', other: '{count} صلاة' };
    expect(renderEntry(ar, 'ar', { count: 2 })).toBe('صلاتان');
    expect(renderEntry(ar, 'ar', { count: 5 })).toBe('٥ صلوات');
    expect(renderEntry(ar, 'ar', { count: 11 })).toBe('١١ صلاة'); // many falls back to other
  });
  it('leaves unknown placeholders alone and passes strings through', () => {
    expect(renderEntry('Hi {name} {x}', 'en', { name: 'Sam' })).toBe('Hi Sam {x}');
  });
});

describe('formatClock', () => {
  it('formats each language naturally', () => {
    expect(formatClock(20, 5, 'en')).toBe('8:05 PM');
    expect(formatClock(0, 0, 'en')).toBe('12:00 AM');
    expect(formatClock(20, 5, 'hi')).toBe('रात 8:05');
    expect(formatClock(17, 30, 'ur')).toBe('شام ٥:٣٠');
    expect(formatClock(8, 0, 'ar')).toBe('٨:٠٠ ص');
    expect(formatClock(13, 0, 'ar')).toBe('١:٠٠ م');
  });
});
