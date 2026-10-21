# Deployment

## Local deployment

```bash
git clone <repo> && cd trustcircle
npm install
npm run setup:secret        # writes TRUSTCIRCLE_SECRET to .env.local
npm run build               # runs setup:assets first
npm start                   # http://localhost:3100
```

That is the whole thing. No database server, no container, no external account, no API
key. The SQLite file is created on first use at `data/trustcircle.db`.

Optional demo data (two accounts, one circle, seven fictional cases, one answered
review, a part-finished checklist and a recovery case):

```bash
npm run db:seed-demo
```

It refuses to run if either demo account already exists, so it can never drop fictional
cases into a real user's history.

### Running it for a household

A single machine on the home network is a reasonable target: a mini PC, a NAS that runs
Node 24, or a laptop that stays on. Two things to get right:

1. **Back up `data/` and `.env.local` together.** The database without the key loses all
   message content.
2. **Terminate TLS**, even on a LAN. Session cookies are only marked `Secure` when
   `NODE_ENV=production`, and nothing else protects the traffic.

## Public deployment — prerequisites, not a checklist to tick quickly

**This application is not ready for public deployment.** A successful local build says
nothing about that. The following is what would genuinely be required, grouped by
whether it blocks a launch.

### Blocking — legal and regulatory (India)

- [ ] **Digital Personal Data Protection Act, 2023 assessment.** Lawful basis, notice
      and consent flow, the obligations of a Data Fiduciary, data-principal rights
      (access, correction, erasure, grievance), breach notification to the Data
      Protection Board and to affected users, retention justification, and a decision
      on whether operating family circles makes the operator a Significant Data
      Fiduciary.
- [ ] **Published grievance officer** with a working contact route (which today would
      require the email provider that is not configured).
- [ ] **Legal review of the privacy policy and terms.** Both describe the implementation
      accurately; neither has been reviewed by a lawyer.
- [ ] **Advertising and consumer-protection review** of every product claim, with
      particular attention to anything that could read as a fraud-prevention guarantee.
- [ ] **A decision on children's data**, since family circles will attract minors.

### Blocking — security

- [ ] **Independent security review**, especially of `lib/authz.ts`. The author wrote
      both the code and the tests that check it.
- [ ] **Key management.** `TRUSTCIRCLE_SECRET` currently sits next to the database.
      A KMS or HSM, plus a rotation procedure (not implemented — see ROADMAP.md).
- [ ] **Rate limiting that survives a proxy.** The current limiter trusts
      `x-forwarded-for` and is per-process. Needs a trusted-hop configuration and a
      shared store if there is more than one instance.
- [ ] **Multi-factor authentication.**
- [ ] **Recovery-code redemption.** The code is generated and hashed but nothing
      consumes it, so a forgotten password currently means a lost account. This is a
      promise the app cannot keep, and must be closed before anyone relies on it.
- [ ] **Nonce-based CSP** to remove `'unsafe-inline'` from `script-src`.
- [ ] **Attachment scanning**, or an explicit decision to accept the risk.
- [ ] **Dependency monitoring**, an SBOM, and a patching commitment.

### Blocking — operational

- [ ] **Managed PostgreSQL.** SQLite on one host has no replication and no
      point-in-time recovery. The SQL is ORM-free and plain, so this is a `lib/db.ts`
      rewrite rather than an application rewrite.
- [ ] **Object storage for attachments**, behind the existing `attachFile()` /
      `getAttachment()` seam.
- [ ] **Backups with tested restores**, covering database and key together.
- [ ] **Error tracking and uptime monitoring.** There is none today — deliberately, since
      every candidate is a third party receiving data from a privacy product, which
      needs its own decision.
- [ ] **A scheduler** for retention, instead of sweeping on navigation.
- [ ] **An incident process**, including what to tell users if message content is
      exposed.

### Blocking — product honesty

- [ ] **Professional Hindi and Bengali review**, covering detection rules as well as the
      interface. Shipping partial non-English detection to users who rely on it is the
      most likely way this product could cause harm.
- [ ] **A maintenance commitment for the official-resources directory**, with a review
      cadence and someone accountable. A stale "official" number is exactly the failure
      this product exists to prevent.
- [ ] **A rule-review process.** New fraud patterns appear constantly; a rule engine
      nobody updates degrades silently while still looking like it works.

### Non-blocking but expected

- [ ] Email provider (verification, invitations, password reset).
- [ ] Payment provider, if paid plans are introduced — plus the business entity, tax
      registration and consumer-disclosure terms that go with them.
- [ ] Push notifications.
- [ ] Playwright suite in CI.
- [ ] Load testing with a realistic case volume.

## Hosting notes

The application is a standard Next.js server. It needs a **persistent filesystem**
(SQLite plus `public/ocr`), so serverless platforms are not a fit without first doing
the PostgreSQL and object-storage migrations above. A small VM or container host with a
mounted volume is the honest target for the current architecture.

Reverse proxy requirements: terminate TLS, set `X-Forwarded-For` from a trusted source,
preserve `Origin` and `Host` (Server Actions check them), and allow request bodies up
to ~5 MB for attachments.

## What a successful build does and does not prove

`npm run build` succeeding proves the code compiles and the types hold. It does not
prove the application is secure, legal to operate, or correct. Everything above is
outstanding, and none of it is work that a build step can do.
