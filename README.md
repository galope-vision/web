# GALOPE — website

Portfolio website for **GALOPE**, a creative duo from Buenos Aires that makes music-related
audiovisual work (videoclips, documentaries, visualizers, live sessions, graphic design).
The client publishes content on their own through a Git-based CMS.

- Spec (Spanish): [`docs/spec.md`](docs/spec.md)
- Working rules and context: [`CLAUDE.md`](CLAUDE.md) · [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Decisions: [`docs/adr/`](docs/adr/)

## Stack

Astro (static output, strict TypeScript) · Sveltia CMS at `/admin` · Cloudflare Worker for CMS
auth · Cloudflare Pages for previews · DonWeb shared hosting for production · Motion (motion.dev).
Everything runs on free tiers. There is no server runtime.

## Setup

Requirements: Node (version in [`.nvmrc`](.nvmrc)) and npm.

```sh
nvm use
npm ci
npm run dev
```

`npm ci` also installs the Git hooks (Husky): lint-staged on pre-commit and commitlint on
commit-msg.

## Scripts

| Script            | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Local dev server                                 |
| `npm run build`   | Static build to `dist/` (also validates content) |
| `npm run preview` | Serve `dist/` locally                            |
| `npm run check`   | `astro check` + ESLint + `prettier --check`      |
| `npm run format`  | `prettier --write`                               |

## Deploy overview

| Environment | Where            | Trigger                                |
| ----------- | ---------------- | -------------------------------------- |
| Preview     | Cloudflare Pages | Every PR and every CMS draft (`cms/*`) |
| Production  | DonWeb (FTPS)    | Merge to `main`, via GitHub Actions    |

- CI (`.github/workflows/ci.yml`) runs check and build, and validates the PR title, on every PR.
- Previews (`.github/workflows/preview.yml`) build and upload to Cloudflare Pages on every PR and
  every `cms/*` branch, and comment the URL on the PR. See
  [`docs/preview-setup.md`](docs/preview-setup.md).
- Releases: release-please opens a release PR from the Conventional Commits on `main`. Merging
  it tags the version (`vX.Y.Z`) and updates `CHANGELOG.md`.
  Release PRs are opened with `GITHUB_TOKEN`, which doesn't trigger workflows, so their required
  checks never start on their own. Close and reopen the release PR to run CI before merging it.

See [ADR 0002](docs/adr/0002-cloudflare-pages-previews.md),
[ADR 0003](docs/adr/0003-static-hosting-donweb-ftp.md) and
[ADR 0009](docs/adr/0009-previews-by-direct-upload.md).
