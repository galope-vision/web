// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  // The production domain (docs/dns-setup.md). It makes the `hreflang` links absolute, which is
  // what search engines require, and gives `Astro.site` to anything that builds absolute URLs.
  site: 'https://ga-lo-pe.com',
  // `build.format` stays on the default `'directory'` (`info/index.html`). Do not switch it to
  // `'file'`: `Astro.url.pathname` becomes `/info.html`, `parsePath` in `src/lib/i18n.ts` stops
  // recognising it, and every page's `hreflang` falls back to the home page. The links have no
  // trailing slash, and `public/.htaccess` maps them onto the directories.
  // Spanish has no prefix; English lives under `/en/` with translated segments (src/lib/i18n.ts).
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: { prefixDefaultLocale: false },
  },
});
