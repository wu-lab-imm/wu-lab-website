import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://wu-lab-imm.github.io',
  base: '/wu-lab-website',
  devToolbar: {
    enabled: false,
  },
  prefetch: {
    // Cache ordinary internal links on intent. Main navigation links opt into
    // the stronger `load` strategy in Header.astro so slow GitHub routes are
    // usually resolved before the visitor clicks them.
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  integrations: [tailwind()],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
  },
});
