# Limitations

Read this before trusting any result. A safety product that oversells itself makes
people less safe, because false reassurance is more dangerous than no tool at all.

---

## 1. The central limitation

**TrustCircle cannot tell you that anything is safe.**

It checks content against a published list of rules and reports which ones matched.
It has no way to establish:

- who actually sent a message (sender names, numbers, logos and letterheads are all freely set);
- who owns a bank account, a UPI ID or a phone number;
- whether a business, a job, an order or an officer is real;
- whether a website is honest.

**"No known warning signs identified" is a statement about the rules, not about the
content.** It means these particular checks matched nothing. A competent, well-written
scam that avoids the patterns will produce exactly that result.

## 2. Detection limitations

- **Rules only.** No AI model, no machine learning, no statistical scoring. The engine
  catches what someone wrote a rule for. There are 22 text rules plus the link-structure
  and payment-code checks, all listed on the Features page and on every finding.
- **No threat intelligence.** There is no feed of known-bad domains, no reputation
  lookup, no blocklist, no certificate transparency check. A brand-new scam domain is
  indistinguishable from any other unknown domain.
- **No accuracy figure is published**, because none has been measured on a
  representative dataset. The test suite proves specific behaviours on specific inputs;
  it is not a measurement of real-world detection rate, and quoting one from it would
  be dishonest.
- **False positives happen.** An ordinary message using urgent language can produce
  "additional verification recommended". The engine requires more than one ordinary
  warning sign before it will say "warning signs detected", but it is still a
  keyword-driven system.
- **False negatives happen, and matter more.** A fraud phrased unusually, in an
  unsupported language, or using an image TrustCircle cannot read, will come back clean.
- **Spelling and grammar are deliberately not used as signals.** They are weak
  indicators and penalise people writing in a second language.

## 3. Link limitations

- **No link is ever opened, fetched, resolved or followed.** Analysis is purely
  structural: the characters of the address. This is a security property, and a
  limitation: a shortened link's destination genuinely cannot be seen, and the app says
  so instead of guessing.
- **Public-suffix handling is approximate.** A short list of multi-label suffixes
  (`co.in`, `gov.in`, `co.uk`, …) is used rather than the full Public Suffix List, so
  the "registered domain" shown for an unusual suffix may be wrong by one label.
- **Brand checks are structural, not authoritative.** TrustCircle flags a familiar name
  appearing somewhere that is *not* the registered domain. It does not know, and never
  claims to know, what any brand's real domain is.

## 4. Image and QR limitations

- **Text extraction makes mistakes**, especially with small, stylised or low-contrast
  text, and with screenshots of messages in non-Latin scripts. The extracted text is
  always shown and is always editable before analysis.
- **When nothing can be read, nothing is invented.** A failed extraction says so and
  asks you to type the message out.
- **English only.** The bundled language data is English. Hindi and Bengali screenshots
  will extract poorly or not at all.
- **A QR code that cannot be decoded is reported as undecodable**, never guessed.

## 5. Language limitations

- The interface and safety guidance are translated into Hindi and Bengali (43 of 43
  interface strings). Where a string has no translation, English is shown **and
  labelled as English** — it is never passed off as a translation.
- **These translations were written by the project author and have not been reviewed by
  a professional translator.**
- **Detection rules for Hindi and Bengali cover only the highest-signal phrases**, in
  both transliterated and native script. Coverage is far behind English. Any result
  containing Devanagari or Bengali script carries a notice saying so.
- TrustAcademy lesson bodies and questions are English-only, and are labelled as such
  when the interface language is not English.

## 6. Payment limitations

- TrustCircle **moves no money, opens no payment app, and contacts no payment provider.**
- **It cannot verify who owns a UPI ID or an account.** Only a bank can.
- A correctly formed UPI payload is **not** evidence of a genuine recipient, and the
  payee name in a UPI code is free text typed in by whoever generated it.

## 7. Reporting and recovery limitations

- TrustCircle **cannot file a complaint** with any bank, portal or authority. There is
  no integration and no authorisation for one.
- It **cannot recover money** and will never suggest otherwise.
- The directory of official resources is **maintained by hand**. Each entry records its
  source and the date it was last checked (2026-10-20). Entries can go stale. Confirm
  on the organisation's own site before relying on one.
- **Bank phone numbers are deliberately absent.** A stale "official" number is exactly
  the failure this product exists to prevent, so the app tells you where to find yours
  instead.

## 8. Service limitations

| Capability | Status |
|---|---|
| Email of any kind | **Not configured.** No provider, nothing sent, ever. |
| Password reset by email | **Does not exist.** A one-time recovery code shown at registration is the only alternative route in. |
| Email invitations | **Does not exist.** You copy a link and send it yourself. |
| Push notifications / SMS | **Not configured.** Nothing reaches your phone outside the app. |
| Payment / checkout | **Not configured.** Nothing can be purchased. Plan entitlements are enforced; billing does not exist. |
| Offline use | The analysis needs no external service, but it runs on the server, so the page must reach the app. There is no offline-first sync. |
| Native mobile app | None. It is a responsive web app installable as a PWA. |
| Background jobs | None. Retention is swept when you open the app, not on a schedule. |

## 9. Security limitations

The full list, with reasoning, is in [SECURITY.md](SECURITY.md). The ones a user should
know:

- **At-rest encryption protects the database file, not the host.** The key lives in an
  environment variable on the same machine. Someone who controls the server can read
  both.
- **There is no multi-factor authentication.** Password plus session cookie only.
- **Rate limiting is per-process and keyed on a client IP header.** Behind a proxy that
  does not set a trustworthy forwarded-for header, it can be evaded.
- **No independent security review has been done.** The author wrote both the code and
  the tests that check it.

## 10. Legal and operational limitations

- Not assessed against India's Digital Personal Data Protection Act, 2023. A public
  deployment would need that assessment, a notice-and-consent flow, breach-notification
  procedures and a grievance contact.
- The privacy policy and terms describe the implementation accurately but have **not
  been reviewed by a lawyer**.
- No certifications, no partnerships, no awards, no user numbers. Be suspicious of any
  product in this category claiming those without evidence.
