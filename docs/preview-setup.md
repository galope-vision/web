# Previews on Cloudflare Pages

Phase 5. Every pull request and every CMS draft gets its own URL, so a change can be seen before
it reaches production ([ADR 0002](adr/0002-cloudflare-pages-previews.md)). The files are built and
uploaded by `.github/workflows/preview.yml` ([ADR 0009](adr/0009-previews-by-direct-upload.md)).

Production is unaffected: it stays on DonWeb and is deployed by `deploy.yml`
([deploy-setup.md](deploy-setup.md)).

## 1. Create the Pages project — in Cloudflare

In Galope's Cloudflare account, the same one that runs the CMS authenticator Worker
([cms-auth-setup.md](cms-auth-setup.md)):

1. **Workers & Pages → Create → Pages → Upload assets**. This creates a **Direct Upload** project.
   Do not use "Connect to Git": the build belongs in this repository, not in the dashboard.
2. Name it **`galope-web`**. The name is in the workflow's `--project-name`, so changing one means
   changing the other.
3. Upload anything to finish creating it — an empty folder with a single `index.html` is enough.
   The first real deployment overwrites it.
4. In **Settings → Builds & deployments**, leave the production branch as `main`. The workflow
   never runs on `main`, so it never produces a production deployment.

## 2. Create the API token — in Cloudflare

**My Profile → API Tokens → Create Token → Custom token**:

| Field       | Value                                             |
| ----------- | ------------------------------------------------- |
| Permissions | **Account · Cloudflare Pages · Edit**             |
| Resources   | **Include · the Galope account**, nothing broader |

Copy the token once; Cloudflare does not show it again. The account ID is on the right of any
page of the account's dashboard.

## 3. Add the two secrets — in GitHub

`galope-vision/web` → **Settings → Secrets and variables → Actions**. This needs **admin on the
repository**, so it is Galope's to do.

| Name                    | Value                           |
| ----------------------- | ------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | the token from step 2           |
| `CLOUDFLARE_ACCOUNT_ID` | the account ID from the sidebar |

Until both exist, the workflow runs on every pull request, skips every step and leaves a notice
saying why. It does not fail, so it puts no red check on anything, and it is safe to merge the
workflow before the secrets are in.

## 4. Check it works

Open any pull request. Within about a minute a comment appears on it:

> **Preview:** https://&lt;hash&gt;.galope-web.pages.dev

Then check that `curl -sI <url> | grep -i x-robots-tag` answers `noindex`.

## What the URLs look like

| URL                             | What it is                                      |
| ------------------------------- | ----------------------------------------------- |
| `<hash>.galope-web.pages.dev`   | one deployment, pinned to a commit, never moves |
| `<branch>.galope-web.pages.dev` | the latest deployment of that branch            |
| `galope-web.pages.dev`          | the latest deployment of the production branch  |

The branch alias slugifies the branch name, so `cms/proyectos/mi-video` becomes
`cms-proyectos-mi-video.galope-web.pages.dev`.

## A domain of its own, if you want one

The nameservers are DonWeb's ([ADR 0007](adr/0007-nameservers-at-donweb.md)), so a subdomain like
`beta.ga-lo-pe.com` is a `CNAME` to `galope-web.pages.dev` in the DonWeb DNS panel, plus **Custom
domains → Set up a custom domain** on the Pages project. Cloudflare issues the certificate. It is
not needed for previews to work and nothing in this repository depends on it.

## Two things previews do not do like production

- **Apache rules do not apply.** `public/.htaccess` is what gives production its clean URLs and
  its redirects ([deploy-setup.md](deploy-setup.md)); Cloudflare Pages has its own handling, so a
  trailing slash may behave differently. Previews are for reviewing design and content, not URL
  shapes.
- **Canonical links point at production.** The build sets `site` to `https://ga-lo-pe.com`, so a
  preview's `canonical` and `hreflang` name the real domain. With `noindex` on every response
  that is harmless, and it keeps one `site` value for every environment.

## The CMS on a preview

`/admin` is built into every preview, but signing in only works from a hostname listed in the
Worker's `ALLOWED_DOMAINS`. Put the stable aliases there — `ga-lo-pe.com` and
`galope-web.pages.dev` — and not a wildcard: `*.pages.dev` would let any Pages site in the world
use Galope's authenticator. Per-pull-request URLs are therefore for looking, not for signing in.
