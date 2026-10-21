# Architecture

## Stack

| Layer | Choice | Why this one |
|---|---|---|
| Framework | Next.js 15 (App Router), React 19 | Server components keep almost all logic server-side; Server Actions remove a whole class of hand-written endpoints and their authorisation bugs. |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess` | Index access on a row or array is `T \| undefined` until checked, which is exactly where authorisation bugs hide. |
| Database | `node:sqlite` (Node 24 built-in) | Zero dependencies, zero native build, zero database server. No `better-sqlite3` compile step and nothing to go stale. |
| Migrations | Hand-rolled, ~20 lines in `lib/db.ts` | An ordered array of `{id, sql}` plus a `_migration` table. A migration framework would be more code than the thing it replaces. |
| Styling | Tailwind CSS v4 with CSS custom properties | Semantic tokens (`--bg`, `--fg-muted`, `--caution-bg`) redefined for dark mode, so themes are a token swap rather than a class sweep. |
| Validation | Zod at the action boundary | Every Server Action parses its `FormData` before touching a service. |
| Icons | lucide-react | Tree-shaken, no runtime. |
| Tests | Vitest | The engine is pure, so unit tests need no harness; integration tests run against a real in-memory SQLite with the real schema. |
| OCR | tesseract.js, served from `public/ocr` | Runs in the browser. Worker, WASM core and language data are copied out of `node_modules` at setup so the CSP can stay `self` with no CDN. |
| QR | jsQR | Pure JS, decodes from canvas `ImageData` in the browser. |

**Deliberately not used:** any AI provider, any hosted auth, Supabase/Firebase, an
email service, a payment gateway, cloud object storage, a threat-intelligence feed, a
charting library (four numbers are a CSS bar), and a component framework like shadcn/ui
(which would generate twenty files to replace one 300-line `components/ui.tsx`).

## Layers

```
app/(site)         marketing pages — server components, no client JS except forms
app/(auth)         login, signup
app/onboarding     six-step first run
app/(app)          the application; layout calls requireUser() once
app/actions/*      'use server' — validate, call a service, revalidate, redirect
app/api/*          route handlers: data export, private attachment serving

lib/analysis/*     the engine. PURE. No I/O, no database, no network, no React.
lib/*.ts           services: auth, authz, scans, family, reviews, verification,
                   recovery, academy, notifications, export. All 'server-only'.
lib/data/*         content: lessons, the verified resource directory, demo cases

components/*       server components by default; six client components in total
```

### The dependency rule

`lib/analysis/` imports nothing from the rest of the application. It takes a string
and returns an object. Everything above it may depend on it; it depends on nothing.
That is what makes 70-odd engine tests possible without a database, a request, or a
mock.

## Request flow for a scan

```
 browser                     server
 ───────                     ──────
 paste text ───────────────► Server Action
                             ├─ zod parse
                             ├─ requireUser()        → session cookie → user
                             ├─ rateLimit()
                             └─ createScan()
                                 ├─ analyze()         pure: redact → rules → URLs → UPI
                                 └─ tx():             case + input(sealed) + findings + evidence(sealed)
                             ◄── redirect /scan/results/:id

 upload screenshot ─┐
                    ├─ decoded in the browser (canvas re-encode drops EXIF)
                    ├─ tesseract.js worker from /ocr
                    └─ user edits the extracted text ──► same Server Action as above
                       (the image is never uploaded)
```

## Authorisation model

Every private read and write goes through `lib/authz.ts`. One rule, applied uniformly:

> Ownership, **or** an explicit unrevoked grant, checked in SQL, on the server.

```sql
-- the whole of it, in effect
owner_user_id = :user
  OR EXISTS (SELECT 1 FROM access_grant
              WHERE resource_id = :id AND grantee_user_id = :user AND revoked_at IS NULL)
```

Consequences that fall out of this rather than being special-cased:

- **Circle membership authorises nothing.** There is no query anywhere that reads a
  case because two users share a circle.
- **Authorisation decides *what*, not just *whether*.** A grant carries a scope. A
  `findings` grant returns `content: null` and strips every excerpt — the server never
  sends the data and the client never has it to hide.
- **Revocation is a read-path check.** `revoked_at IS NULL` is in the query, so a
  withdrawn share fails the reviewer's *next* request.
- **A grant requires a shared circle, continuously.** `revokeGrantsWithoutSharedCircle()`
  runs on every membership change and revokes any grant between two people who no
  longer share a circle, in both directions. Re-joining a circle does not resurrect
  anything: re-sharing is a fresh decision by the owner.

### Review state machine

States: `draft → awaiting_review → under_review → more_info_requested → reviewed → closed`,
plus `cancelled`. A table declares which role may make which transition, and
`setState()` refuses anything not in it. Reviewers may move a request to
`more_info_requested` or `reviewed`; only the owner may send, cancel or close. Closing
or cancelling revokes the grants the request created.

There is no transition and no verdict that marks anything safe. The four verdicts are
`see_warning_signs`, `verify_independently`, `need_more_info`, `cannot_determine`.

## Data model

26 tables. The ones that carry the security properties:

| Table | Note |
|---|---|
| `session` | Primary key is the **SHA-256 of the cookie token**. The token itself is never stored, so the table cannot be used to impersonate anyone. |
| `family_invitation` | Same: `token_hash` only. Expiry and revocation are columns, checked on every use. |
| `access_grant` | The single authorisation primitive. Unique on `(resource_type, resource_id, grantee, review_request_id)` so re-sharing updates rather than duplicates. |
| `scan_input` | `content_enc` — AES-256-GCM sealed. Credentials are removed *before* sealing, so they are not in the ciphertext either. |
| `scan_evidence` | `excerpt_enc` — sealed the same way. |
| `attachment` | File bytes as a BLOB, with a sniffed MIME. No filesystem path means no path traversal, no orphan files, and deletion is a `DELETE`. |
| `audit_event` | Actions and short labels. Never content — asserted by a test. |

Foreign keys are on (`PRAGMA foreign_keys = ON`) with `ON DELETE CASCADE` throughout, so
account deletion is a single `DELETE FROM user` and the database removes the rest. The
one exception is `family_circle.created_by`, which is `ON DELETE SET NULL`: a circle
belongs to its members, not to whoever created it. (Migration `0002` exists precisely
because the first version got this wrong and a test caught it.)

## Notable decisions, with their trade-offs

**OCR and QR in the browser.** The image never reaches the server, which removes image
parsing from the server attack surface entirely and means a screenshot of a bank app
cannot leak from a database. Cost: ~29 MB of WASM and language data served from
`public/ocr`, loaded lazily only when someone actually uploads a screenshot.

**Pure analysis engine.** Deterministic output, exhaustive tests, and an honest product:
the app can show every rule it ran because the rules are data. Cost: it only catches
what someone wrote a rule for, which the UI says plainly.

**Server Actions over REST handlers.** Less boilerplate, and Next's origin check gives
CSRF protection without a token layer. Cost: they are not a public API; anything
needing one would add route handlers beside them.

**Attachments as BLOBs.** Removes path handling from the threat model and makes deletion
atomic with the row. Cost: a 4 MB cap and a database that grows with attachments.
Documented as a migration point for object storage.

**Retention swept on navigation, not by a scheduler.** There is no cron in this
deployment, so `applyRetention()` runs in the app layout. A promise of background
deletion would be fiction. Cost: a case can outlive its retention date until the owner
next opens the app.

**scrypt rather than Argon2id.** Argon2id was the stated target but needs a native
module. `node:crypto`'s scrypt at the OWASP profile (N=2^17, r=8, p=1) is an accepted
alternative and needs no build step. The stored hash records its own algorithm and
parameters, so adding argon2id later is additive and does not invalidate existing
hashes.

## Two Next.js behaviours worth knowing about

**A route-level `loading.tsx` makes `notFound()` return 200.** A Suspense boundary
flushes the shell — and the status — before the page finishes, so a later `notFound()`
cannot change it. In this app "not found" is the privacy answer for an unauthorised
resource, so it deserves a real 404; the route-group `loading.tsx` was removed to get
one. Skeleton components still exist for in-page Suspense.

**`middleware.ts` whose matcher includes `/_not-found` breaks the build** with
`Invariant: no direct app page entry found for /_not-found`. The matcher excludes it
explicitly. Worth knowing before spending an afternoon on it.

## Migration path to production

The seams are already in place: SQL is plain and ORM-free (PostgreSQL swap is a
`lib/db.ts` rewrite, not an application rewrite); attachments go through
`getAttachment()`/`attachFile()` (object storage swap); notifications go through a
single `notify()` (push/email adapter); `seal`/`open` are a two-function interface (KMS
swap). None of these are built — see ROADMAP.md for what each would actually involve.
