# Security

## Scope

This describes the security posture of TrustCircle as built: a single-host application
with a local SQLite database, no external services, and no multi-tenant infrastructure.

**No independent security review has been performed.** The same person wrote the code
and the tests that check it. Treat everything below as a description of intent plus the
tests that back it, not as assurance.

## Assets, in order of sensitivity

1. **Submitted message content** — frequently contains someone's name, phone number, a
   payment amount, and the fact that they were targeted.
2. **Credentials that users paste by mistake** — OTPs, PINs, card numbers, Aadhaar, PAN.
3. **Recovery case evidence** — transaction references, screenshots of bank apps.
4. **Account credentials and sessions.**
5. **Social graph** — who is in a circle with whom.

## Threat model

| Adversary | Goal | Controls |
|---|---|---|
| Another user of the instance | Read someone else's cases or history | Every read goes through `lib/authz.ts`; ownership or an unrevoked grant, in SQL. 40+ cross-user tests. |
| A former circle member | Keep access after removal or leaving | `revokeGrantsWithoutSharedCircle()` runs on every membership change, both directions. Re-joining does not restore access. |
| A reviewer given findings-only access | Obtain the message text | Scope is enforced at the query: `content: null` and excerpts stripped server-side. The data is never sent. |
| Someone with an invitation link | Join a circle they were not invited to | 256-bit token, stored only as SHA-256, 7-day expiry, revocable, single use, validated server-side. |
| Someone who steals the database file | Read message content | AES-256-GCM at rest; the key is in an env var, not the database. Credentials were removed before encryption, so they are not in the ciphertext either. |
| Someone who steals the database file | Replay a session or an invitation | Only hashes of session tokens and invitation tokens are stored. |
| An attacker submitting hostile content | XSS, injection, SSRF, command execution | Content is rendered through React text nodes only — no `dangerouslySetInnerHTML` anywhere. All SQL is parameterised. No submitted URL is ever fetched. |
| An attacker uploading a hostile file | Serve executable content, traverse paths | Magic-byte sniffing (declared type ignored), 4 MB cap, BLOB storage with no filesystem path, served as an attachment with `nosniff` and `default-src 'none'; sandbox`. |
| An attacker embedding instructions in content | Make the app report content as safe | Content is only ever matched against regexes. There is no model and no instruction-following path. Tested with four injection styles. |
| Credential stuffing / brute force | Account takeover | scrypt at the OWASP profile; rate limits per IP and per account; identical timing and identical error for unknown vs wrong password. |
| CSRF | Act as a signed-in user | Server Actions carry Next's origin check; `SameSite=Lax` cookies. |

## Controls as implemented

### Authentication
- scrypt, N=2^17, r=8, p=1, 32-byte key, 16-byte random salt, `maxmem` 256 MB. The
  stored hash encodes its own parameters, so they can be raised later without
  invalidating existing hashes. (Argon2id was the stated target; it needs a native
  module. See ARCHITECTURE.md.)
- Unknown accounts spend a comparable amount of time in a dummy verification, so timing
  does not distinguish them, and the error text is identical.
- A 256-bit recovery code is generated once and stored only as SHA-256.
- Session cookie: 256-bit token, `httpOnly`, `SameSite=Lax`, `Secure` in production,
  30-day expiry, rolling last-seen. **The primary key of the `session` row is the
  SHA-256 of the token**; the token is never stored.
- Revocation: individual session, all other sessions, and automatically on password
  change.

### Authorisation
- One module (`lib/authz.ts`), one rule: ownership or an explicit unrevoked grant,
  evaluated in SQL on the server.
- Authorisation decides *what* is returned, not just *whether* — scope-limited grants
  return `content: null` with excerpts removed.
- Circle membership authorises nothing on its own.
- Ownership is part of the `WHERE` clause on destructive operations, so an id alone is
  never authority.
- A missing resource and an unauthorised one return the same answer.

### Input handling
- Zod at every Server Action boundary; length caps on every text field.
- Content length capped at 20,000 characters; URL analysis capped at 12 URLs per scan.
- Uploads: 8 MB images (browser-side), 4 MB attachments (server-side), 25-megapixel
  image cap against decompression bombs, magic-byte sniffing, markup rejected from the
  text path.
- Filenames sanitised; stored as metadata only, never used as a path.

### Data protection
- AES-256-GCM for message content and finding excerpts. Tampering fails closed (tested).
- Credential redaction runs **before** persistence, so OTPs, PINs, CVVs, card numbers,
  Aadhaar and PAN are not in the database in any form, encrypted or otherwise (tested
  against the ciphertext, not just the API).
- Images are never uploaded.
- The audit log records actions and short labels, never content (tested).
- Account deletion is a hard `DELETE` with cascades across 20+ tables (tested).

### Transport and headers
`Content-Security-Policy` with no remote origins at all (`default-src 'self'`,
`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`), plus `nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and a `Permissions-Policy`
that denies microphone and geolocation.

`'unsafe-inline'` is present for scripts because Next's App Router inlines bootstrap
and RSC payload scripts; removing it requires nonce-based CSP, which is listed as
deferred work in ROADMAP.md.

## Residual risks — NOT mitigated

1. **Host compromise defeats at-rest encryption.** The key is an env var on the same
   machine. Mitigation would be a KMS or an operator-supplied passphrase; neither is built.
2. **No MFA.** Password plus cookie is the whole of it.
3. **No account lockout.** Rate limiting slows an attacker; it does not lock an account,
   because that is a denial-of-service lever against the victim.
4. **Rate limiting is weak behind a proxy.** It trusts `x-forwarded-for` when present.
   Behind an untrusted proxy, or from an IPv6 range, it is evadable. A real deployment
   needs the proxy to set a trustworthy header and the limiter to be told which hops to trust.
5. **No malware scanning of attachments.** A hostile PDF or image is stored as-is. It is
   served with `nosniff`, `Content-Disposition: attachment` and a sandboxing CSP, so it
   cannot execute in this origin — but it is still delivered to whoever downloads it.
6. **No protection against a malicious instance operator.** They control the key, the
   database and the code.
7. **`'unsafe-inline'` in the script CSP.** See above.
8. **No audit-log integrity.** The log is an ordinary table; an attacker with database
   write access can edit it.
9. **No brute-force protection on the recovery code** beyond the general login limiter,
   because no recovery flow is wired up yet.
10. **Dependency supply chain.** `npm audit --omit=dev` reports zero vulnerabilities;
    `postcss` and `sharp` are pinned forward through `overrides`. Including dev
    dependencies, five high advisories remain, all `braces@3.0.3` reached through
    `eslint-config-next`. It runs at lint time against this repository's own file
    paths, is absent from the production bundle, and 3.0.3 is the latest published
    version — there is no upgrade that clears it. There is also no lockfile
    attestation, no SBOM and no automated dependency monitoring.
11. **Single-instance assumptions.** The rate limiter and the database are per-host.
    Horizontal scaling would need both replaced.

## Reporting a vulnerability

The highest-value findings are: one account reading another's cases; revoked access
still working; a credential reaching storage unredacted; an attachment being served to
someone without a grant. Report against the repository named in the README, with steps
to reproduce — and without anyone's real message content.
