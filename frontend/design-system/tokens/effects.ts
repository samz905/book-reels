/**
 * Effects Design Tokens (Gradients, Shadows, Filters)
 * Source: Figma Design System
 */

export const gradients = {
  // Card overlay gradient
  cardOverlay: 'linear-gradient(180deg, rgba(40, 45, 76, 0) 44.19%, rgba(40, 45, 76, 0.69) 85.43%)',

  // Image darkening overlay
  imageOverlay: 'linear-gradient(0deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2))',

  // Hero text gradient (white to purple)
  heroText: 'linear-gradient(135deg, #FFFFFF 0%, #FFFFFF 50%, #9C99FF 100%)',

  // Page background gradient
  pageBackground: 'linear-gradient(180deg, #000000 0%, #000000 10%, #7370FF 100%)',

  // Page overlay (fade to black)
  pageOverlay: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, #000000 100%)',

  // Button gradient
  button: 'linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)',

  // Text gradient (purple to blue)
  text: 'linear-gradient(90deg, #B8B6FC 0%, #539ED3 100%)',
} as const;

export const shadows = {
  // Purple glow effect
  purpleGlow: '0 0 95px rgba(181, 179, 255, 0.9)',
} as const;

export const filters = {
  // Blur for glow elements
  glowBlur: 'blur(95px)',
} as const;

export const blendModes = {
  normal: 'normal',
} as const;

// CSS utility generators
export const applyGradientText = (gradient: string) => ({
  background: gradient,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
});

export const applyGlow = () => ({
  background: 'rgba(181, 179, 255, 0.9)',
  mixBlendMode: 'normal' as const,
  filter: 'blur(95px)',
});

export type GradientKey = keyof typeof gradients;
export type ShadowKey = keyof typeof shadows;
