// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  // The production domain. Canonical links, `hreflang` and the sitemap are absolute URLs, and
  // without this they come out relative, which search engines ignore (docs/seo-setup.md).
  site: 'https://ga-lo-pe.com',
  // Spanish has no prefix; English lives under `/en/` with translated segments (src/lib/i18n.ts).
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: { prefixDefaultLocale: false },
  },
});
