# Contributing

Summary of the working rules in [`CLAUDE.md`](CLAUDE.md), which is the source of truth.

## Language

Everything in the repo is in English: code, comments, commits, branches, PRs, issues, README and
ADRs. Client-facing text (site copy, CMS labels and hints, `docs/guia-carga.md`) is in Spanish.

## Branches

- Never commit or push to `main`. One task = one branch = one PR.
- Name branches `type/short-kebab-description`, e.g. `feat/collage-template-b`.
- Types: `feat`, `fix`, `refactor`, `perf`, `style`, `docs`, `test`, `build`, `ci`, `chore`.
- `cms/*` branches belong to the CMS. Never touch them.

## Commits

- [Conventional Commits 1.0](https://www.conventionalcommits.org/), imperative mood, subject
  ≤ 72 characters, e.g. `feat(collage): add template B layout`.
- Scopes: `cms`, `content`, `collage`, `motion`, `layout`, `design`, `i18n`, `a11y`, `seo`,
  `deploy`, `deps`.
- The extra type `content` is reserved for commits made by the CMS.
- commitlint enforces the format on every commit.

## Pull requests

- The PR title is the squash commit message, in Conventional Commits format (CI checks it).
- Squash and merge only. Keep PRs small (under ~400 changed lines).
- Fill the template: What / Why / How to test / Screenshots or video (required for visual
  changes) / Checklist. Add `Closes #<issue>`.
- Before opening: `npm run check` and `npm run build` must both pass.

## Quality

- Check every visual change at mobile width and with `prefers-reduced-motion: reduce`.
- Accessibility: alt text is required, focus is always visible, and the list, dice and gallery
  work with the keyboard.
- Visual values (color, type, spacing, motion) live only in `src/styles/tokens.css`. Never
  hardcode them in a component.
- Motion animates only `transform` and `opacity`.

## Project hygiene

- No secrets in the repo. Document env vars in `.env.example`.
- Record significant decisions as short ADRs in `docs/adr/NNNN-title.md`.
- Ask before adding a dependency that `CLAUDE.md` doesn't list.
- Never add a server runtime, database, SSR adapter or paid service.
