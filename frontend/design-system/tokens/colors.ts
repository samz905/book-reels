/**
 * Color Design Tokens
 * Source: Figma Design System
 */

// Base color palette
export const colors = {
  white: '#FFFFFF',
  dark: '#212121',
  ash1: '#ADADAD',
  ash2: '#CDCDCD',
  purple: '#B8B6FC',
  blue: '#539ED3',
  green1: '#256B5F',
  green2: '#044C5A',
  green3: '#1ED760',
  orange: '#FF8C00',
  coffee: '#FBF5EF',
  blackBg: '#1C1C1C',
  cardBg1: '#272727',
  cardBg2: '#212020',
  cardBg3: '#303030',
  cardBg4: '#363535',
  logo: '#B3B3B3',
} as const;

// Semantic color mappings
export const semantic = {
  background: colors.blackBg,
  foreground: colors.white,
  primary: colors.green3,
  secondary: colors.ash1,
  accent: colors.purple,
  muted: colors.ash1,
  mutedForeground: colors.ash2,
  card: colors.cardBg1,
  cardForeground: colors.white,
  border: colors.cardBg3,
  input: colors.cardBg2,
  ring: colors.purple,
  destructive: '#FF4444',
  success: colors.green3,
  warning: colors.orange,
  info: colors.blue,
} as const;

// Effect colors (with alpha)
export const effectColors = {
  purpleGlow: 'rgba(181, 179, 255, 0.9)',
  purpleGlowLight: 'rgba(156, 153, 255, 0.55)',
  cardGradientEnd: 'rgba(40, 45, 76, 0.69)',
  imageOverlay: 'rgba(0, 0, 0, 0.2)',
} as const;

export type ColorKey = keyof typeof colors;
export type SemanticColorKey = keyof typeof semantic;
