import { useColorScheme, type TextStyle } from 'react-native';

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
  /** Chat bubble of the user's own messages and its text colour. */
  userBubble: string;
  onUserBubble: string;
  /** The blue under the pointer (e.g. the enabled Send button on hover). */
  userBubbleHover: string;
  link: string;
  /** Floating menus. */
  popover: string;
  /** Code colours, by highlight.js token class (see components/markdown/highlight.ts). */
  syntax: SyntaxColors;
};

export type SyntaxColors = {
  keyword: string;
  string: string;
  number: string;
  comment: string;
  function: string;
  type: string;
  variable: string;
  attribute: string;
  meta: string;
  addition: string;
  deletion: string;
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
  userBubble: '#007AFF',
  onUserBubble: brand.white,
  userBubbleHover: '#0066D6',
  link: '#0062CC',
  popover: brand.white,
  syntax: {
    keyword: '#CF222E',
    string: '#0A3069',
    number: '#0550AE',
    comment: '#6E7781',
    function: '#8250DF',
    type: '#953800',
    variable: '#0550AE',
    attribute: '#116329',
    meta: '#6E7781',
    addition: '#116329',
    deletion: '#82071E',
  },
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
  userBubble: '#0A84FF',
  onUserBubble: brand.white,
  userBubbleHover: '#3D9BFF',
  link: '#4DA3FF',
  popover: '#16161A',
  syntax: {
    keyword: '#FF7B72',
    string: '#A5D6FF',
    number: '#79C0FF',
    comment: '#8B949E',
    function: '#D2A8FF',
    type: '#FFA657',
    variable: '#79C0FF',
    attribute: '#7EE787',
    meta: '#8B949E',
    addition: '#7EE787',
    deletion: '#FFA198',
  },
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
  /** JetBrains Mono, for code. */
  mono: 'JetBrainsMono_400Regular',
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
  /** Chat message text. */
  message: { ...textMetrics, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  // Ligatures off, so code shows the characters as typed (`=>`, not an arrow).
  code: {
    ...textMetrics,
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 20,
    fontVariant: ['no-contextual', 'no-common-ligatures'] as TextStyle['fontVariant'],
  },
} as const;
