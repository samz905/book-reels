/**
 * Typography Design Tokens
 * Source: Figma Design System
 */

export const fontFamily = {
  sans: ['Mulish', 'ui-sans-serif', 'system-ui', 'sans-serif'],
} as const;

export const fontWeight = {
  normal: 400,
  semibold: 600,
  bold: 700,
  black: 900,
} as const;

export const fontSize = {
  sm: '14px',
  base: '16px',
  lg: '17.9px',
  xl: '64px',
} as const;

export const lineHeight = {
  tight: '18px',
  base: '20px',
  relaxed: '22px',
  loose: '28px',
  hero: '80px',
} as const;

// Pre-composed text styles matching Figma
export const textStyles = {
  // Card title
  cardTitle: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  // Card description / brand name
  cardDescription: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.normal,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    opacity: 0.7,
  },
  // Creator name
  creatorName: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.tight,
  },
  // Book title (small card)
  bookTitle: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.tight,
  },
  // Price text
  price: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.tight,
  },
  // Buy link
  buyLink: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.base,
    lineHeight: lineHeight.loose,
  },
  // Section header (hero)
  sectionHeader: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.black,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.hero,
  },
  // Tab/button text
  tabText: {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.relaxed,
  },
} as const;

export type FontWeightKey = keyof typeof fontWeight;
export type FontSizeKey = keyof typeof fontSize;
export type TextStyleKey = keyof typeof textStyles;
