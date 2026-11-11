# CMS sign-in: Cloudflare Worker + GitHub OAuth App

Phase 1, step 4. This is what lets Galope open `/admin` and sign in with a GitHub button,
instead of creating and pasting a personal access token.

Sveltia CMS runs entirely in the browser, so it can't keep an OAuth client secret. A tiny
Cloudflare Worker ([`sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth)) holds the
secret and exchanges the GitHub authorization code for an access token. The token goes to the
editor's browser and never touches the repo.

Everything here is created **in Galope's accounts**: the Cloudflare account and the GitHub
account that owns `galope-vision/web`. Both stay on their free tiers.

## How it ended up

Set up on 2026-11-11, in Galope's accounts:

| Piece      | Where                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| Worker     | Cloudflare (`Galope.admin@gmail.com`) → `sveltia-cms-auth` → <https://sveltia-cms-auth.galope-admin.workers.dev> |
| Its source | `galope-vision/sveltia-cms-auth`, private, redeployed on every push to `main`                                    |
| OAuth App  | `galope-vision` → Settings → Developer settings → **GALOPE CMS**, callback at `<worker>/callback`                |
| `base_url` | already in [`public/admin/config.yml`](../public/admin/config.yml)                                               |

What is still missing: `GITHUB_CLIENT_SECRET` on the Worker, and `ALLOWED_DOMAINS` once the
domain is decided. The steps below are the ones to follow again if any of it has to be redone.

## Before you start

- Sign in to GitHub as **galope-vision** (the account that owns the repo).
- Have a Cloudflare account for Galope, or create one.
- Whoever signs in to the CMS later needs write access to `galope-vision/web`.

## 1. Deploy the Worker

Use the **Deploy to Cloudflare Workers** button in the
[`sveltia-cms-auth` README](https://github.com/sveltia/sveltia-cms-auth), which forks the
project and deploys it, or clone the repo and run `wrangler deploy`.

When it finishes, the Cloudflare dashboard shows the worker URL under the `sveltia-cms-auth`
service:

```
https://sveltia-cms-auth.<subdomain>.workers.dev
```

Copy it. Steps 2, 3 and 4 all need it.

## 2. Register the OAuth App on GitHub

As **galope-vision**, open <https://github.com/settings/applications/new> and fill in:

| Field                      | Value                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------- |
| Application name           | `GALOPE CMS`                                                                       |
| Homepage URL               | the site's URL, or `https://github.com/galope-vision/web` while the domain is open |
| Authorization callback URL | `<WORKER_URL>/callback`                                                            |

The callback URL points at the **Worker**, not at the site. This is the single most common
mistake; with a wrong callback, signing in fails or lands on Netlify's authenticator.

Then press **Generate a new client secret** and keep the page open: you need the **Client ID**
and the **Client Secret** for the next step, and GitHub shows the secret only once.

## 3. Give the Worker its variables

In the Cloudflare dashboard, open the `sveltia-cms-auth` worker, then **Settings → Variables**,
and add:

| Variable               | Value                                             |
| ---------------------- | ------------------------------------------------- |
| `GITHUB_CLIENT_ID`     | the Client ID from step 2                         |
| `GITHUB_CLIENT_SECRET` | the Client Secret from step 2 — press **Encrypt** |
| `ALLOWED_DOMAINS`      | the hostnames allowed to use the Worker (below)   |

`ALLOWED_DOMAINS` is a comma-separated list, and the Worker only hands a token to a page served
from one of those hostnames. It stops other sites from spending Galope's Worker quota and from
getting tokens through it, so fill it in:

- the final domain, once it's decided, as `galope.com, *.galope.com` (the naked domain and its
  subdomains are two separate entries);
- the Cloudflare Pages project, if you want to sign in from a preview: `<project>.pages.dev,
*.<project>.pages.dev`. Never `*.pages.dev` on its own, which would be every site on
  Cloudflare Pages.

Save and deploy.

## 4. Point the CMS at the Worker

In [`public/admin/config.yml`](../public/admin/config.yml), uncomment `base_url` under `backend`
and put the Worker URL in it:

```yaml
backend:
  name: github
  repo: galope-vision/web
  branch: main
  base_url: https://sveltia-cms-auth.<subdomain>.workers.dev
```

The Worker URL is not a secret: it's public in the config, like the repo name. The client secret
stays in Cloudflare.

Open a PR with that change, as with everything else.

## 5. Check it works

1. Open `/admin` on the deployed site and press **Sign in with GitHub**.
2. GitHub asks to authorize `GALOPE CMS` the first time.
3. The CMS opens with the Proyectos and Ajustes collections.
4. Save a test project. A `cms/proyectos/<slug>` branch and its pull request appear in the repo.

While working locally, keep using **Sign in with an access token** or **Work with a local
repository**: the Worker only serves the hostnames in `ALLOWED_DOMAINS`.

## Repository setting

Publishing from the CMS merges the entry's pull request. When CI is still running, the CMS turns
on auto-merge and waits for it, so **Settings → General → Allow auto-merge** has to be enabled
on `galope-vision/web`. Without it, publishing fails while the check runs and has to be retried.

## If the build fails

The Cloudflare build of the authenticator failed twice before it went through, both times over
the toolchain rather than the code. The fixes live in `galope-vision/sveltia-cms-auth` and would
have to be made again if that repository is re-created from the original:

| What the log says                                                                        | What fixes it                                                                                                                                                              |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` while installing                                     | Delete `pnpm-lock.yaml`: it is out of sync with the `overrides` in `package.json`, and without it the build image installs from `package.json`                             |
| `No preset version installed for command pnpm` while running the build or deploy command | Pin `.nvmrc` to `24.22.1`. Only the Node versions the image presets (22.23.4 and 24.22.1) carry the `pnpm` shim, so any other version leaves the deploy command without it |

Leave the **Build command** empty: the image installs the dependencies on its own, and a build
command of your own runs into the same `pnpm` shim problem.

## If something fails

| What you see                                                         | Usually means                                                   |
| -------------------------------------------------------------------- | --------------------------------------------------------------- |
| Sign-in redirects to a Netlify page                                  | `base_url` is missing or misspelled in `config.yml`             |
| "The redirect URI is not associated with this application"           | the callback URL in the OAuth App isn't `<WORKER_URL>/callback` |
| Sign-in returns to `/admin` with no session                          | the site's hostname isn't in `ALLOWED_DOMAINS`                  |
| Saving fails with "Resource not accessible by personal access token" | a token sign-in without the Pull requests permission            |
| The editor can read but not save                                     | the GitHub account has no write access to the repo              |

## Still open

- The final domain, which `ALLOWED_DOMAINS` and the OAuth App's homepage URL both want.
- Whether `/admin` is published on the Cloudflare Pages previews at all, or only on production
  (phase 5).
