# Features

Status key:

| Status | Meaning |
|---|---|
| **Verified** | Implemented, and exercised by an automated test or a recorded manual check. |
| **Implemented** | Implemented and manually exercised, without a dedicated automated test. |
| **Partial** | Works, with a stated gap. |
| **Not implemented** | Absent, deliberately. |

---

## TrustScan — content analysis

| Feature | Status | Note |
|---|---|---|
| Paste-text analysis | **Verified** | `/scan/text`. |
| Screenshot OCR | **Verified** | Browser-side; image never uploaded. OCR engine exercised manually, pipeline covered by tests. |
| Link analysis | **Verified** | 15 structural checks, nothing fetched. |
| QR decoding | **Implemented** | Browser-side via jsQR; parsing of the decoded payload is tested. |
| Credential redaction before storage | **Verified** | 9 credential types; asserted against the stored ciphertext. |
| Sensitive-data warning to the user | **Verified** | Counted and surfaced on the result. |
| 22 text rules | **Verified** | Each rule carries a plain-language explanation. |
| Evidence excerpts | **Verified** | ±40 characters around the match. |
| Four explainable outcomes | **Verified** | Conservative mapping: one ordinary warning sign is not "warning signs detected". |
| Never claims safety | **Verified** | Asserted across every outcome. |
| No probability or score | **Verified** | Asserted. |
| Correct extracted text and re-check | **Verified** | Replaces the stored result; source marked `ocr_corrected`. |
| Determinism | **Verified** | Byte-identical output for identical input. |
| Prompt-injection resistance | **Verified** | Four injection styles. |
| Hindi/Bengali rules | **Partial** | Highest-signal phrases only, in both scripts. Disclosed on every affected result. |
| Threat-intelligence lookup | **Not implemented** | Deliberate. No feed, no reputation service. |

## URL analysis

| Check | Status |
|---|---|
| Dangerous scheme (`javascript:`, `data:`, `file:`) | **Verified** |
| Userinfo deception (`https://bank.co.in@evil.net`) | **Verified** |
| IP-literal host | **Verified** |
| Punycode / IDN | **Verified** |
| Mixed-script and confusable characters | **Verified** |
| Plain HTTP, with the "https proves nothing" note | **Verified** |
| Unusual port | **Verified** |
| Known shorteners | **Verified** |
| Messaging handoff (`wa.me`, `t.me`) | **Implemented** |
| Brand token outside the registered domain | **Verified** |
| Brand look-alike registration | **Implemented** |
| Deep subdomain padding | **Implemented** |
| Low-cost TLD (informational only) | **Implemented** |
| Heavy percent-encoding | **Implemented** |
| Installer download (`.apk`, `.exe`, …) | **Verified** |
| Credential-action path (`/kyc`, `/verify`) | **Implemented** |
| Visible-vs-actual mismatch | **Verified** |
| No network access of any kind | **Verified** |

## FamilyShield

| Feature | Status | Note |
|---|---|---|
| Create a circle | **Verified** | Creator becomes admin. |
| Hashed, expiring invitation links | **Verified** | SHA-256 only, 7 days, single use, revocable. |
| Reject expired / revoked / used / forged tokens | **Verified** | All four. |
| Accept an invitation | **Verified** | |
| Remove a member | **Verified** | Also revokes everything shared with them. |
| Leave a circle | **Verified** | Same. Last admin must promote someone first. |
| Promote to admin | **Implemented** | Grants no data access. |
| Seat limits from the plan | **Verified** | Counts members and pending invitations. |
| Review request with scoped sharing | **Verified** | Findings only, or findings plus content. |
| Draft shares nothing | **Verified** | Grants are created on send. |
| Seven-state machine with role checks | **Verified** | |
| Four verdicts, none meaning "safe" | **Verified** | |
| Comments, with owner follow-up | **Verified** | Moves `more_info_requested` back to `awaiting_review`. |
| Revocation enforced server-side | **Verified** | On explicit revoke, close, cancel, removal and leaving. |
| Re-joining does not restore access | **Verified** | |
| Admin cannot see members' cases | **Verified** | No query reads a case by circle membership. |
| Email invitations | **Not implemented** | No email provider. Links are copied manually. |

## VerifyPath

| Feature | Status |
|---|---|
| Nine claim types classified from content | **Verified** |
| Per-type plan: unverified, steps, do-not-share | **Verified** |
| Steps only use channels the user already had | **Verified** |
| Persisted checklists with per-step notes | **Verified** |
| Completion tracking, reopens when unticked | **Verified** |
| Ownership enforced on every step toggle | **Verified** |
| Verified official-resource directory with provenance | **Implemented** |
| Never reuses a number from the message | **Verified** |

## PaymentPause

| Feature | Status | Note |
|---|---|---|
| UPI deep-link and QR payload parsing | **Verified** | |
| "A valid code proves nothing" | **Verified** | Always emitted. |
| Payee name is free text | **Verified** | |
| Missing merchant code = person-to-person | **Verified** | |
| Pre-filled amount surfaced | **Verified** | |
| Unknown parameters surfaced | **Implemented** | |
| Form fields analysed with the same rules | **Verified** | |
| Scan-to-receive reversal detected | **Verified** | |
| Initiates a payment | **Not implemented** | Deliberate, permanently. |
| Verifies account ownership | **Not implemented** | Impossible without a bank. |

## RecoveryGuide

| Feature | Status | Note |
|---|---|---|
| Urgent path shown first | **Implemented** | Above any scan, by design. |
| Four official resources with source and date | **Implemented** | Checked 2026-10-20. |
| Case creation, status, notes | **Verified** | |
| Evidence organiser | **Verified** | |
| Private attachments, magic-byte validated | **Verified** | 4 MB cap; hostile files rejected. |
| Attachment serving is authorised per request | **Verified** | |
| Share with one trusted contact | **Verified** | Requires a shared circle. |
| Files a complaint | **Not implemented** | No authorised integration. |
| Promises recovery | **Not implemented** | Never will be. |

## TrustAcademy

| Feature | Status | Note |
|---|---|---|
| 8 lessons, 13 questions | **Verified** | |
| Explanation shown for every answer | **Verified** | Including correct ones. |
| Progress tracking, best score kept | **Verified** | |
| Circle leaderboard | **Implemented** | Completion counts only. |
| Fictional scenarios, reserved domains | **Verified** | |
| Translated lesson bodies | **Partial** | Titles and summaries translated; bodies English-only and labelled. |

## Accounts and security

| Feature | Status | Note |
|---|---|---|
| Registration, login, logout | **Verified** | |
| scrypt password hashing | **Verified** | OWASP profile; parameters recorded in the hash. |
| Session management, hashed tokens | **Verified** | |
| Protected routes | **Verified** | Signed-out requests redirect. |
| Password change, revokes other sessions | **Verified** | |
| Session listing and revocation | **Implemented** | |
| Rate limiting | **Verified** | Per IP and per account. |
| One-time recovery code | **Partial** | Generated, shown once, hashed — **no redemption flow yet**. See ROADMAP.md. |
| Account deletion with cascades | **Verified** | ~20 tables; promotes a new circle admin. |
| Email verification / password reset | **Not implemented** | No email provider. Stated in the UI. |
| Multi-factor authentication | **Not implemented** | |

## Privacy and data

| Feature | Status |
|---|---|
| At-rest encryption of content and excerpts | **Verified** |
| Tamper and wrong-key detection | **Verified** |
| Full data export | **Verified** |
| Delete a case / all cases / an attachment | **Verified** |
| Active-share listing and withdrawal | **Verified** |
| Configurable retention, applied on navigation | **Verified** |
| Audit log without content | **Verified** |
| No analytics, trackers or third parties | **Verified** |

## Interface

| Feature | Status | Note |
|---|---|---|
| 37 routes, all functional | **Verified** | Smoke-tested with real sessions. |
| Marketing site with live engine demo | **Verified** | Real output, not mock-ups. |
| Dashboard on real persisted data | **Verified** | |
| Dark mode, no flash | **Implemented** | Server-rendered from stored preference. |
| Text scaling (100/112/131%) | **Implemented** | |
| Reduced motion | **Implemented** | OS setting and stored preference. |
| Mobile layout with bottom tab bar | **Implemented** | 44px targets. |
| Skip link, labelled controls, focus rings | **Implemented** | |
| Empty states and error messages | **Implemented** | |
| PWA manifest | **Implemented** | Installable; no offline sync. |
| Loading skeletons | **Partial** | Components exist; the route-level boundary was removed so `notFound()` can return a real 404 rather than a streamed 200. |
| Submitted content rendered as text only | **Verified** | No `dangerouslySetInnerHTML` anywhere. |

## Subscription

| Feature | Status | Note |
|---|---|---|
| Plan and entitlement model | **Verified** | |
| Server-side limits: seats, reviewers, history | **Verified** | |
| Pricing page | **Implemented** | States plainly that nothing can be bought. |
| Development entitlement simulation | **Implemented** | Recorded as `dev_simulation`; no transaction. |
| Checkout | **Not implemented** | No provider; prerequisites in DEPLOYMENT.md. |

## Notifications

| Feature | Status |
|---|---|
| In-app centre, unread, read, dismiss | **Verified** |
| Per-kind preferences; security always on | **Verified** |
| Deduplication | **Verified** |
| Generated on invitation, review, comment, revocation, security events | **Verified** |
| Honest channel-status list | **Implemented** |
| Push / email / SMS | **Not implemented** |
