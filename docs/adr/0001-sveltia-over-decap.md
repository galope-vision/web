# 0001 · Sveltia CMS over Decap CMS

- Status: Accepted
- Date: 2026-11-10

## Context

The client must publish content without a developer. The site is static and lives in Git,
so a Git-based CMS fits: content is Markdown/YAML in the repo, every change is a commit, and
drafts can be branches with their own preview. Decap CMS is the reference option in this
category. Sveltia CMS is a newer, Decap-compatible replacement.

## Decision

Use **Sveltia CMS**, loaded from a CDN at `/admin`, with the GitHub backend and
`editorial_workflow` (drafts in `cms/*` branches). Authenticate with `sveltia-cms-auth` on a
Cloudflare Worker, using a GitHub OAuth App owned by Galope.

## Reasons

- It reads the same `config.yml` format as Decap, so the content model doesn't depend on the
  choice.
- It is actively developed, with a faster and more modern editing UI for non-technical editors.
- GitHub authentication works through a small Cloudflare Worker on a free tier, with no
  Netlify Identity or other paid service.

## Consequences

- The project is younger than Decap and has a smaller community. We validate in phase 1 what we
  rely on: the editorial workflow, the "Publish" flow with a required CI check, and custom
  preview templates.
- Fallback: since the config is compatible, switching back to Decap means changing the script
  tag in `public/admin/index.html` and reviewing the auth setup.
- Editors need a GitHub account with write access to the repo.
