# The production deploy to DonWeb

Phase 6, the hosting half. `.github/workflows/deploy.yml` builds the site and uploads `dist/` to
the DonWeb account over FTPS on every push to `main`, following
[ADR 0003](adr/0003-static-hosting-donweb-ftp.md). The DNS half is in
[dns-setup.md](dns-setup.md).

The FTP account belongs to Galope. Its credentials live only in GitHub Actions secrets.

## What the workflow does

1. Checks that the four settings below exist, and stops with a readable error if one is missing.
2. `npm ci`, `npm run check`, `npm run build`, with `PUBLIC_GTM_ID` set — this is the only build
   that carries the Google Tag Manager container ([ADR 0007](adr/0007-google-tag-manager.md)).
3. Checks the GTM snippet actually made it into `dist/index.html`, so a broken container ID
   fails the deploy instead of silently shipping a site with no analytics.
4. Uploads `dist/` over FTPS with `SamKirkland/FTP-Deploy-Action`.

The upload is incremental: the action keeps a `.ftp-deploy-sync-state.json` file on the server
and sends only what changed. Deleting that file forces a full re-upload.

Deploys never run in parallel and are never cancelled halfway, because an interrupted upload
leaves the server out of sync with that state file.

## What has to be configured, once

In **Settings → Secrets and variables → Actions** of the GitHub repository:

| Kind     | Name             | Value                                                  |
| -------- | ---------------- | ------------------------------------------------------ |
| Secret   | `FTP_SERVER`     | The FTP host Ferozo shows for the account (see below)  |
| Secret   | `FTP_USERNAME`   | The FTP user                                           |
| Secret   | `FTP_PASSWORD`   | Its password                                           |
| Variable | `FTP_SERVER_DIR` | `/httpdocs/` on this plan, **with the trailing slash** |

`FTP_SERVER_DIR` is a variable, not a secret: it is a path, not a credential, and the workflow
log is easier to read when it is visible. The workflow refuses to run if it does not end in `/`,
because the action would otherwise upload next to the directory instead of into it.

The three FTP values come from the Ferozo panel (<https://panel.ferozo.com>, its own user and
password, service `#6624915`): **FTP** → the account for `ga-lo-pe.com`. Ferozo shows the host
and the user there; the password can be reset from the same screen if nobody has it. The
directory the domain serves is shown next to the FTP account — on this plan it is the folder
mapped to the domain, not the FTP root, which also holds other folders: on this plan that is
**`/httpdocs/`**.

Do not guess the host as `ftp.ga-lo-pe.com`: that name does **not** resolve. It exists only in
DonWeb's inactive copy of the zone, so it is a plausible-looking value that fails at connection
time. Take the host from the panel, or use the account's address, `200.58.111.133`.

`PUBLIC_GTM_ID` is **not** configured here. It is written into `deploy.yml` as a literal,
because it is not a secret — it ships in the HTML of every page — and because a missing variable
would silently produce a site with no tag.

## The first run

Do it as a dry run, so a wrong directory cannot overwrite anything:

> **Actions → Deploy → Run workflow**, with **dry run** ticked.

The log lists every file it would upload. Check that the paths are the ones the domain serves,
then run it again with the tick off, or push to `main`.

## Order of operations, which matters

`public/.htaccess` forces HTTPS. **It must not reach the server before the Let's Encrypt
certificate is issued in DonWeb**, or every visitor gets a certificate warning they cannot click
past. The order is: `A` record → certificate → `.htaccess`. See the end of
[dns-setup.md](dns-setup.md).

The certificate is issued, and `public/.htaccess` arrives with the SEO work
([seo-setup.md](seo-setup.md)), so the order has been respected and deploying is safe.

## If something fails

| What you see                                     | Usually means                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `Missing deploy configuration: ...`              | One of the four settings above was never added                          |
| `530` or a login error                           | Wrong user or password, or the FTP account was reset in Ferozo          |
| The deploy is green but the site does not change | `FTP_SERVER_DIR` points at a directory the domain does not serve        |
| `PUBLIC_GTM_ID did not reach the build`          | The container ID in `deploy.yml` is malformed, or the component changed |
| Timeouts halfway through an upload               | Shared hosting throttling; re-run the workflow, the sync state resumes  |

## Still open

- The three secrets and the variable, which nobody has set yet.
- The certificate in DonWeb, and `public/.htaccess` after it.
- Rollback is "revert on `main` and let it redeploy": there are no atomic deploys and no
  instant rollback on this hosting (ADR 0003).
