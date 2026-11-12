# CLAUDE.md — GALOPE website

Context file for Claude Code sessions. Read it fully before doing anything.
The full spec (in Spanish) lives in `docs/spec.md`. If this file and the spec disagree, ask.

## Project

Portfolio website for **GALOPE**, a creative duo from Buenos Aires that makes music-related
audiovisual work (videoclips, documentaries, visualizers, live sessions, graphic design).
The client must be able to publish content on their own, with no developer involved.

- Owner/developer: Caro (repo admin). Client: Galope (content editors).
- All infrastructure accounts (GitHub, Cloudflare, DonWeb, GoDaddy) belong to Galope.
- Budget: everything on free tiers.

## Stack

- **Astro** (latest stable), TypeScript `strict`, static output only (`output: 'static'`).
- **Sveltia CMS** (Decap-compatible, Git-based) at `/admin`, loaded from CDN. GitHub backend,
  `publish_mode: editorial_workflow` (drafts live in `cms/*` branches). Publishing merges the
  draft's PR; when CI is still running, the CMS turns on auto-merge and waits, so the
  repository needs "Allow auto-merge" enabled.
- **Auth**: Cloudflare Worker running `sveltia-cms-auth` (GitHub OAuth App owned by Galope).
- **i18n**: Spanish (default, no prefix) and English (`/en/`). English content is machine-translated
  in the CMS (Sveltia + Google Gemini free tier, key owned by Galope, stored in the editor's browser,
  never in the repo) and saved as editable text. Never translate at build time. UI strings live in a code
  dictionary. Missing English falls back to Spanish (build warns, does not fail).
- **Hosting**: DonWeb shared hosting (Apache, static files only). Deployed by GitHub Actions via
  FTPS (`SamKirkland/FTP-Deploy-Action`). Domain DNS stays at GoDaddy.
- **Previews**: Cloudflare Pages — one preview per CMS draft branch and per code PR. `noindex`.
- **Analytics**: Cloudflare Web Analytics (production only, no cookies).
- **Motion**: Motion (motion.dev) — only `animate`, `inView`, `stagger`. Idle drift in pure CSS.
  Parallax in our own TS (`src/scripts/motion.ts`).

Never add a server runtime, database, SSR adapter or paid service.

## Repo layout

```
.github/workflows/   ci.yml (PRs), preview.yml (cms/* + PRs), deploy.yml (main → DonWeb)
public/admin/        index.html, config.yml (Sveltia), preview styles
public/fonts/        final web fonts (woff2)
public/img/          images served as they are (logo-galope.svg)
public/.htaccess     https, caching, 404
src/assets/          images Astro optimizes (dado.png)
src/content/         proyectos/<slug>/index.md + images · ajustes/general.yml, home.yml
src/content.config.ts  Zod schemas mirroring every CMS field
src/styles/          tokens.css (ONLY place for colors/type/spacing/motion values), global.css
src/components/      Header, LocaleSwitch, Dice, Logo, Placeholder · still to come: Collage,
                     ProjectList, ProjectPanel, VideoEmbed
src/lib/             collage.ts (seeded layout), i18n.ts (locales, routes, dictionaries),
                     content.ts (content per locale, Spanish fallback), options.ts (option keys),
                     tokens.ts (reads tokens.css for /estilos)
src/scripts/         motion.ts
src/pages/           index, proyectos/index, proyectos/[slug], info, contacto, estilos, 404
                     en/ mirrors them in English (index, projects, info, contact)
docs/                spec.md, adr/, cms-auth-setup.md, dns-setup.md, deploy-setup.md, seo-setup.md,
                     guia-carga.md (client guide, Spanish)
```

## Content model (summary)

`proyectos` (folder collection, `path: {{slug}}/index`, images stored next to the entry):
title · group (select) · type (select) · categories (multi-select) · quote (optional) ·
description (≤ ~600 chars) · credits (list of {role, name, url (optional)}) · cover (image) ·
gallery (list of {image, part: fotos|proceso, focus: center|top|bottom|left|right, alt (required)}) ·
videos (list of YouTube/Vimeo URLs, validated) · collageSeed (number, default 0) · order (number) ·
inDice (bool) · visible (bool, default true) · date.
Translated fields: quote, description, credit roles, alt texts. `group`, `type` and `categories` store
keys whose ES/EN labels live in the code dictionary. Titles and names are not translated.

`ajustes/general.yml`: info text + highlights ({phrase, image, alt}; each phrase must appear verbatim
in the text), email, socials,
SEO defaults, default share image.
`ajustes/home.yml`: random home images, optional featured video.

Every CMS field must have a matching Zod rule so bad content fails the build (and the preview),
never production. The project "count" shown in the UI is computed (images + video), not stored.

## Pages

Design source: Figma `landing-web-2026`, pages named **[actualizado]** (older pages are obsolete).
Every page: nav row on top (`PROYECTOS · INFO · CONTACTO · ES/EN`, one per grid column; active one
red + underlined), the dice top-center under the nav, the GALOPE logo (SVG) bottom-center.
The dice wobbles every ~6 s and, on click, spins and navigates to a random project from the
`inDice` pool (client-side random).
- Projects list: grouped by `group`, title + (type); hover/focus on a row fades in that project's
  collage (200 ms) over the general collage.
- Project detail: info panel over the collage (title, description, "Partes del proyecto" links
  Fotos/Vídeos/Proceso that scroll to their sections below the collage, credits, Más/Menos Info
  toggle, VOLVER).
- Info: highlighted words swap the image on the right on hover/focus (fade + slight rotation).
See `docs/spec.md` for each page.

## Collage

Seeded, constrained random layout computed at build time (`src/lib/collage.ts`), no layout JS:
- Cells on the 4-column grid (2 columns on mobile); dice and logo zones reserved.
- One image per cell, one of 3 preset sizes by aspect ratio; jitter ≤ 25% of the cell; overlap
  ≤ 40% of the smaller image.
- Seed = slug + `collageSeed` (same project → same collage; editors bump `collageSeed` to reshuffle).
- If no seed meets the constraints, fall back to the fixed Figma composition. Never ship a broken collage.
- Max 8 images (from `gallery`, in order); the rest only appear in the Fotos/Proceso sections.
- `object-fit: cover`, `object-position` from `focus`.

## Motion rules

- Animate only `transform` and `opacity`.
- Entrance: opacity 0→1, translateY 24px→0, scale .96→1, rotate ±1.5°→0; 600 ms, 80 ms stagger, ease-out, on `inView`.
- Idle drift: ±6 px / ±0.6°, 8–12 s loop, deterministic per-index offset (no `Math.random` in CSS setup).
- Parallax: depth 0.2–1, max 12 px, lerped, disabled on touch devices.
- Image hover: target scale 1.03 on top, siblings 60% opacity, 250 ms.
- Projects list collage swap: 200 ms fade. Info image swap: fade + slight rotation.
- Everything triggered by hover is also triggered by keyboard focus.
- `prefers-reduced-motion: reduce` → no drift, no parallax, entrance = fade only.
- Pause animations off-screen and when the tab is hidden.
- Target: Lighthouse Performance ≥ 90 on mobile with the collage animated.

## Design tokens

All visual values come from `src/styles/tokens.css` (`--color-*`, `--font-*`, `--fs-*`,
`--space-*`, `--ease-*`, `--dur-*`). Never hardcode a color, font, size or duration in a component.
Target values (Figma [actualizado], applied in phase 2): black `#000000` background, red `#C42626`
accent, light `#E6E6E6` text, image placeholder `#786E5B` at 70%; Baskerville Bold/Regular at
13 and 16 px (Libre Baskerville fallback); logo is a vectorized SVG; grid of 4 columns, 9 px
margins, 18 px gutters. Red text uses `--color-accent-text` (`#D93A3A`, 4.62:1); the brand
red `#C42626` is for the logo, the dice and other non-text (ADR 0006).

## Working rules (mandatory)

- **Language**: everything in the repo is English (code, comments, commits, branches, PRs, issues,
  README, ADRs). Client-facing text (site copy, CMS labels/hints, `docs/guia-carga.md`) is Spanish.
- **Never commit or push to `main`.** One task = one branch = one PR. Caro reviews and merges.
- **Branches**: `type/short-kebab-description` (e.g. `feat/collage-template-b`).
  Types: feat, fix, refactor, perf, style, docs, test, build, ci, chore. `cms/*` belongs to the CMS: never touch it.
- **Commits**: Conventional Commits 1.0, imperative, subject ≤ 72 chars, e.g. `feat(collage): add template B layout`.
  Scopes: cms, content, collage, motion, layout, design, i18n, a11y, seo, deploy, deps. Extra type `content` is reserved for CMS commits.
- **PRs**: title = squash commit message (Conventional Commits). Squash and merge only.
  Keep PRs small (< ~400 changed lines). Fill the PR template: What / Why / How to test /
  Screenshots or video (required for visual changes) / Checklist. Add `Closes #<issue>`.
- **Before opening a PR**: run `npm run check` and `npm run build`; both must pass.
- Check every visual change at mobile width and with `prefers-reduced-motion`.
- Accessibility: required alt text, visible focus, keyboard support for list, dice and gallery.
- No secrets in the repo. Document env vars in `.env.example`.
- Record significant decisions as short ADRs in `docs/adr/NNNN-title.md`.
- Ask before adding any dependency not listed in this file.
- Update this file when a phase closes or a decision changes.

## Commands

```
npm run dev       # local dev server (the CMS is at /admin/index.html, not /admin/)
npm run build     # static build to dist/ (also validates content)
npm run preview   # serve dist/
npm run check     # astro check + eslint + prettier --check
npm run format    # prettier --write
```

## Phases (tag at the end of each)

0 Setup v0.1.0 · 1 CMS, content & i18n v0.2.0 · 2 Structure, real tokens & static pages v0.3.0 ·
3 Projects & collage v0.4.0 · 4 Motion v0.5.0 · 5 Previews & extras v0.6.0 ·
6 Production on DonWeb v0.9.0 · 7 Final content & handoff v1.0.0.

Status: phase 0 closed (v0.1.0, 2026-11-10). Next: phase 1.

## Open decisions (do not assume — ask Caro)

- Home layout of the random images/video. Contacto design. Fotos/Vídeos/Proceso section design.
- Whether real photos keep the 70% opacity of the placeholder.
- Search page and contact form: in or out. Whether the dice excludes the current project.
- Mobile design (default: our own adaptation).
- Whether the editor pane needs custom preview templates (Sveltia supports them through
  `registerPreviewTemplate`; none are registered yet).
