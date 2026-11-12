# Pointing ga-lo-pe.com at the DonWeb hosting

Phase 6, the DNS half. This is what makes the production domain serve the site that GitHub
Actions uploads to DonWeb over FTPS ([ADR 0003](adr/0003-static-hosting-donweb-ftp.md)).

The domain is **ga-lo-pe.com**, registered by Galope at GoDaddy. The hosting is Galope's DonWeb
shared plan. Both accounts belong to Galope.

## The decision

**The DNS zone stays at GoDaddy.** Only the `A` record of the apex changes, from GoDaddy's
parking to the DonWeb server. The nameservers are not delegated to DonWeb.

This is what [ADR 0003](adr/0003-static-hosting-donweb-ftp.md) already assumed, and the state of
the zone backs it up:

- **There is no email on the domain.** No `MX` and no `SPF`. Delegating the nameservers to
  DonWeb mainly buys automatic mail and `SPF`/`DKIM` configuration, and there is none to
  configure. The one real argument for delegating does not apply.
- **Keeping the zone preserves the `_dmarc` record** that GoDaddy set up. It does nothing while
  there is no mail, but re-creating it by hand after a delegation is one more thing to forget.
- **An `A` record propagates in an hour, a delegation in two days.** The `A` record's TTL is
  3600; the registry's `NS` delegation TTL is 172800.
- Nothing is closed off. If Galope later wants mail at DonWeb, the `MX` records go into the
  GoDaddy zone just as easily.

The cost of the choice: on shared hosting DonWeb can migrate the account to another server and
change its IP, and the site then stays down until the `A` record is updated by hand. DonWeb
announces those migrations. The IP is recorded in step 3 for exactly that reason.

## How the zone looked before any change

Read on 2026-11-11 from the GoDaddy DNS panel, before touching anything. This is the rollback
information. Seven records:

| Record  | Name             | Value                                                                               |
| ------- | ---------------- | ----------------------------------------------------------------------------------- |
| `A`     | `@`              | **WebsiteBuilder Site** — not an address, see below                                 |
| `NS`    | `@`              | `ns63.domaincontrol.com`, `ns64.domaincontrol.com`                                  |
| `CNAME` | `www`            | `ga-lo-pe.com`                                                                      |
| `CNAME` | `_domainconnect` | `_domainconnect.gd.domaincontrol.com`                                               |
| `SOA`   | `@`              | `ns63.domaincontrol.com`                                                            |
| `TXT`   | `_dmarc`         | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` |
| `MX`    | `@`              | none                                                                                |

From outside, the apex resolves to `13.248.243.5` and `76.223.105.230`, GoDaddy's own addresses
on AWS Global Accelerator. The panel shows no address at all, because the record is held by a
**GoDaddy Website Builder site** attached to the domain. That is what step 2 undoes, and it is
why editing the record may warn that the Website Builder site will be disconnected.

Two things worth knowing, both learned the hard way:

- `dig TXT ga-lo-pe.com` answers nothing, yet there is a `TXT` record: `_dmarc` hangs off a
  subdomain, so an apex query misses it. Read the panel rather than trusting a handful of `dig`
  calls to have found everything.
- `_domainconnect` is GoDaddy's own mechanism for letting a provider configure the zone. Leave
  it alone.

## 1. Add the domain to the hosting, in DonWeb — already done

Checked on 2026-11-11: `ga-lo-pe.com` is already attached to the hosting plan, tagged
**DNS EXTERNO**. Nothing to do here. The path, for when it has to be found again:

> **Mi cuenta** (<https://micuenta.donweb.com>) → Mis servicios → **Web Hosting** → _Gestionar_
> → **Dominios configurados**

The plan is **Web Hosting Plan Full**, Linux, service `#6624915`, on the **Ferozo** panel
(<https://panel.ferozo.com>, its own user and password).

That screen shows the domain in red: _"El dominio tiene asignados NS de otro proveedor"_.
**That warning is expected and is not a problem.** It is DonWeb noticing that the nameservers
are GoDaddy's, which is the whole point of the decision above. It goes away only if the
nameservers are delegated, which is what we chose not to do.

This step matters because Apache needs the domain mapped to a directory before any traffic
arrives; if the DNS lands before the mapping exists, the server answers with another site on
the same machine or with an error.

### Where the IP comes from

Same screen → **Ver Zona DNS** next to the domain. That view is the zone DonWeb _would_ serve
if the nameservers pointed here. It does not serve it today, but the addresses in it are the
real ones for this account:

| What        | Value               |
| ----------- | ------------------- |
| IPv4        | `200.58.111.133`    |
| IPv6        | `2800:6c0:2::a:21f` |
| Reverse DNS | `a021.dattaweb.com` |

Verified from outside: ports 80, 443 and 21 answer, and HTTP returns 200. DattaWeb is DonWeb's
former name, so the reverse record is the expected one.

### The mail records, for later

That same DonWeb zone carries a full mail setup for the plan — `MX` to `mail.ga-lo-pe.com` and
`mx1.ga-lo-pe.com`, `SPF`, `DKIM`, `DMARC`, and `SRV` records for IMAP, POP3 and submission.

**None of it is in effect**, because the live zone is GoDaddy's. Keeping the zone at GoDaddy
means that if Galope ever wants an address at the domain — `ajustes/general.yml` still has the
placeholder `hola@example.com` — those records have to be copied into GoDaddy by hand. That is
the real cost of this decision, and it is worth deciding before the site goes live rather than
after.

## 2. Disconnect the Website Builder site, in GoDaddy

The apex `A` record is not a plain record: it belongs to a **GoDaddy Website Builder** site
attached to the domain, which is why the panel shows `WebsiteBuilder Site` where an address
would go. While that attachment is live, GoDaddy owns the record and can write it back,
reverting step 3.

In **Mis productos**, find the Website Builder product on `ga-lo-pe.com` and disconnect the
domain from it. If editing the record in step 3 offers to disconnect the site for you, that
does the same job.

Check first whether that Website Builder site is a paid subscription. Disconnecting the domain
does not cancel it, and nobody wants to keep paying for a site that is no longer reachable.

## 3. Change the `A` record, in GoDaddy

**My Products → ga-lo-pe.com → DNS → Records**:

| Action      | Type    | Name             | Value                                 | TTL |
| ----------- | ------- | ---------------- | ------------------------------------- | --- |
| edit        | `A`     | `@`              | `200.58.111.133`                      | 600 |
| leave as is | `CNAME` | `www`            | `ga-lo-pe.com`                        | —   |
| leave as is | `CNAME` | `_domainconnect` | `_domainconnect.gd.domaincontrol.com` | —   |
| leave as is | `TXT`   | `_dmarc`         | the DMARC policy GoDaddy set up       | —   |

Optionally also add `AAAA @ → 2800:6c0:2::a:21f`, so the site answers over IPv6. It is not
required, and leaving it out changes nothing for visitors on IPv4.

There is only **one** `A` record to change, even though the domain resolves to two addresses
from outside: both come from the single Website Builder record of step 2.

`www` already points at the apex, so it follows along by itself. A TTL of 600 keeps later
corrections cheap. The `NS` and `SOA` rows cannot be edited from this panel, which is correct —
nothing here should touch them.

Record the change here when it is made, so the next person does not have to reconstruct it:

```
A @ → 200.58.111.133   TTL 1800   (set on 2026-11-11)
```

Done on 2026-11-11. Both authoritative servers, Google and Cloudflare answered the new address
within minutes, and `www` followed through its `CNAME`. The `_dmarc` record survived the edit,
and GoDaddy raised no warning about the Website Builder site — so whether that attachment is
really gone is still worth checking, since it is the one thing that could rewrite the record
later.

## 4. Issue the certificate, in DonWeb

Once the `A` record has propagated, enable **SSL (Let's Encrypt)** in the DonWeb panel. It
validates over HTTP on port 80, so it only works after step 3 is live.

Done. Checked on 2026-11-12: `https://ga-lo-pe.com` and `https://www.ga-lo-pe.com` both answer
200 with no certificate warning, so the certificate covers the apex and `www`. That is what
unblocks `public/.htaccess` below.

## 5. Check it

```bash
dig +short A ga-lo-pe.com @8.8.8.8
dig +short A www.ga-lo-pe.com @8.8.8.8
curl -sS -o /dev/null -w "%{http_code} %{remote_ip}\n" https://ga-lo-pe.com/
```

The first two have to answer the DonWeb IP and nothing else. The third has to answer without a
certificate warning.

State on 2026-11-11, after step 3 and before step 4: the first two answer `200.58.111.133`,
`http://ga-lo-pe.com` returns 200 from that address with an empty page — the hosting account
has nothing in it yet — and `https://` fails with
`no alternative certificate subject name matches target host name`, which is step 4's job.

## The order matters

`public/.htaccess` forces HTTPS. **Do not deploy it before the certificate exists** or the site
redirects to an HTTPS URL that no certificate covers, and every visitor gets a warning they
cannot click past. The order is: `A` record → certificate in DonWeb → `.htaccess`.

All three are done: the certificate was issued (step 4) and `public/.htaccess` exists since the
SEO work, which also makes it redirect `www` to the apex ([seo-setup.md](seo-setup.md)).

## If something fails

| What you see                                    | Usually means                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| The GoDaddy page comes back after a few minutes | The Website Builder site is still attached and rewrote the `A` record (step 2) |
| Another site, or a DonWeb error page            | The domain is not mapped to the hosting account yet (step 1)                   |
| `dig` still answers the old IP                  | The old TTL has not expired; it was 3600, so wait the hour                     |
| The certificate cannot be issued                | The `A` record has not propagated, or `.htaccess` is already forcing HTTPS     |
| The site works but `www` does not               | The `CNAME` for `www` was deleted instead of being left alone                  |

## Still open

- Whether Galope wants mail at the domain. If they do, the DonWeb mail records have to be
  copied into the GoDaddy zone by hand — see the end of step 1.
- Whether the GoDaddy Website Builder site is a paid subscription worth cancelling (step 2).
- `ALLOWED_DOMAINS` on the authenticator Worker and the OAuth App's homepage URL, which both
  want the domain now that it is known — see
  [cms-auth-setup.md](cms-auth-setup.md).
- The deploy itself: `.github/workflows/deploy.yml` does not exist on `main` yet, so every
  upload so far has been made by hand. `public/.htaccess` now exists.
