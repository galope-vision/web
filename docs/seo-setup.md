# Getting ga-lo-pe.com into search results

What the build takes care of, and what has to be done by hand once in Google Search Console.

## One URL per page

Search engines treat every URL that answers with a 200 as a candidate, and pick one of them
themselves if we do not. Before any of this, the holding page answered on four:

```
http://ga-lo-pe.com/       200
https://ga-lo-pe.com/      200
http://www.ga-lo-pe.com/   200
https://www.ga-lo-pe.com/  200
```

`public/.htaccess` settles that with 301s — https, apex, and no trailing slash except on the two
home pages — and `site` in `astro.config.mjs` gives the build the absolute URLs it needs. Both
arrive with the deploy work; what this page adds is the part inside the HTML:

- **`<link rel="canonical">`** on every indexable page, naming its own absolute URL.
- **Absolute `hreflang`.** Without `site` Astro emits relative ones, which search engines ignore,
  so the Spanish and English pages are never paired.

Canonical, `hreflang` and the sitemap are all built from `localePath` in `src/lib/i18n.ts`, which
is the same function the `ES/EN` switch links with. That is deliberate: one source of truth for
the shape of a URL, so none of them can drift into naming a URL that redirects.

## What is in search results, and what is not

| Page                         | In the sitemap | Why                                   |
| ---------------------------- | -------------- | ------------------------------------- |
| `/` and `/en/`               | yes            | The holding page, and the brand query |
| `/info` and `/en/info`       | yes            | Real text about the duo               |
| `/proyectos`, `/en/projects` | no, `noindex`  | Says "En construcción"                |
| `/contacto`, `/en/contact`   | no, `noindex`  | Still shows the placeholder email     |
| `/estilos`                   | no, `noindex`  | Ours, not content                     |
| `/404`                       | no, `noindex`  | —                                     |
| `/admin/`                    | no, robots     | The CMS                               |

A page that carries `noindex` stays out of the sitemap, and gets no canonical either: asking a
crawler to index what the page then tells it to drop is reported back as an error. The two lists
to keep in sync are the `noindex` props in `src/pages/` and `INDEXABLE` in
`src/pages/sitemap.xml.ts`.

**`noindex` is not a secret.** The crawler has to fetch the page to read it, so `robots.txt` has
to keep allowing those pages. Blocking them there would hide the `noindex`, and they could end
up indexed anyway from a link somewhere else.

## Google Search Console, once

1. **Verify the property.** A _domain_ property (`ga-lo-pe.com`) is the one to pick: it covers
   apex, `www`, http and https in one go. It is verified with a `TXT` record, and **the zone is
   DonWeb's**: the nameservers are `ns3`/`ns4.hostmar.com`, so the record goes in the Ferozo
   panel. GoDaddy only holds the registration ([dns-setup.md](dns-setup.md)).

   The alternative, if the DNS record is a problem: the **Google Tag Manager** method, which
   works because the container is installed and published
   ([ADR 0008](adr/0008-google-tag-manager.md)). It needs publish rights on the container, and it
   verifies a single origin, so `https://ga-lo-pe.com` would be verified and `www` would not.

2. **Submit the sitemap**: Sitemaps → `sitemap.xml`.

3. **Ask for the home page**: URL inspection → `https://ga-lo-pe.com/` → Request indexing. Once
   is enough; asking again does not make it faster.

Then wait. A domain with no inbound links takes days or weeks, and Search Console does not change
that — it just tells you what is happening instead of leaving you guessing.

## Still open

- `ajustes/general.yml` still has `hola@example.com`. `/contacto` is `noindex` partly for that
  reason; the real address is what makes the page worth indexing.
- Social cards (`og:` and `twitter:` tags, and the default share image the spec asks for) are not
  built yet. They do nothing for Google, but they are what Instagram and WhatsApp show.
- `/estilos` links to `/en/styles`, which is not built. Harmless — the page is `noindex` — but it
  is wrong, and it matters if the styles page ever gets an English twin.
- The Cloudflare Pages previews have to be `noindex` when that workflow arrives
  ([ADR 0002](adr/0002-cloudflare-pages-previews.md)), or they compete with production.
