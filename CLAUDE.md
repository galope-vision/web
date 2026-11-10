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
  `editorial_workflow` (drafts live in `cms/*` branches).
- **Auth**: Cloudflare Worker running `sveltia-cms-auth` (GitHub OAuth App owned by Galope).
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
public/.htaccess     https, caching, 404
src/content/         proyectos/<slug>/index.md + images · ajustes/general.yml, home.yml
src/content.config.ts  Zod schemas mirroring every CMS field
src/styles/          tokens.css (ONLY place for colors/type/spacing/motion values), global.css
src/components/      Header, Collage, layouts-galeria/*, ProjectList, Dado, VideoEmbed
src/scripts/         motion.ts
src/pages/           index, proyectos/index, proyectos/[slug], info, contacto, estilos, 404
docs/                spec.md, adr/, guia-carga.md (client guide, Spanish)
```

## Content model (summary)

`proyectos` (folder collection, `path: {{slug}}/index`, images stored next to the entry):
title · group (select) · type (select) · categories (multi-select) · quote (optional) ·
description (≤ ~600 chars) · credits (list of {role, name}) · cover (image) ·
galleryTemplate (A|B|C|D, default A) · gallery (list of {image, focus: center|top|bottom|left|right, alt (required)}) ·
video (YouTube/Vimeo URL, validated) · order (number) · inDice (bool) · visible (bool, default true) · date.

`ajustes/general.yml`: info text, email, socials, SEO defaults, default share image.
`ajustes/home.yml`: random home images, optional featured video.

Every CMS field must have a matching Zod rule so bad content fails the build (and the preview),
never production. The project "count" shown in the UI is computed (images + video), not stored.

## Pages

Header on every page: GALOPE logo centered + 4 square nav items; active one turns accent red.
The dice (on every page) wobbles every ~6 s and, on click, spins and navigates to a random
project from the `inDice` pool (client-side random). See `docs/spec.md` for each page.

## Gallery templates

CSS Grid with `grid-template-areas`, `object-fit: cover`, `object-position` from `focus`.
- A · main 16:9 + 2 panoramic below (3 slots)
- B · 3 vertical + 2 horizontal (5 slots)
- C · 2 on top + 1 wide below (3 slots)
- D · 1 centered with breathing room + 2 below (3 slots)
Extra images continue in a scroll area with a progress indicator (direction TBD).

## Motion rules

- Animate only `transform` and `opacity`.
- Entrance: opacity 0→1, translateY 24px→0, scale .96→1, rotate ±1.5°→0; 600 ms, 80 ms stagger, ease-out, on `inView`.
- Idle drift: ±6 px / ±0.6°, 8–12 s loop, deterministic per-index offset (no `Math.random` in CSS setup).
- Parallax: depth 0.2–1, max 12 px, lerped, disabled on touch devices.
- Image hover: target scale 1.03 on top, siblings 60% opacity, 250 ms.
- `prefers-reduced-motion: reduce` → no drift, no parallax, entrance = fade only.
- Pause animations off-screen and when the tab is hidden.
- Target: Lighthouse Performance ≥ 90 on mobile with the collage animated.

## Design tokens

All visual values come from `src/styles/tokens.css` (`--color-*`, `--font-*`, `--fs-*`,
`--space-*`, `--ease-*`, `--dur-*`). Current values are PROVISIONAL; final colors, fonts and logo
will arrive later. Never hardcode a color, font, size or duration in a component.

## Working rules (mandatory)

- **Language**: everything in the repo is English (code, comments, commits, branches, PRs, issues,
  README, ADRs). Client-facing text (site copy, CMS labels/hints, `docs/guia-carga.md`) is Spanish.
- **Never commit or push to `main`.** One task = one branch = one PR. Caro reviews and merges.
- **Branches**: `type/short-kebab-description` (e.g. `feat/collage-template-b`).
  Types: feat, fix, refactor, perf, style, docs, test, build, ci, chore. `cms/*` belongs to the CMS: never touch it.
- **Commits**: Conventional Commits 1.0, imperative, subject ≤ 72 chars, e.g. `feat(collage): add template B layout`.
  Scopes: cms, content, collage, motion, layout, design, a11y, seo, deploy, deps. Extra type `content` is reserved for CMS commits.
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
npm run dev       # local dev server
npm run build     # static build to dist/ (also validates content)
npm run preview   # serve dist/
npm run check     # astro check + eslint + prettier --check
npm run format    # prettier --write
```

## Phases (tag at the end of each)

0 Setup v0.1.0 · 1 CMS & content v0.2.0 · 2 Structure & static pages v0.3.0 ·
3 Projects v0.4.0 · 4 Motion v0.5.0 · 5 Previews & extras v0.6.0 ·
6 Production on DonWeb v0.9.0 · 7 Final content & handoff v1.0.0.

## Open decisions (do not assume — ask Caro)

- Final colors, fonts, logo, dark vs light background.
- What each of the 4 header squares is (icons or words).
- Search page and contact form: in or out.
- Spanish only or ES/EN.
- Mobile design (default: our own adaptation).
- Whether the required CI check blocks Sveltia's "Publish" (validate in phase 1).
- Sveltia support for full custom preview templates (validate in phase 1).
