# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wu Lab Website - 吴惊香课题组官方网站，中国医学科学院药物研究所。使用 Astro + Tailwind CSS 构建的学术实验室网站，支持中英文国际化。

## Common Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production (includes type checking)
npm run build

# Preview production build
npm run preview

# Type check
npx astro check
```

## Tech Stack

- **Astro** - Static site generator (v4.15+)
- **Tailwind CSS** - Styling (v3.4+)
- **TypeScript** - Type safety with strict mode
- **i18n** - Built-in Astro internationalization (zh/en)

## Architecture

### Path Aliases
```json
{
  "@/*": ["src/*"],
  "@components/*": ["src/components/*"],
  "@layouts/*": ["src/layouts/*"]
}
```

### Pages
- `/` - Home (Hero section)
- `/research` - Research areas (5 projects)
- `/people` - Team members
- `/publications` - Publications
- `/news` - News
- `/join` - Join the lab

### Content Collections (`src/content/`)
- `people/` - Team members (Markdown with frontmatter)
- `news/` - News items with date, summary, optional images
- `research/` - Research projects with title, description, icon, order

### Global Styles
- `src/styles/global.css` - Imported in Layout.astro

### Components
- `src/components/Header.astro` - Fixed navigation
- `src/components/Hero.astro` - Homepage hero section
- `src/components/Footer.astro` - Site footer
- `src/components/NewsCard.astro` - News card with hover effects
- `src/components/PersonCard.astro` - Team member card
- `src/components/PublicationItem.astro` - Publication entry
- `src/components/ResearchCard.astro` - Research project card

### Layouts
- `src/layouts/Layout.astro` - Base layout with fonts (Outfit, DM Sans, Noto Sans SC), meta tags

### Design System
- Primary: `#1e3a5f` (deep blue)
- Secondary: `#3b82f6` (lighter blue)
- Accent: `amber-600` (#d97706)
- Fonts: Outfit (display), DM Sans (body), Noto Sans SC (Chinese)

## Image Guidelines

### Member Photos
- Location: `public/images/members/`
- Path in frontmatter: `/wu-lab-website/images/members/filename.png`
- Format: lowercase `.png` or `.jpg`
- Resolution: 2000px+ recommended

### News Images
- Location: `public/images/news/`
- Path: `/wu-lab-website/images/news/...`

## i18n Notes
- Default locale: `zh`
- Available locales: `zh`, `en`
- Configure in `astro.config.mjs` i18n section

## Key Files
- `astro.config.mjs` - Site config, base path (`/wu-lab-website`), i18n
- `tailwind.config.mjs` - Theme colors, fonts, animations
- `tsconfig.json` - Strict TypeScript, path aliases
- `src/content/config.ts` - Content collection schemas
