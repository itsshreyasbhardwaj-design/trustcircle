# Roadmap

## Delivered

### Phase 1
- Marketing site: home, features, how it works, family protection, pricing, FAQ, about,
  contact, privacy, terms — with a live demo that runs the real engine on fictional
  cases at render time.
- Authentication: registration, login, logout, scrypt hashing, session management,
  protected routes, password change, session listing and revocation, one-time recovery
  code, account deletion.
- Six-step onboarding, skippable, with progress persisted.
- Dashboard with real persisted data: quick-scan entry points, recent checks, needs
  attention, family requests, safety tip, circle summary, permission-filtered activity.
- TrustScan: text, screenshot (browser OCR), link and QR input; credential redaction
  before storage; 22 text rules plus link-structure and UPI checks; four explainable
  outcomes; evidence excerpts; encrypted at rest.
- Offline URL analysis: 15 structural checks, nothing fetched.
- VerifyPath: nine claim types, persisted checklists with per-step notes.
- FamilyShield: circles, hashed and expiring invitations, membership management,
  review requests with a seven-state machine, scoped grants, server-enforced revocation.
- RecoveryGuide: urgent path first, four verified official resources with provenance,
  evidence organiser, private attachments.
- Settings: profile, language, accessibility, retention, notification preferences,
  privacy and security sections.

### Phase 2
- PaymentPause: UPI deep-link and QR parsing with per-field explanation; no payment
  capability of any kind.
- QR decoding in the browser.
- Multilingual interface: English, Hindi, Bengali, with untranslated strings labelled
  as English rather than silently served.
- TrustAcademy: 8 lessons, 13 questions, explanations shown for every answer, progress
  tracking and an opt-in circle view.
- In-app notification centre with dedupe, preferences and an honest channel-status list.
- Data export, selective deletion, bulk deletion, account deletion.
- Demo import, clearly labelled, never automatic.
- Accessibility: text scaling, reduced motion, dark mode, skip link, 44px targets,
  keyboard navigation, screen-reader labelling.
- 151 automated tests.

## Deferred, with what each would actually involve

### Deferred because a real provider is needed

| Capability | What is already in place | What is missing |
|---|---|---|
| **Transactional email** | Nothing calls an email API; the UI states plainly that none is configured | A provider, deliverability setup, and then: verification, password reset, email invitations. |
| **Push notifications** | `notify()` is the single delivery point; `channels()` reports real status | Web Push keys, subscription storage, a service worker. |
| **Payments** | Plan and entitlement models enforced server-side; dev-only simulation labelled as such | A payment provider, a business entity, tax registration, and consumer-disclosure, refund and cancellation terms. |
| **Domain reputation** | URL analysis is structural and clearly scoped | An authorised feed, plus a decision about sending user URLs to a third party — which conflicts with the privacy model and would need consent. |
| **Optional AI analysis** | The engine is pure and swappable | A provider, and a hard trust boundary between system instructions and user content. Would be opt-in, never default, and never allowed to produce a safety verdict. |

### Deferred because of scope

- **Playwright end-to-end suite.** ~400 MB of browsers plus a test-database harness.
  The 27-step journey has been walked manually and is covered in pieces by the
  integration suite; it is not automated.
- **Nonce-based CSP.** `'unsafe-inline'` is currently required for Next's bootstrap
  scripts.
- **Key rotation.** Re-sealing every `content_enc` and `excerpt_enc` under a new key.
- **PostgreSQL migration.** SQL is ORM-free and plain, so this is a `lib/db.ts` rewrite
  plus a type/placeholder sweep, not an application rewrite.
- **Object storage for attachments.** `attachFile()` / `getAttachment()` are the seam.
- **Background scheduler.** Retention currently sweeps on navigation.
- **Professional translation review**, and far deeper Hindi and Bengali detection rules.
- **Multi-factor authentication.**
- **A recovery-code redemption flow.** The code is generated and hashed; nothing
  consumes it yet, so it is currently a promise the app cannot keep. Highest-priority
  gap.

### Explicitly not planned

- Any form of monitoring, activity reporting to a circle admin, or covert mode.
- A "mark as safe" action, for reviewers or anyone else.
- A confidence score or probability.
- Claimed detection-accuracy figures.
- Selling, sharing or advertising against message content.

## Honest next steps, in order

1. **Recovery-code redemption.** The code is shown and hashed but cannot be used. Until
   it is, a forgotten password means a lost account.
2. **Independent security review**, particularly of `lib/authz.ts`.
3. **DPDPA assessment** before any public deployment (see DEPLOYMENT.md).
4. **Rate-limiter hardening** behind a trusted proxy configuration.
5. **Professional Hindi and Bengali review**, including the rule set, not just the UI.
6. **Playwright suite** covering the full journey.
