/**
 * Spacing Design Tokens
 * Source: Figma Design System
 */

export const spacing = {
  // Base spacing scale
  0: '0px',
  1: '4px',
  2: '5px',
  3: '8px',
  4: '12px',
  5: '16px',
  6: '24px',

  // Semantic spacing
  section: '24px',
  grid: '16px',
  cardGap: '8px',
  cardGapMd: '12px',
  textGap: '4px',
  iconGap: '5px',
  socialGap: '16px',
} as const;

// Component-specific dimensions
export const dimensions = {
  // Story card
  storyCard: {
    width: '229px',
    height: '422px',
    innerWidth: '205px',
    innerHeight: '398px',
    imageHeight: '290px',
  },
  // Book card (small)
  bookCard: {
    imageWidth: '100px',
    imageHeight: '160px',
    containerWidth: '160px',
  },
  // Icons
  icon: {
    sm: '24px',
    md: '32px',
  },
  // Avatar
  avatar: {
    sm: '24px',
  },
} as const;

export type SpacingKey = keyof typeof spacing;
