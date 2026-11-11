# Pointing ga-lo-pe.com at the DonWeb hosting

Phase 6, the DNS half. This is what makes the production domain serve the site that GitHub
Actions uploads to DonWeb over FTPS ([ADR 0003](adr/0003-static-hosting-donweb-ftp.md)).

The domain is **ga-lo-pe.com**, registered by Galope at GoDaddy. The hosting is Galope's DonWeb
shared plan. Both accounts belong to Galope.

## The decision

**The nameservers are delegated to DonWeb** (`ns1.donweb.com`, `ns2.donweb.com`). The domain
stays registered at GoDaddy; only the DNS administration moves. See
[ADR 0007](adr/0007-nameservers-at-donweb.md) for the full reasoning.

### The decision this reverses

The first version of this document said the opposite: keep the zone at GoDaddy and move only
the apex `A` record. That was done on 2026-11-11 and worked — the domain resolved to
`200.58.111.133` within minutes. Then the certificate failed:

> Su certificado se intentó generar 11-11-26 03:15 y terminó con error **"Los NS no son los
> correctos"**.

DonWeb will not issue its free Let's Encrypt certificate unless the nameservers are theirs. The
argument for keeping the zone at GoDaddy was that nothing needed DonWeb's DNS; that was wrong,
and the delegation followed the same day.

This is written down rather than quietly edited away, because the next person will be tempted
by the same reasoning: keeping DNS at the registrar really is tidier, and it really does not
work here.

### What it costs

- A delegation propagates more slowly than a record: the registry `NS` TTL is 172800, so up to
  48 hours, against the hour an `A` record takes.
- DNS changes now happen in the DonWeb panel. Anyone who goes looking in GoDaddy will find a
  zone that does nothing.
- If the hosting ever leaves DonWeb, the nameservers move with it.

There was no downtime: DonWeb's zone already answered with the same address the GoDaddy zone
did, so the switch was invisible to visitors.

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

## 2. Delegate the nameservers, in GoDaddy

**Mis productos → ga-lo-pe.com → DNS → Servidores de nombres → Cambiar servidores de nombres**,
then _Usaré mi propio servidor de nombres_:

```
ns1.donweb.com
ns2.donweb.com
```

GoDaddy asks twice: a checkbox acknowledging that DNS administration moves, and a final
_Continuar_. It warns that existing DNS records are not copied and that connected services may
stop working. That warning is real in general, but did not apply here: DonWeb's zone already
carried the same address, plus `www`, the mail records and its own `DMARC`. Confirm the same
before delegating any other domain — ask the panel's **Ver Zona DNS** (step 1) what the target
nameservers will actually serve.

`ns3.hostmar.com` and `ns4.hostmar.com` answer for this account too; `ns1`/`ns2.donweb.com` are
the pair DonWeb documents for shared hosting. Do not use `ns9`/`ns13.hostmar.com`, which are for
other panels and do not serve this zone.

Done on 2026-11-11. The registry takes a while to publish the change; until it does, the old
nameservers keep answering with the same address, so nothing breaks in between.

### What the GoDaddy zone had, and why it no longer matters

Before the delegation, the apex `A` record was changed at GoDaddy to `200.58.111.133` (TTL 1800) and resolved correctly. That record — and the `www` CNAME, the `_domainconnect` CNAME and
the `_dmarc` TXT — now live in a zone nobody queries. They are listed above as rollback
information and nothing more.

The same goes for the **GoDaddy Website Builder** site that used to own the apex `A` record.
It is in the unused zone, so it can no longer affect the site. Still worth checking whether it
is a paid subscription nobody needs.

## 3. Issue the certificate, in DonWeb

In the Ferozo panel (<https://panel.ferozo.com>, its own user and password) → **Dominios →
SSL** → _Generar Let's Encrypt_.

This only works once the registry has published the delegation of step 2. DonWeb checks the
nameservers before it even tries, and answers _"Los NS no son los correctos"_ if they are not
yet theirs. It retries on its own, but the attempts are limited — if they run out, request it
again rather than waiting.

## 4. Check it

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

## If something fails

| What you see                                             | Usually means                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| The certificate fails with "Los NS no son los correctos" | The registry has not published the delegation yet (step 2); wait and request it again |
| Another site, or a DonWeb error page                     | The domain is not mapped to the hosting account yet (step 1)                          |
| `dig` still answers the old IP                           | The registry `NS` TTL is 172800, so a delegation can take up to 48 hours              |
| The certificate cannot be issued                         | The `A` record has not propagated, or `.htaccess` is already forcing HTTPS            |
| The site works but `www` does not                        | DonWeb's zone lost its `www` CNAME; add it back in **Ver Zona DNS**                   |

## Still open

- The certificate (step 3). Until it exists, `https://ga-lo-pe.com` fails with a name mismatch,
  and `public/.htaccess` must not be deployed.
- Whether Galope wants mail at the domain. Now that the zone is DonWeb's, this is configured
  in their panel with no DNS work — the records are already there.
- Whether the GoDaddy Website Builder site is a paid subscription worth cancelling. It can no
  longer affect the site, but it may still be billing.
- `ALLOWED_DOMAINS` on the authenticator Worker and the OAuth App's homepage URL, which both
  want the domain now that it is known — see
  [cms-auth-setup.md](cms-auth-setup.md).
- The deploy itself: `.github/workflows/deploy.yml` and `public/.htaccess` do not exist yet, so
  until they do the domain resolves to an empty hosting account.
