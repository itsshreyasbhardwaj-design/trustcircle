# TrustCircle

[![CI](https://github.com/itsshreyasbhardwaj-design/trustcircle/actions/workflows/ci.yml/badge.svg)](https://github.com/itsshreyasbhardwaj-design/trustcircle/actions/workflows/ci.yml)
[![licence: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)
[![Node 24](https://img.shields.io/badge/node-24.x-5a5?logo=node.js&logoColor=white)](https://nodejs.org)
[![no API keys](https://img.shields.io/badge/API%20keys-none%20required-0d9488)](ENVIRONMENT.md)

**Think twice. Stay protected. Together.**

A family digital-safety application for India. It checks suspicious messages, links,
screenshots, QR codes and payment requests against a published list of rules, explains
each warning sign in plain language, routes you to an independent way of verifying the
claim, and lets you ask someone you trust to look at one specific case.

It runs entirely locally. **No API key of any kind is required** — no AI provider, no
auth service, no managed database, no email sender, no payment gateway, no threat feed.

---

## The one thing to understand before using it

TrustCircle **never says anything is safe.** It cannot verify who sent a message, who
owns a bank account or UPI ID, or whether a business is real. "No known warning signs
identified" is a statement about the rules, not about the content. That limitation is
stated in the product itself, on every result, and it is the reason there is no score,
no percentage, and no reviewer button that clears a message.

---

## Quick start

```bash
git clone https://github.com/itsshreyasbhardwaj-design/trustcircle.git
cd trustcircle
npm install
npm run setup:secret     # writes TRUSTCIRCLE_SECRET to .env.local
npm run setup:assets     # copies the local OCR engine into public/ocr
npm run dev              # http://localhost:3100
```

`setup:assets` also runs automatically before `dev` and `build`. The database file is
created on first use at `data/trustcircle.db`.

Then: create an account → you are shown a one-time recovery code (write it down; there
is no reset email because no email provider exists) → onboarding → dashboard.

To see real results immediately, go to **Settings → Privacy & data → Import demo
cases**. That loads seven clearly-labelled fictional cases. Nothing fictional is ever
placed in an account unless you ask for it there.

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3100 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit`, strict |
| `npm run lint` | Next.js ESLint |
| `npm test` | Vitest: unit, integration and adversarial suites |
| `npm run setup:secret` | Generate the at-rest encryption key into `.env.local` |
| `npm run setup:assets` | Copy the OCR worker, WASM core and language data into `public/ocr` |

---

## The six modules

| Module | What it does |
|---|---|
| **TrustScan** | Analyses text, screenshots, links and QR codes. Strips credentials before storing, explains every finding, quotes the words that triggered it. |
| **FamilyShield** | Per-case, scope-limited, revocable sharing with people in your circle. No monitoring, no admin override, no "mark as safe". |
| **VerifyPath** | Nine claim types, each with a checklist routing you through a channel you already had — your own app, the number on your card, a saved contact. |
| **PaymentPause** | Reads a UPI link or QR payload and explains which fields prove nothing. Moves no money, opens no app. |
| **RecoveryGuide** | The urgent path first (bank → 1930 → written complaint), then an evidence organiser with private attachments. |
| **TrustAcademy** | Eight lessons with fictional scenarios, multiple-choice questions and an explanation shown for every answer. |

---

## Architecture in one paragraph

Next.js 15 App Router with React 19 and TypeScript in strict mode. Data lives in
SQLite through Node's built-in `node:sqlite` — no ORM, no native build step, no
database server. Mutations are Server Actions; two route handlers exist where a real
HTTP response is needed (data export, private attachment serving). The analysis engine
is a pure, dependency-free TypeScript module with no I/O at all, which is what makes it
exhaustively testable. Screenshot OCR and QR decoding run **in the browser** —
the image never leaves the device. Message content and finding excerpts are encrypted
at rest with AES-256-GCM using a key held outside the database.

See [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Documentation

| File | Contents |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Layers, data flow, schema, design decisions and their trade-offs |
| [FEATURES.md](FEATURES.md) | Every feature with a verification status |
| [SECURITY.md](SECURITY.md) | Threat model, controls, and residual risks that are **not** mitigated |
| [PRIVACY.md](PRIVACY.md) | What is collected, why, retention, deletion, access control |
| [TESTING.md](TESTING.md) | Strategy, commands, and the actual results |
| [LIMITATIONS.md](LIMITATIONS.md) | What this cannot do. Read before trusting any result |
| [ROADMAP.md](ROADMAP.md) | What is done, what is deferred, and why |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Local deployment, and the prerequisites for a public one |
| [ENVIRONMENT.md](ENVIRONMENT.md) | Configuration and safe local secret generation |

---

## What this is not

Not a bank. Not an antivirus. Not a law-enforcement service. Not a guaranteed
fraud-detection system. It cannot file a complaint, recover money, verify an identity,
or tell you that a payment is safe to make.

If money has already left your account, do not start with a scan: call your bank,
then call **1930**, then file at **cybercrime.gov.in**.

---

## Contributing

The most valuable thing you can report is a way for one account to read another's
cases, for revoked access to still work, or for a credential to reach storage
unredacted. Open an issue with steps to reproduce — and without anyone's real message
content. See [SECURITY.md](SECURITY.md).

Pull requests that add a safety verdict, a confidence score, a monitoring mode, or a
"mark as safe" action will be declined. Those are the four things this product is built
not to do.

## Status

Phase 1 and Phase 2 are implemented and tested locally. This is **not** production
ready — see the checklist in [DEPLOYMENT.md](DEPLOYMENT.md), which includes a Digital
Personal Data Protection Act assessment, a professional translation review, and a
security review by someone other than the author.
