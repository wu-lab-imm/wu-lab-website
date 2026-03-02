# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working on code in this repository.

## Project Overview

Wu Lab Website - 吴惊香课题组官方网站，中国医学科学院药物研究所。使用 Astro + Tailwind CSS 构建的学术实验室网站。

## Common Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **Astro** - Static site generator
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## Architecture

### Pages
- `/` - Home (Hero section only)
- `/research` - Research areas
- `/people` - Team members
- `/publications` - Publications
- `/news` - News
- `/join` - Join the lab

### Content Collections
- `src/content/people/` - Team members (Markdown with frontmatter)
- `src/content/news/` - News items
- `src/content/research/` - Research projects
- `src/content/publications/publications.json` - Publications data

### Design System
- Fonts: Outfit (display), DM Sans (body), Noto Sans SC (Chinese)
- Colors: White background, gray text, amber accent (#d97706)
- Primary color: `#1e3a5f` (deep blue)
- Secondary color: `#3b82f6` (lighter blue)

## Key Files
- `tailwind.config.mjs` - Theme configuration
- `src/layouts/Layout.astro` - Base layout with fonts
- `src/components/Header.astro` - Navigation (fixed position)
- `src/components/Hero.astro` - Homepage hero section
- `src/content/config.ts` - Content collection schemas

## Important Notes

- Header is fixed position (`fixed top-0`), so content sections need `pt-28` padding to avoid overlap
- Page titles use white background with dark text (gray-900), consistent across all pages
- Research page shows 2 projects: neuroscience and glycan decoding
- Publications page uses inline card layout with Nature link and corresponding author email icon
- All images in content should be placed in `public/images/` directory

## Image Guidelines (图片使用规范)

### Adding Member Photos (添加成员照片)

1. **File Location**: Put images in `public/images/members/` directory (use English names)
2. **Path Format**: Use `/wu-lab-website/images/members/filename.png` in frontmatter
3. **File Extension**: Use lowercase `.png` or `.jpg` (NOT `.PNG` or `.JPG`)
4. **Recommended Resolution**: At least 2000x2000 pixels for clear display

Example in `src/content/people/xxx.md`:
```yaml
photo: "/wu-lab-website/images/members/filename.png"
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Broken image | Wrong path or missing file | Check path includes `/wu-lab-website/` prefix |
| Broken image | Case sensitivity | Use lowercase `.png`, not `.PNG` |
| Blurry image | Low resolution source | Provide higher resolution original (2000px+) |
| Chinese path not working | Encoding issues | Use English path like `/images/members/` |

### News Images
- Put in `public/images/news/` directory
- Path format in news markdown: `/wu-lab-website/images/news/...`

## Key Components

- `src/components/Header.astro` - Fixed navigation with logo, supports "Wu Lab · Structural Biology" styling with glow effects
- `src/components/Hero.astro` - Homepage hero section with large typography
- `src/components/NewsCard.astro` - News card component with hover effects
- `src/pages/research.astro` - Research page with image cards, supports optional images via frontmatter
- `src/pages/publications.astro` - Publications page with paper cards
