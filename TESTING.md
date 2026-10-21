# Testing

## Commands

```bash
npm run typecheck    # tsc --noEmit, strict + noUncheckedIndexedAccess
npm run lint         # next lint
npm test             # vitest run — all three suites
npm run build        # production build
npm audit            # dependency audit
```

## Strategy

Three layers, chosen so the valuable things are cheap to test:

| Suite | File | Tests | What it covers |
|---|---|---|---|
| Unit | `tests/analysis.test.ts` | 45 | The analysis engine, in isolation. It is a pure function, so there is no database, no mock and no harness. |
| Integration | `tests/integration.test.ts` | 61 | Services against a **real SQLite database with the real schema**, created fresh per test. |
| Adversarial | `tests/adversarial.test.ts` | 45 | False positives, missed signals, Unicode deception, prompt injection, hostile files, cross-user access, result wording. |
| | **Total** | **151** | |

The engine being pure is what makes this work: 45 behavioural tests run in under a
second because there is nothing to set up.

Integration tests use `createTestDb()`, an in-memory database that runs the same
migrations as production. No mocked database layer, so a test failing means the SQL is
wrong, not that a mock drifted.

### Two test-only environment values

`tests/setup.ts` sets `TRUSTCIRCLE_SECRET` (so at-rest encryption is deterministic) and
`TRUSTCIRCLE_SCRYPT_N=4096` (because the production profile is ~1.5 s per hash and the
suite registers hundreds of accounts). The stored hash records the cost it was created
with, so this changes speed, not the code path. Nothing in the application reads
either variable.

## What is deliberately asserted

Properties that would be easy to regress and expensive to discover in production:

- **The engine never promises safety.** Asserted across every outcome by pattern-matching
  the app's own prose — excluding excerpts, because quoting a scam that calls itself a
  "Verified Merchant" back to the user verbatim is the intended behaviour.
- **No probability or score is ever emitted.**
- **Credentials never reach storage.** Asserted against the *decrypted stored ciphertext*,
  not the API return value, for OTP, card, UPI PIN, Aadhaar, PAN and password.
- **Content never reaches the audit log.**
- **The URL module performs no network access.** Asserted by reading its own source for
  `fetch`, `XMLHttpRequest`, `node:http` and `dns`.
- **Spelling and grammar are not used as signals.** Same technique — the rule file must
  not mention them, because grammar-based detection penalises second-language writers.
- **Determinism.** The same input produces a byte-identical result.
- **Embedded instructions are data.** Four injection styles, each expected to be flagged
  rather than obeyed.

## Authorisation coverage

The largest block of integration tests, because this is where the product's promise
lives:

- another user cannot read, delete or modify a case, checklist or recovery case;
- a draft review shares nothing;
- sending grants access to exactly the chosen reviewers, and to no other case;
- a findings-only grant returns `content: null` with every excerpt stripped;
- sharing is refused to anyone outside your circles;
- revoked, expired, already-used and forged invitation tokens are all rejected;
- revocation blocks the next read — explicitly, on close, on cancel, on member removal,
  and on leaving a circle;
- re-joining a circle does **not** resurrect a revoked grant;
- a reviewer cannot close, cancel or revoke;
- plan limits are enforced server-side for seats and reviewers;
- account deletion cascades across ~20 tables, leaves other users intact, and promotes
  a new circle admin rather than destroying the circle.

That last one exists because the first implementation **did** destroy the circle. The
test caught it, and migration `0002_circle_survives_creator` is the fix.

## Route and authorisation smoke test

Beyond the suites, every route was exercised against a running dev server with real
session cookies minted for two seeded accounts:

- 12 public pages — all 200.
- 18 authenticated pages — all 200.
- 6 dynamic pages plus `/api/export` — all 200 for the owner.
- Signed-out requests to app pages — 307 to `/login`.
- A second account requesting another user's case, recovery case and checklist — 404.
- The same account requesting the review genuinely shared with it — 200.

## Results

```
$ npm test
 Test Files  3 passed (3)
      Tests  151 passed (151)
   Duration  ~10s

$ npm run typecheck
(no output — clean)

$ npm audit
found 0 vulnerabilities
```

`postcss` and `sharp` are pinned forward through `overrides` in `package.json`; without
those, transitive advisories are reported.

## Not done

- **No Playwright suite.** Browser automation was not set up: it needs a ~400 MB browser
  download and a test database harness, and the same assertions are covered more
  cheaply by the integration layer plus the manual route sweep above. Listed in
  ROADMAP.md. The 27-step end-to-end journey in the brief has been walked manually and
  is covered in pieces by the integration suite, but it is **not** automated.
- **No component tests.** React Testing Library is not wired up. Components are almost
  all server components whose logic lives in the tested service layer.
- **No load or performance testing.**
- **No measured detection accuracy**, and none will be claimed from this suite. It
  proves specific behaviours on specific inputs; it is not a sample of real fraud.
