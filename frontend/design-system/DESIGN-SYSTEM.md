# Oddega Design System

Local design system extracted from Figma. Use this as the source of truth for development.

## Quick Start

```typescript
import { colors, spacing, textStyles, gradients } from '@/design-system/tokens';

// Use in components
const style = {
  color: colors.purple,
  padding: spacing.cardGap,
  ...textStyles.cardTitle,
};
```

---

## Colors

### Base Palette

| Name | Hex | Usage |
|------|-----|-------|
| White | `#FFFFFF` | Primary text, backgrounds |
| Dark | `#212121` | Dark backgrounds |
| Ash-1 | `#ADADAD` | Secondary text, muted |
| Ash-2 | `#CDCDCD` | Lighter secondary text |
| Purple | `#B8B6FC` | Accent, highlights, glow |
| Blue | `#539ED3` | Info, links |
| Green-1 | `#256B5F` | Dark green accent |
| Green-2 | `#044C5A` | Darker green |
| Green-3 | `#1ED760` | Primary (Spotify green), success, CTA |
| Orange | `#FF8C00` | Warning, prices |
| Coffee | `#FBF5EF` | Light warm background |
| Black-bg | `#1C1C1C` | Page background |
| Card bg-1 | `#272727` | Card backgrounds |
| Card bg-2 | `#212020` | Input backgrounds |
| Card bg-3 | `#303030` | Borders |
| Card bg-4 | `#363535` | Elevated cards |
| Logo | `#B3B3B3` | Logo color |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `background` | Black-bg | Page background |
| `foreground` | White | Primary text |
| `primary` | Green-3 | CTAs, success states |
| `secondary` | Ash-1 | Secondary elements |
| `accent` | Purple | Highlights, focus rings |
| `muted` | Ash-1 | Disabled, placeholder |
| `destructive` | `#FF4444` | Errors, delete actions |

---

## Typography

**Font Family:** Mulish (Google Fonts)

### Weights
- Normal: 400
- Semibold: 600
- Bold: 700
- Black: 900

### Text Styles

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Card Title | 16px | 700 | 20px | Story card titles |
| Card Description | 16px | 400 | 20px | Descriptions (70% opacity) |
| Creator Name | 14px | 600 | 18px | Attribution text |
| Book Title | 14px | 600 | 18px | Small card titles |
| Price | 14px | 600 | 18px | Price display |
| Buy Link | 16px | 700 | 28px | Action links |
| Tab Text | 17.9px | 700 | 22px | Navigation tabs |
| Section Header | 64px | 900 | 80px | Hero headings |

---

## Spacing

### Scale

| Token | Value | Usage |
|-------|-------|-------|
| `textGap` | 4px | Between text lines |
| `iconGap` | 5px | Icon to text |
| `cardGap` | 8px | Card internal spacing |
| `cardGapMd` | 12px | Larger card spacing |
| `grid` | 16px | Grid gaps |
| `section` | 24px | Section padding |

### Component Dimensions

**Story Card:**
- Outer: 229 x 422px
- Inner content: 205 x 398px
- Image area: 205 x 290px

**Book Card (small):**
- Image: 100 x 160px
- Container: 160px wide

**Icons:**
- Small: 24 x 24px
- Medium: 32 x 32px

**Avatar:**
- 24 x 24px, border-radius: 100px

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `none` | 0px | Sharp corners |
| `sm` | 8px | Buttons, inputs |
| `md` / `card` | 12px | Cards, images |
| `full` | 9999px | Pills, avatars |

---

## Effects

### Gradients

**Card Overlay:**
```css
linear-gradient(180deg, rgba(40, 45, 76, 0) 44.19%, rgba(40, 45, 76, 0.69) 85.43%)
```

**Hero Text (white to purple):**
```css
linear-gradient(135deg, #FFFFFF 0%, #FFFFFF 50%, #9C99FF 100%)
```

**Button:**
```css
linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)
```

**Page Background:**
```css
linear-gradient(180deg, #000000 0%, #000000 10%, #7370FF 100%)
```

### Shadows & Glows

**Purple Glow:**
```css
box-shadow: 0 0 95px rgba(181, 179, 255, 0.9);
/* or as background with blur */
background: rgba(181, 179, 255, 0.9);
filter: blur(95px);
```

---

## Icons

Located in `/design-system/icons/`

| Icon | Size | Color |
|------|------|-------|
| Play Circle | 32px, 24px | Green-3 with black center |
| Share | 24px | Ash-2 |
| Twitter/X | 24px | White |
| LinkedIn | 24px | White |
| TikTok | 24px | White |
| Instagram | 24px | White |

---

## Screenshots

Add screenshots to `/design-system/screenshots/`:

```
screenshots/
├── components/    # Individual UI components
├── pages/         # Full page captures
└── patterns/      # Reusable UI patterns
```

Naming convention: `component-name-state.png`
- `story-card-default.png`
- `story-card-hover.png`
- `header-desktop.png`
- `home-page-mobile.png`

---

## File Structure

```
frontend/design-system/
├── tokens/
│   ├── colors.ts      # Color palette & semantic colors
│   ├── typography.ts  # Fonts, sizes, text styles
│   ├── spacing.ts     # Spacing scale & dimensions
│   ├── radius.ts      # Border radius values
│   ├── effects.ts     # Gradients, shadows, filters
│   └── index.ts       # Central export
├── icons/
│   └── index.ts       # Icon exports
├── screenshots/
│   ├── components/
│   ├── pages/
│   └── patterns/
└── DESIGN-SYSTEM.md   # This file
```

---

## Usage with Tailwind

The CSS variables in `globals.css` are synced with these tokens. Use Tailwind classes where possible:

```jsx
// Tailwind (preferred for simple cases)
<div className="bg-card-bg-1 text-white rounded-card p-4">

// TypeScript tokens (for complex/dynamic cases)
import { colors, radius } from '@/design-system/tokens';
<div style={{ backgroundColor: colors.cardBg1, borderRadius: radius.card }}>
```

---

## Figma Source

Design file: [NEW-PLATFORM](https://www.figma.com/design/GBN7mbwDHygzogtKYW5VTV/NEW-PLATFORM?node-id=7-5)
