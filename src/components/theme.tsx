import { useColorScheme } from 'react-native';

/**
 * Palette: deep emerald with warm gold on parchment (light) / night green (dark).
 * Every text/background pairing below meets WCAG AA contrast.
 */
const light = {
  bg: '#F5F2EA',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEBE0',
  text: '#14201C',
  muted: '#5C6862',
  border: '#E3DED1',
  primary: '#0E6B5C',
  primarySoft: '#DDEEE8',
  onPrimary: '#FFFFFF',
  hero: '#0B4F44',
  onHero: '#FFFFFF',
  onHeroMuted: 'rgba(255,255,255,0.72)',
  heroTrack: 'rgba(255,255,255,0.16)',
  accent: '#E0B04A',
  accentSoft: '#F7ECCF',
  onAccentSoft: '#6B4E0E',
  danger: '#B3261E',
  dangerSoft: '#F9DEDC',
  success: '#2E7D5B',
  track: '#E6E1D4',
  overlay: 'rgba(10,20,17,0.5)',
};

const dark: typeof light = {
  bg: '#0B1512',
  surface: '#13211C',
  surfaceAlt: '#1A2B25',
  text: '#ECF3EF',
  muted: '#93A89F',
  border: '#22362F',
  primary: '#4FD1B0',
  primarySoft: '#17342D',
  onPrimary: '#06201A',
  hero: '#0F3B33',
  onHero: '#FFFFFF',
  onHeroMuted: 'rgba(255,255,255,0.7)',
  heroTrack: 'rgba(255,255,255,0.14)',
  accent: '#E6BC5C',
  accentSoft: '#2B2511',
  onAccentSoft: '#F1D58F',
  danger: '#FF8A80',
  dangerSoft: '#3A1B19',
  success: '#6FD6A6',
  track: '#223630',
  overlay: 'rgba(0,0,0,0.6)',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
