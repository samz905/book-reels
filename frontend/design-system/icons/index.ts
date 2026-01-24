/**
 * Icon Exports
 *
 * Add SVG icons from Figma here.
 *
 * Icons identified in design system:
 * - Play circle (32x32, 24x24) - green play button
 * - Share icon (24x24)
 * - Social icons (24x24 each):
 *   - Twitter/X
 *   - LinkedIn
 *   - TikTok
 *   - Instagram
 *
 * To add icons:
 * 1. Export SVG from Figma
 * 2. Save to this folder (e.g., play-circle.svg)
 * 3. Import and export from this file
 *
 * @example
 * // After adding play-circle.svg:
 * export { default as PlayCircleIcon } from './play-circle.svg';
 */

// Placeholder exports - replace with actual SVG imports
export const iconSizes = {
  sm: 24,
  md: 32,
} as const;

export const iconNames = [
  'play-circle',
  'share',
  'twitter',
  'linkedin',
  'tiktok',
  'instagram',
] as const;

export type IconName = (typeof iconNames)[number];
export type IconSize = keyof typeof iconSizes;
