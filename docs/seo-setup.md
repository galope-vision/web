# Getting ga-lo-pe.com into search results

What the site does by itself, and what has to be done by hand once in Google Search Console.

## What the build takes care of

- **One canonical host.** `public/.htaccess` redirects http to https and `www` to the apex with
  301s, and every page carries a `<link rel="canonical">` to its own absolute URL. Before this,
  the same page answered on four URLs (`http`/`https` × with/without `www`), all with a 200 and
  no canonical, and a search engine picked one of them for us.
- **Absolute `hreflang`.** They need `site` in `astro.config.mjs`; without it Astro emits
  relative URLs, which search engines ignore, and the Spanish and English pages are never
  paired.
- **The trailing slash.** Apache serves `/info/` and redirects `/info` to it, so canonical,
  `hreflang` and the sitemap all name the version with the slash. A URL in a sitemap that
  redirects is reported as a warning.
- **`public/robots.txt`** allows everything except `/admin/`, and points at the sitemap.
- **`/sitemap.xml`** is built from the routes in `src/lib/i18n.ts` (`src/pages/sitemap.xml.ts`),
  with the `hreflang` alternates of each page. No dependency.

## What is in search results, and what is not

| Page                           | In the sitemap | Why                                   |
| ------------------------------ | -------------- | ------------------------------------- |
| `/` and `/en/`                 | yes            | The holding page, and the brand query |
| `/info/` and `/en/info/`       | yes            | Real text about the duo               |
| `/proyectos/`, `/en/projects/` | no, `noindex`  | Says "En construcción"                |
| `/contacto/`, `/en/contact/`   | no, `noindex`  | Still shows the placeholder email     |
| `/estilos/`                    | no, `noindex`  | Ours, not content                     |
| `/404`                         | no, `noindex`  | —                                     |
| `/admin/`                      | no, robots     | The CMS                               |

A page that carries `noindex` must stay out of the sitemap: asking a crawler to index what the
page then tells it to drop is reported as an error. The two lists to keep in sync are the
`noindex` props in `src/pages/` and `INDEXABLE` in `src/pages/sitemap.xml.ts`.

**`noindex` is not a secret.** The crawler has to fetch the page to read it, so `robots.txt`
must keep allowing those pages — blocking them there would hide the `noindex` and they could be
indexed anyway, from a link somewhere else.

## Google Search Console, once

1. **Verify the property.** A _domain_ property (`ga-lo-pe.com`) is the one to pick: it covers
   the apex, `www`, http and https in one go, which is exactly the thing the redirects above are
   about. It is verified with a `TXT` record in the zone. **Check where the zone is served
   from before going looking for it**: the nameservers are `ns3`/`ns4.hostmar.com`, DonWeb's,
   so the record goes in the Ferozo panel, not at GoDaddy, which only holds the registration
   — see [dns-setup.md](dns-setup.md).

   The alternative, if the DNS record is a problem: the **Google Tag Manager** method, which
   works because the container is already installed and published
   ([ADR 0007](adr/0007-google-tag-manager.md)). It needs publish rights on the container and it
   only verifies one origin, so `https://ga-lo-pe.com` would be verified and `www` would not.

2. **Submit the sitemap**: Sitemaps → `sitemap.xml`.

3. **Ask for the home page**: URL inspection → `https://ga-lo-pe.com/` → Request indexing. Once
   is enough; asking again does not make it faster.

Then wait. A domain with no inbound links takes days or weeks, and Search Console does not
change that — it just tells you what is happening instead of leaving you guessing.

## Still open

- `ajustes/general.yml` still has `hola@example.com`. `/contacto/` is `noindex` partly for that
  reason; the real address makes the page worth indexing.
- Social cards (`og:` and `twitter:` tags, and the default share image the spec asks for) are
  not built yet. They do nothing for Google, but they are what Instagram and WhatsApp show.
- `/estilos/` links to `/en/styles/`, which is not built. Harmless — the page is `noindex` — but
  it is wrong, and it will matter if the styles page ever gets an English twin.
- The Cloudflare Pages previews must be `noindex` when that workflow arrives
  ([ADR 0002](adr/0002-cloudflare-pages-previews.md)), or they compete with production.
