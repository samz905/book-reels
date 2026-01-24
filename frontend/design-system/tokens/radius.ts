/**
 * Border Radius Design Tokens
 * Source: Figma Design System
 */

export const radius = {
  none: '0px',
  sm: '8px',
  md: '12px',
  full: '9999px',

  // Semantic aliases
  card: '12px',
  button: '8px',
  input: '8px',
  avatar: '100px', // or 9999px for perfect circle
  image: '12px',
} as const;

export type RadiusKey = keyof typeof radius;
