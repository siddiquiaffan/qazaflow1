import { useColorScheme, StyleSheet } from 'react-native';

const light = {
  bg: '#F6F8F7',
  card: '#FFFFFF',
  text: '#10201D',
  muted: '#5B6B67',
  primary: '#0F766E',
  primaryText: '#FFFFFF',
  border: '#DCE5E2',
  danger: '#B42318',
  track: '#DCE5E2',
};

const dark: typeof light = {
  bg: '#0B1412',
  card: '#13201D',
  text: '#E8F1EF',
  muted: '#93A5A0',
  primary: '#2DD4BF',
  primaryText: '#04201C',
  border: '#22332F',
  danger: '#F97066',
  track: '#22332F',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const common = StyleSheet.create({
  screen: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
