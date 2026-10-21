# Environment

## Requirements

| Requirement | Version | Why |
|---|---|---|
| Node.js | **24.x** | `node:sqlite` (the built-in database driver) and native TypeScript stripping for the CLI scripts. |
| npm | 11.x | Lockfile v3 and `overrides`. |
| Disk | ~400 MB | `node_modules` plus ~29 MB of OCR assets in `public/ocr`. |

No database server. No Docker. No Homebrew. No Rust toolchain. No system packages.

## Configuration

Exactly one variable is required.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `TRUSTCIRCLE_SECRET` | **Yes** | — | Key material for AES-256-GCM encryption of message content and finding excerpts. Must be ≥ 32 characters. |
| `TRUSTCIRCLE_DB` | No | `data/trustcircle.db` | Database file path. `:memory:` is valid for throwaway runs. |
| `NODE_ENV` | No | set by Next | `production` makes the session cookie `Secure`. |
| `TRUSTCIRCLE_SCRYPT_N` | No | `131072` (2¹⁷) | **Test use only.** Lowers the password-hash cost so the suite is usable. Never set this in a real deployment. |

### No API keys. Anywhere.

There is no configuration — and no code path — for OpenAI, Anthropic, Gemini, Supabase,
Firebase, Google OAuth, Twilio, any email provider, any banking or UPI API, any threat
intelligence service, any payment gateway, or any cloud object storage. The
Content-Security-Policy contains no remote origins at all, so the browser could not
reach a third party even if one were added by mistake.

## Generating the secret

```bash
npm run setup:secret
```

Appends a fresh 48-byte random value to `.env.local` (which is gitignored), or leaves
an existing value alone. Equivalent by hand:

```bash
node -e "console.log('TRUSTCIRCLE_SECRET=' + require('node:crypto').randomBytes(48).toString('base64url'))" >> .env.local
```

**Losing this value makes already-saved message content permanently unreadable.** It is
the key, not a password — there is no recovery path, by design. Everything else in the
database (accounts, circles, findings, reviews) survives a lost key; only the encrypted
content and excerpts do not.

Rotation is not implemented. It would mean reading and re-sealing every
`scan_input.content_enc` and `scan_evidence.excerpt_enc` under a new key, which needs
both keys present — listed in ROADMAP.md.

## Local OCR assets

```bash
npm run setup:assets
```

Copies out of `node_modules` into `public/ocr` (gitignored, ~29 MB):

| File | Source | Purpose |
|---|---|---|
| `worker.min.js` | `tesseract.js` | Web worker entry point |
| `tesseract-core*.wasm.js` | `tesseract.js-core` | WASM engine, SIMD and fallback builds |
| `eng.traineddata.gz` | `@tesseract.js-data/eng` | English language data |

This is what lets screenshot OCR run with the CSP at `self` and no CDN. It runs
automatically before `dev` and `build`, and the files are only fetched by a browser
when someone actually uploads a screenshot.

## Files written at runtime

| Path | Contents | In git |
|---|---|---|
| `data/trustcircle.db` | The whole application: accounts, cases, circles, attachments | No |
| `data/trustcircle.db-wal`, `-shm` | SQLite write-ahead log | No |
| `.env.local` | `TRUSTCIRCLE_SECRET` | No |
| `public/ocr/` | OCR assets | No |

**Back up `data/` and `.env.local` together.** The database without the key loses all
message content; the key without the database is useless.

## Verifying a setup

```bash
npm run db:migrate     # lists applied and pending migrations
npm test               # 151 tests, no network, no fixtures
npm run build          # production build
```

If `TRUSTCIRCLE_SECRET` is missing or too short, the application fails loudly on the
first attempt to read or write content — it does not silently fall back to storing
plaintext.
