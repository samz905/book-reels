# Oddega

A web app where authors can create short AI-video series for their books to increase engagement and sales. The app distributes these videos along with ebooks through creator profiles.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Font**: Mulish (Google Fonts)

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
book-reels/
├── frontend/
│   ├── app/
│   │   ├── components/    # Reusable UI components
│   │   ├── data/          # Mock data and types
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Homepage
│   │   └── globals.css    # Global styles & design tokens
│   ├── public/            # Static assets
│   └── package.json
└── README.md
```

## Features

- Browse stories by category (Romance, Fantasy, Sci-Fi, etc.)
- Responsive grid layout for story cards
- Hover effects with play button overlay
- Creator profiles with avatars

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```
