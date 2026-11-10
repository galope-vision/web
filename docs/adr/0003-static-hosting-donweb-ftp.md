# 0003 · Static hosting on DonWeb, deployed over FTPS

- Status: Accepted
- Date: 2026-11-10

## Context

Galope already has a DonWeb shared hosting plan (Apache, no Node runtime) and wants to keep it
for production. The domain's DNS stays at GoDaddy. The budget is zero.

## Decision

Build a fully static site (`output: 'static'`) and deploy `dist/` to DonWeb from GitHub Actions
over **FTPS**, with `SamKirkland/FTP-Deploy-Action`, on every push to `main`. Apache settings
(HTTPS redirect, caching, 404) live in `public/.htaccess`.

## Reasons

- Uses the hosting the client already pays for. No new provider for production.
- A static site fits shared hosting: no server runtime, database or SSR adapter.
- The action syncs incrementally (it keeps a state file on the server), so deploys stay fast.

## Consequences

- FTP credentials live only in GitHub Actions secrets, never in the repo.
- There are no atomic deploys or instant rollbacks. Rolling back means reverting on `main` and
  redeploying.
- Deploy failures must be visible: the workflow fails loudly and GitHub notifies about it.
