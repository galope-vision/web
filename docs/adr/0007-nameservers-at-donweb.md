# 0007 · The nameservers go to DonWeb

- Status: Accepted
- Date: 2026-11-11
- Supersedes the DNS part of [ADR 0003](0003-static-hosting-donweb-ftp.md)

## Context

The domain `ga-lo-pe.com` is registered at GoDaddy and the site is hosted at DonWeb.
[ADR 0003](0003-static-hosting-donweb-ftp.md) assumed the DNS zone would stay at GoDaddy, and
`docs/dns-setup.md` was written on that assumption: only the apex `A` record would move to the
DonWeb address, and the nameservers would stay `ns63`/`ns64.domaincontrol.com`.

That was done on 2026-11-11. The domain resolved to `200.58.111.133` and answered over HTTP
within minutes.

Then the free Let's Encrypt certificate failed to issue, in the Ferozo panel:

> Su certificado se intentó generar 11-11-26 03:15 y terminó con error **"Los NS no son los
> correctos"**. Se reintentará luego de 30 minutos, restan 1 intentos más.

**DonWeb will not issue the free certificate unless the domain's nameservers are theirs.** This
is their own precondition, not a requirement of ACME — HTTP-01 validation only needs the domain
to answer on port 80, which it already did. But the check is theirs and there is no way around
it from our side.

The reasoning behind the original decision was that nothing needed DonWeb's DNS. That turned out
to be false twice over: the free certificate needs it, and so does the mail the plan includes.

## Decision

Delegate the nameservers to DonWeb:

```
ns1.donweb.com
ns2.donweb.com
```

The registration stays at GoDaddy. Only the DNS administration moves.

## Reasons

- It is the only way to get the free certificate. The alternatives were a paid certificate
  (the budget is zero) or installing and renewing a certificate by hand every 90 days, which
  is not something to hand a client who has no developer.
- DonWeb's zone already carries the full mail setup for the plan — `MX`, `SPF`, `DKIM`, `DMARC`
  and the `SRV` records for IMAP, POP3 and submission. Keeping the zone at GoDaddy meant
  copying all of that by hand the day Galope wanted an address at the domain.
- Nothing else in the stack needs the zone. Cloudflare Pages previews are on `*.pages.dev`, the
  CMS authenticator is on `*.workers.dev`, and Cloudflare Web Analytics is a script tag.
- The handover is simpler: hosting, mail and DNS in one panel, registration in another, instead
  of hosting and mail in one and DNS split across two.

Before changing anything, all four candidate nameservers were queried directly and confirmed to
already answer authoritatively for the domain with the correct address:

```
ns1.donweb.com    200.58.111.133   aa
ns2.donweb.com    200.58.111.133   aa
ns3.hostmar.com   200.58.111.133   aa
ns4.hostmar.com   200.58.111.133   aa
```

`ns1`/`ns2.donweb.com` are the pair DonWeb's documentation gives for shared hosting. Because the
DonWeb zone already resolved to the same address the GoDaddy zone did, the delegation carried no
downtime.

## Consequences

- The GoDaddy zone stops being used. The apex `A` record set earlier that day, the `www` CNAME,
  the `_domainconnect` CNAME and the `_dmarc` TXT are all inert — DonWeb's zone has its own
  equivalents. They are kept in `docs/dns-setup.md` as rollback information.
- The GoDaddy Website Builder attachment stops mattering, since its record is in the unused zone.
- DNS changes are now made in the DonWeb panel, not GoDaddy. Anyone looking for them in the
  wrong panel will find a zone that does nothing.
- Mail at the domain now works by configuring it in DonWeb, with no DNS work.
- A delegation propagates more slowly than a record: the registry `NS` TTL is 172800, so up to
  48 hours, against the hour an `A` record takes.
- If the hosting ever leaves DonWeb, the nameservers have to move with it, where before only one
  record would have changed.

## What this supersedes

[ADR 0003](0003-static-hosting-donweb-ftp.md) says "The domain's DNS stays at GoDaddy" and
`docs/spec.md` § 3 said "DNS | GoDaddy | No se mueve". Both are wrong as of this ADR and have
been corrected to point here.
