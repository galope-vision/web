# 0008 · Google Tag Manager next to Cloudflare Web Analytics

- Status: Accepted
- Date: 2026-11-12

## Context

The spec picked Cloudflare Web Analytics: free, production only, no cookies. Galope also wants
Google Tag Manager (container `GTM-W5Q3RH53`), so they can add Google tags (GA4, ads, pixels)
without a code change.

## Decision

- Keep Cloudflare Web Analytics as planned and add GTM **next to it**, not instead of it.
- `src/components/GoogleTagManager.astro` renders the official GTM snippet: the loader at the
  top of `<head>` and the `<noscript>` iframe right after `<body>`. `src/layouts/Base.astro`
  includes both.
- The container ID comes from `PUBLIC_GTM_ID` at build time. Only the production deploy sets
  it, so dev, CI and the Cloudflare Pages previews ship no tag and send no test traffic. A
  value that doesn't look like `GTM-XXXXXXX` fails the build.
- The CMS (`/admin`) doesn't use the layout and gets no tag.

## Alternatives considered

- **Hardcode the snippet.** Previews and local dev would report visits as real ones.
- **Replace Cloudflare Web Analytics with GTM + GA4.** Cloudflare keeps counting visitors who
  block Google, needs no consent, and costs nothing to keep.
- **The snippet as first pasted** (`gtm.js` plus a `gtag()` stub). It mixes GTM with gtag.js and
  never pushes the `gtm.start` event, so the container would fire no tags.

## Consequences

- GTM loads a third-party script on every page. It's `async`, but its tags count towards the
  Lighthouse mobile target (≥ 90); check it again once tags are added in GTM.
- Tags added in GTM (GA4 in particular) set cookies and send data to Google. Whether the site
  needs a consent banner (Consent Mode) is still open.
- The deploy workflow must set `PUBLIC_GTM_ID` for the production build only.
- The container must belong to a Google account of Galope, like the rest of the infrastructure.
