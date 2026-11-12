# Deploying to DonWeb

Phase 6, the deploy half. The DNS half is in [dns-setup.md](dns-setup.md), and the decision
behind all of it in [ADR 0003](adr/0003-static-hosting-donweb-ftp.md).

`.github/workflows/deploy.yml` builds the site and uploads `dist/` to the DonWeb hosting over
FTPS on every push to `main`. Because publishing from the CMS merges the entry's pull request,
this workflow is also what puts Galope's own content live.

## What has to be configured on the repository

In `galope-vision/web` → **Settings → Secrets and variables → Actions**. Three secrets and one
variable; the workflow fails with a readable message if the variable is missing.

| Name             | Kind     | Value                                                            |
| ---------------- | -------- | ---------------------------------------------------------------- |
| `FTP_SERVER`     | secret   | `200.58.111.133`, or whatever host FileZilla already connects to |
| `FTP_USERNAME`   | secret   | The FTP user of the hosting account                              |
| `FTP_PASSWORD`   | secret   | That user's password                                             |
| `FTP_SERVER_DIR` | variable | The web directory, **with a trailing slash** (see below)         |

`FTP_SERVER_DIR` is a _variable_, not a secret, so that it shows up in the logs when a deploy
goes to the wrong place. It is the web root of the account, which depends on the panel:

| Panel  | Usually         |
| ------ | --------------- |
| Ferozo | `/httpdocs/`    |
| cPanel | `/public_html/` |

This account is on **Ferozo** — plan _Web Hosting Plan Full_, Linux, service `#6624915`, panel
at <https://panel.ferozo.com> with its own user and password — so the value is almost certainly
`/httpdocs/`.

Confirm it in the DonWeb file manager before the first deploy. Getting it wrong uploads the site
into the parent of the web directory, where nothing serves it.

`ftp.ga-lo-pe.com` works as the host. It used to be a trap — the name lived only in DonWeb's
copy of the zone, which was not the live one — but the nameservers were delegated to DonWeb on
2026-11-11, so that zone is now authoritative and the name resolves to `200.58.111.133`
(checked 2026-11-12). The address works just as well and does not depend on the zone.

Create a **dedicated FTP user** for the deploy if the panel allows it, scoped to the web
directory. The credentials live only in GitHub Actions secrets, never in the repo
([ADR 0003](adr/0003-static-hosting-donweb-ftp.md)).

## What is not configured here

`PUBLIC_GTM_ID` is a literal in `deploy.yml`, not a secret or a variable. It is not a secret —
it ships in the HTML of every page — and as a repository variable a missing value would quietly
produce a site with no analytics, which is exactly the failure that is hardest to notice. The
workflow greps the build for the snippet so that a mistake is a red deploy instead
([ADR 0008](adr/0008-google-tag-manager.md)).

## The order of the first deploy

The HTTPS redirect in `public/.htaccess` is the trap: it has to arrive **after** the
certificate, or every visitor is sent to an HTTPS URL that no certificate covers and gets a
warning they cannot click past.

1. Point the domain at the hosting and wait for it to resolve ([dns-setup.md](dns-setup.md)).
2. Issue the Let's Encrypt certificate in the DonWeb panel.
3. Configure the secrets and the variable above.
4. Let the workflow run, or start it by hand from **Actions → Deploy → Run workflow**.

## How the upload works

`SamKirkland/FTP-Deploy-Action` keeps a `.ftp-deploy-sync-state.json` at the top of the server
directory listing what it last uploaded, and each run transfers only the difference. Two
consequences:

- The first deploy uploads everything and is slow. Later ones are seconds.
- Deleting that file on the server forces a full re-upload, which is the fix if the server and
  the repo ever drift apart.

The workflow uses `protocol: ftps`, so the session is encrypted. Never change it to `ftp`: that
sends the password in the clear.

Two deploys never run at once (`concurrency: deploy-production`) and a running one is never
cancelled, because an interrupted file-by-file sync leaves the site half updated.

## Rolling back

There are no atomic deploys. A rollback is a revert on `main`, which triggers a normal deploy:

```bash
git revert <commit>
```

## If something fails

| What you see                                  | Usually means                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `530 Login authentication failed`             | Wrong `FTP_USERNAME` or `FTP_PASSWORD`, or the user is not allowed to use FTPS   |
| `ECONNREFUSED` or a timeout                   | Wrong `FTP_SERVER`, or the host blocks FTPS from outside — ask DonWeb support    |
| The deploy succeeds but the site is unchanged | `FTP_SERVER_DIR` points outside the web directory                                |
| Every page redirects to a certificate error   | `.htaccess` was deployed before the certificate existed (see the order above)    |
| A page 404s but its file is on the server     | `mod_rewrite` is off on the account, so rule 4 in `.htaccess` never runs         |
| The site shows an old build                   | HTML got cached despite `no-cache`; check `mod_headers` and `mod_expires` are on |

## Still open

- Cloudflare Web Analytics on production only (phase 5). It is a script tag, so it needs no DNS.
- Whether `/admin` should be excluded from the Cloudflare Pages previews and shipped only here
  ([cms-auth-setup.md](cms-auth-setup.md)).
