# 0002 · Cloudflare Pages for previews

- Status: Accepted
- Date: 2026-11-10

## Context

Every CMS draft and every code PR needs a URL where it can be seen before it reaches
production. Production runs on DonWeb shared hosting ([ADR 0003](0003-static-hosting-donweb-ftp.md)),
which serves a single site and has no per-branch environments.

## Decision

Use **Cloudflare Pages** (free tier) only for previews: one deployment per `cms/*` branch and
per PR. Production stays on DonWeb. Previews are not indexed: they send
`X-Robots-Tag: noindex` and have no analytics.

## Reasons

- Unique preview URLs per branch at no cost.
- The same static `dist/` output works on both hosts, so previews match production.
- Cloudflare already hosts the CMS auth Worker, so it adds no new provider.

## Consequences

- Two hosts to keep in sync. The build must not depend on host-specific features. Apache rules
  (`.htaccess`) only apply in production.
- The free tier has a monthly build quota. Previews build only for `cms/*` branches and PRs.
- The Cloudflare account belongs to Galope. Caro needs access to set up the project.
