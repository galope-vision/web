# 0009 · Previews by Direct Upload from GitHub Actions

- Status: Accepted
- Date: 2026-11-12

## Context

[ADR 0002](0002-cloudflare-pages-previews.md) chose Cloudflare Pages for previews but not how the
files get there. Cloudflare offers two ways:

1. **Git integration** — the Cloudflare GitHub App watches the repository and Cloudflare runs the
   build itself.
2. **Direct Upload** — our own workflow builds and uploads the result with `wrangler`.

## Decision

**Direct Upload**, from `.github/workflows/preview.yml`.

## Reasons

- **One build definition.** CI, production and previews all run `npm ci && npm run build` on the
  Node version in `.nvmrc`. With the Git integration the preview build command and its Node
  version live in a dashboard, where they drift from the repository and are invisible in review.
- **The build environment is already pinned.** `actions/setup-node` reads `.nvmrc`; Cloudflare's
  builder needs an environment variable set by hand to the same value.
- **Analytics stay off previews by construction.** Previews simply never set `PUBLIC_GTM_ID`.
- **Installing a GitHub App on `galope-vision` needs an organisation owner**, which is the same
  approval as adding two repository secrets, for less control.
- `CLAUDE.md` already describes a `preview.yml` workflow in the repository layout.

## Consequences

- Two repository secrets are needed — `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` — and
  only an administrator of `galope-vision/web` can add them. Until they exist, the workflow runs
  and fails at the deploy step; nothing else breaks.
- The Pages project is created once by hand, as Direct Upload, with `main` as its production
  branch. This workflow never runs on `main`, so it never produces a production deployment there;
  production is DonWeb ([ADR 0003](0003-static-hosting-donweb-ftp.md)).
- No preview comment appears on a pull request opened from a fork, which would not see the
  secrets. Every branch in this project is in-repo, so this does not come up in practice.
- `noindex` is applied as an `X-Robots-Tag` header through a `_headers` file written by the
  workflow, not shipped in `public/`, so the DonWeb build is unchanged.
