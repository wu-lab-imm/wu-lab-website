import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://wu-lab-imm.github.io',
  base: '/wu-lab-website',
  devToolbar: {
    enabled: false,
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
