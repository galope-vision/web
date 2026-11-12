/**
 * The sitemap, built from the routes in `src/lib/i18n.ts` rather than from a dependency.
 *
 * It lists only the pages that belong in search results. A page that carries `noindex` must not
 * be here: asking a crawler to index what the page then tells it to drop is a contradiction
 * search engines report as an error. Keep `INDEXABLE` and the `noindex` props in sync
 * (docs/seo-setup.md).
 */
import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE, LOCALES, localePath, type Locale, type Page } from '../lib/i18n';

/**
 * `projects` and `contact` are placeholders today and `styles` is ours, so all three are
 * `noindex` and stay out. They come back here when they hold real content.
 */
const INDEXABLE: readonly Page[] = ['home', 'info'];

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error('`site` must be set in astro.config.mjs: the sitemap needs absolute URLs');
  }

  /** The same trailing-slash form the server serves, so no URL in here redirects. */
  const url = (locale: Locale, page: Page): string => {
    const path = localePath(locale, page);
    return new URL(path.endsWith('/') ? path : `${path}/`, site).href;
  };

  const entry = (page: Page): string => {
    const alternates = [
      ...LOCALES.map(
        (locale) =>
          `    <xhtml:link rel="alternate" hreflang="${locale}" href="${url(locale, page)}" />`,
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${url(DEFAULT_LOCALE, page)}" />`,
    ].join('\n');

    // One <url> per locale, each carrying the full set of alternates, as the protocol asks.
    return LOCALES.map(
      (locale) => `  <url>\n    <loc>${url(locale, page)}</loc>\n${alternates}\n  </url>`,
    ).join('\n');
  };

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${INDEXABLE.map(entry).join('\n')}
</urlset>
`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
