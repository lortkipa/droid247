import { useColorScheme } from 'react-native';

/** Brand colours from brand/logo/README.md. */
export const brand = {
  ink: '#0B0D12',
  white: '#FFFFFF',
  mist: '#F4F6FA',
  signalOrange: '#FF5A1F',
} as const;

export type Theme = {
  scheme: 'light' | 'dark';
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  /** Filled button background and its label colour. */
  primary: string;
  onPrimary: string;
  /** Button backgrounds under the pointer (web/desktop hover). */
  primaryHover: string;
  outlineHover: string;
  /** Caret, selection handles and the iOS selection tint. */
  selection: string;
  /** Selected-text box on Android (translucent so the text stays readable). */
  selectionHighlight: string;
  danger: string;
  online: string;
  /** Cursor colour of the logo mark (mark.svg on light, mark-dark.svg on dark). */
  logo: string;
};

const light: Theme = {
  scheme: 'light',
  background: brand.white,
  surface: brand.mist,
  border: '#DCDFE5',
  text: brand.ink,
  muted: '#5F6675',
  primary: brand.ink,
  onPrimary: brand.white,
  primaryHover: '#2A2E38',
  outlineHover: brand.mist,
  selection: '#007AFF',
  selectionHighlight: 'rgba(0, 122, 255, 0.3)',
  danger: '#D92D20',
  online: '#16A34A',
  logo: brand.ink,
};

const dark: Theme = {
  scheme: 'dark',
  background: '#000000',
  surface: '#0E0E10',
  border: '#2A2A2F',
  text: brand.mist,
  muted: '#8B8F98',
  primary: brand.white,
  onPrimary: '#000000',
  primaryHover: '#D9DCE2',
  outlineHover: '#16161A',
  selection: '#0A84FF',
  selectionHighlight: 'rgba(10, 132, 255, 0.4)',
  danger: '#F97066',
  online: '#2BD576',
  logo: brand.white,
};

/** Colours for the current system theme (light when the system doesn't say). */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

/**
 * Outfit, loaded in the root layout. Each weight is its own family; don't set
 * fontWeight on top, Android ignores or fakes it for custom fonts.
 */
export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

/**
 * Android pads text with extra font ascent/descent by default, which puts
 * glyphs a little off from web and iOS. Spread this into every text style.
 */
export const textMetrics = { includeFontPadding: false } as const;

export const typography = {
  title: { ...textMetrics, fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  body: { ...textMetrics, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  small: { ...textMetrics, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
} as const;
