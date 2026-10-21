# Privacy

How TrustCircle handles data, as implemented. The user-facing version is at `/privacy`
in the application; this is the engineering reference, with table and column names.

## Principle

The product exists because people are targeted through their messages. Those messages
are among the most sensitive things someone can hand to an application. So:

1. **Do not collect a credential, ever** — remove it before anything is written.
2. **Do not collect an image at all** — process it on the device.
3. **Membership grants nothing** — access comes only from an explicit, revocable share.
4. **Everything is exportable and deletable**, by hard deletion, not by a hidden flag.

## What is collected

| Data | Where | Encrypted at rest | Notes |
|---|---|---|---|
| Email, display name | `user` | No | Email is the sign-in identifier. |
| Password | `user.password_hash` | n/a (hashed) | scrypt, OWASP profile, per-user salt. |
| Recovery code | `user.recovery_hash` | n/a (hashed) | SHA-256 only. Shown once, never recoverable. |
| Submitted content, redacted | `scan_input.content_enc` | **Yes** (AES-256-GCM) | Credentials already removed before sealing. |
| Finding excerpts | `scan_evidence.excerpt_enc` | **Yes** | Slices of the redacted content. |
| Findings | `scan_finding` | No | Rule code, category, severity, and the app's own explanation text. |
| Case metadata | `scan_case` | No | Kind, outcome, claim type, a title derived from the redacted content, timestamps. |
| Settings | `user_settings` | No | Language, text scale, theme, reduced motion, retention, notification prefs. |
| Circles and membership | `family_circle`, `family_membership` | No | Who is in a circle with whom. |
| Invitations | `family_invitation.token_hash` | n/a (hashed) | Plus label, expiry, acceptance, revocation. |
| Shares | `access_grant` | No | Who can see what, at what scope, and whether it is revoked. |
| Reviews and comments | `review_request`, `review_participant`, `review_comment` | No | Comment text is written by users, for other users in the same thread. |
| Verification progress | `verification_checklist`, `verification_step` | No | Including the free-text note on each completed step. |
| Recovery cases | `recovery_case`, `recovery_evidence` | No | Notes, transaction references, contacts. |
| Attachments | `attachment.bytes` | No (BLOB) | Sniffed MIME, SHA-256, size. Served only via an authorised route. |
| Sessions | `session` | n/a (hashed) | **Primary key is SHA-256 of the cookie token.** Plus timestamps and a truncated UA. |
| Notifications | `notification` | No | Title and body are app-generated strings. |
| Learning progress | `academy_progress` | No | Per lesson: best score, completion. |
| Account activity | `audit_event` | No | Action plus a short label. **Never content** — asserted by a test. |

## What is never collected

- **Credential values.** `lib/analysis/redact.ts` removes OTPs, one-time codes, card
  numbers (Luhn-checked), CVVs, card expiry, UPI/ATM PINs, passwords, bank account
  numbers, Aadhaar and PAN **before persistence**. The words around them are kept so
  the rules still fire; the value is replaced with `⟨removed: …⟩`. Tested against the
  stored ciphertext, not just the API return value.
- **Images.** Screenshot and QR processing happen in the browser (`components/image-tools.tsx`).
  No image is ever uploaded, in any flow. The canvas re-encode also drops EXIF and
  every other metadata block.
- **Analytics of any kind.** No third-party script, no tracking pixel, no advertising
  identifier, no telemetry, no error-reporting service. The CSP has no remote origins
  at all, so a tracker could not load even if one were added by mistake.
- **Device permissions.** No contacts, SMS, call log, camera stream or location access
  is requested.

## Access control

Default: a user's data is visible to that user alone.

Sharing is explicit, scoped and revocable:

- **Per case.** One `access_grant` row per (resource, grantee, review).
- **Per scope.** `findings` or `findings_and_content`. A findings-only grant returns
  `content: null` with every excerpt stripped, decided server-side — the data is never
  sent to the reviewer's browser.
- **Revocable.** Withdrawal sets `revoked_at`, and `revoked_at IS NULL` is part of the
  read query, so the reviewer's next request fails.
- **Contingent on a shared circle.** `revokeGrantsWithoutSharedCircle()` runs on every
  membership change and revokes grants in both directions once two people no longer
  share a circle. Re-joining does not restore access.

**A circle administrator has no data access.** They manage membership and invitations.
They cannot see any member's cases, history, or whether a member has run a check at all.

## Retention

| Data | Default | Control |
|---|---|---|
| Saved checks | 90 days | Settings → 7 / 30 / 90 / 365 days, or "until I delete them". |
| Checks beyond the plan limit | Oldest deleted at 25 (free) / 500 (family) | Deleted, not hidden. |
| Sessions | 30 days from creation | Revoke individually or all others. |
| Notifications | Until dismissed | Dismiss individually. |
| Everything else | Until deleted | Per-item delete, or account deletion. |

Expiry is applied in the application layout on navigation. There is no scheduler in
this deployment, so a case can outlive its date until the owner next opens the app.
This is stated in the UI rather than papered over.

## User controls

| Control | Where | What it does |
|---|---|---|
| View everything | History, privacy settings, security settings | History, active shares, sessions, account activity. |
| Export | `/api/export` | One JSON file, own content **decrypted**, with an explicit `notIncluded` list. |
| Delete one case | Case page | Hard delete; findings, excerpts and grants cascade. |
| Delete all cases | Privacy settings (types `DELETE`) | Same, in bulk. |
| Delete an attachment | Recovery case | Removes the evidence row and the BLOB. |
| Withdraw a share | Privacy settings, or the review | Server-enforced from the next read. |
| Leave a circle | Circle page | Also revokes everything shared through it. |
| Delete the account | Security settings (email + password) | `DELETE FROM user` — ~20 tables cascade. Tested. |

## Third parties

There are none. No processor, no sub-processor, no analytics vendor, no AI provider, no
email sender, no payment processor, no CDN. Content is never used for advertising,
resale or model training, and there is no mechanism by which it could be.

## Regulatory position

Not assessed against India's **Digital Personal Data Protection Act, 2023**. A public
deployment would need, at minimum: a DPDPA-compliant notice and consent flow, a defined
basis for processing, a Data Fiduciary assessment, breach-notification procedures, a
published grievance contact, and a decision on whether family-circle data makes the
operator a Significant Data Fiduciary. None of that is done; it is listed in
DEPLOYMENT.md as a prerequisite, not as finished work.
