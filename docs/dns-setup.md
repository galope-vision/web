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

## 1. Add the domain to the hosting, in DonWeb

In the DonWeb panel, open the hosting plan → **Dominios** → add `ga-lo-pe.com`.

This goes **first**. Apache needs the domain mapped to a directory before any traffic arrives;
if the DNS lands before the mapping exists, the server answers with another site on the same
machine or with an error.

In the same screen, or under **Datos del servicio**, copy the **IP of the hosting**. Step 3
needs it.

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
| edit        | `A`     | `@`              | the DonWeb hosting IP                 | 600 |
| leave as is | `CNAME` | `www`            | `ga-lo-pe.com`                        | —   |
| leave as is | `CNAME` | `_domainconnect` | `_domainconnect.gd.domaincontrol.com` | —   |
| leave as is | `TXT`   | `_dmarc`         | the DMARC policy GoDaddy set up       | —   |

There is only **one** `A` record to change, even though the domain resolves to two addresses
from outside: both come from the single Website Builder record of step 2.

`www` already points at the apex, so it follows along by itself. A TTL of 600 keeps later
corrections cheap. The `NS` and `SOA` rows cannot be edited from this panel, which is correct —
nothing here should touch them.

Write the IP down here once it is known, so the next person does not have to go and find it:

```
A @ → <DONWEB_IP>   (set on <date>)
```

## 4. Issue the certificate, in DonWeb

Once the `A` record has propagated, enable **SSL (Let's Encrypt)** in the DonWeb panel. It
validates over HTTP on port 80, so it only works after step 3 is live.

## 5. Check it

```bash
dig +short A ga-lo-pe.com @8.8.8.8
dig +short A www.ga-lo-pe.com @8.8.8.8
curl -sS -o /dev/null -w "%{http_code} %{remote_ip}\n" https://ga-lo-pe.com/
```

The first two have to answer the DonWeb IP and nothing else. The third has to answer without a
certificate warning.

## The order matters

`public/.htaccess` forces HTTPS. **Do not deploy it before the certificate exists** or the site
redirects to an HTTPS URL that no certificate covers, and every visitor gets a warning they
cannot click past. The order is: `A` record → certificate in DonWeb → `.htaccess`.

## If something fails

| What you see                                    | Usually means                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| The GoDaddy page comes back after a few minutes | The Website Builder site is still attached and rewrote the `A` record (step 2) |
| Another site, or a DonWeb error page            | The domain is not mapped to the hosting account yet (step 1)                   |
| `dig` still answers the old IP                  | The old TTL has not expired; it was 3600, so wait the hour                     |
| The certificate cannot be issued                | The `A` record has not propagated, or `.htaccess` is already forcing HTTPS     |
| The site works but `www` does not               | The `CNAME` for `www` was deleted instead of being left alone                  |

## Still open

- The DonWeb hosting IP, and the date the `A` record was changed (step 3).
- `ALLOWED_DOMAINS` on the authenticator Worker and the OAuth App's homepage URL, which both
  want the domain now that it is known — see
  [cms-auth-setup.md](cms-auth-setup.md).
- The deploy itself: `.github/workflows/deploy.yml` and `public/.htaccess` do not exist yet, so
  until they do the domain resolves to an empty hosting account.
