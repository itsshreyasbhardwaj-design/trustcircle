import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, SectionTitle, Prose, Alert } from '@/components/ui';

export const metadata: Metadata = { title: 'Privacy policy', description: 'What TrustCircle stores, why, for how long, and how to remove it.' };

const LAST_UPDATED = '20 October 2026';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <SectionTitle eyebrow="Privacy policy" title="What is stored, and what is not" />
      <p className="mt-3 text-sm text-[var(--fg-subtle)]">Last updated {LAST_UPDATED}</p>

      <Alert tone="info" className="mt-8" title="Read this first">
        This document describes the behaviour of the TrustCircle application as built. It is written to match
        the code, not to cover a company&apos;s legal exposure. If you are running this instance yourself, you
        are the data controller for everything in it, and this document describes what the software does on
        your behalf.
      </Alert>

      <Prose>
        <h2>1. What TrustCircle collects</h2>
        <p><strong>Account data.</strong> Your email address, a display name, and a password that is stored only as a salted scrypt hash. A one-time recovery code is stored only as a SHA-256 hash.</p>
        <p><strong>Content you submit for checking.</strong> The text of a message, a web address, a QR payload or a payment description, after sensitive values have been removed. This is encrypted at rest.</p>
        <p><strong>Findings and excerpts.</strong> Which rules matched, and the slice of your content that triggered each one. Excerpts are encrypted at rest.</p>
        <p><strong>Your own activity.</strong> Circles you belong to, reviews you created or were asked to give, comments you wrote, verification steps you ticked, lessons you completed, and notifications sent to you.</p>
        <p><strong>Recovery case data.</strong> Anything you enter in a recovery case: notes, transaction references, and files you attach. Attachments are stored in the database, not on a public filesystem, and are served only to you or to someone you explicitly shared that case with.</p>
        <p><strong>Sessions.</strong> A session row with creation time, last-seen time, expiry, and a truncated browser identification string. The session cookie value itself is never stored — only its SHA-256 hash.</p>
        <p><strong>An account activity log.</strong> Short labels describing what happened, such as &ldquo;scan created&rdquo; or &ldquo;access revoked&rdquo;. It never contains message content.</p>

        <h2>2. What TrustCircle never collects</h2>
        <ul>
          <li><strong>Credentials found in your content.</strong> OTPs, PINs, CVVs, card numbers, Aadhaar numbers, PAN and passwords are detected and removed <em>before</em> anything is written to the database. The surrounding words are kept so the rules still work; the value is discarded.</li>
          <li><strong>Images.</strong> A screenshot or QR image you check is read in your browser. It is never uploaded and never stored. Only the extracted text you confirm is sent.</li>
          <li><strong>Your bank or payment credentials.</strong> Nothing in this product needs them, and nothing asks for them.</li>
          <li><strong>Analytics, advertising or tracking data.</strong> There is no third-party script, no advertising identifier, no analytics service and no tracking pixel anywhere in the application.</li>
          <li><strong>Contacts, SMS, call logs or location.</strong> No permission for any of these is requested.</li>
        </ul>

        <h2>3. Why each thing is stored</h2>
        <p>Account data to let you sign in. Content and findings so you can come back to a case, correct extracted text, build a verification checklist from it, and share one case for a second opinion. Recovery data so the evidence for a fraud report stays in one place. Sessions to keep you signed in and to let you revoke other devices. The activity log so you can see what happened on your own account.</p>
        <p>None of it is used for anything else. There is no profiling, no model training, no analysis across accounts, and no sale or sharing of content with any third party — because there is no third party in this system at all.</p>

        <h2>4. Who can see your data</h2>
        <p><strong>By default: only you.</strong> Belonging to a family circle gives nobody access to anything.</p>
        <p><strong>Where you share.</strong> When you create a review request, exactly the people you pick get access to exactly that one case, with the scope you chose — findings only, or findings plus the content. The share is recorded, listed in your settings, and revocable. Revocation is enforced on the server, so it blocks the next read rather than hiding a button.</p>
        <p><strong>What sharing never includes.</strong> Your other cases, your history, your recovery cases (unless shared individually), your settings, your email beyond what a member of your circle can already see, or anything you deleted.</p>
        <p><strong>Server operators.</strong> Whoever runs the instance has access to the database file and the server, and therefore to the encryption key. The at-rest encryption protects the database file if it is taken on its own; it does not protect against someone who controls the machine. This is stated plainly rather than implied away.</p>

        <h2>5. Retention</h2>
        <p>Saved checks have a retention period, set to 90 days by default and changeable in your settings, including to &ldquo;keep until I delete it&rdquo;. Expired cases are deleted — findings, excerpts and any shares attached to them go with them.</p>
        <p>Plan limits also cap how many checks are kept: when you exceed the limit, the oldest are deleted rather than silently hidden.</p>
        <p>Sessions expire 30 days after they are created. Notifications remain until you dismiss them.</p>

        <h2>6. Your controls</h2>
        <ul>
          <li><strong>See everything.</strong> Your history, your active shares, your sessions and your activity log are all visible in the application.</li>
          <li><strong>Export everything.</strong> One file, in JSON, including your own content decrypted. Available from <Link href="/settings/privacy">privacy settings</Link>.</li>
          <li><strong>Delete selectively.</strong> A single case, a single attachment, a single recovery case, or all checks at once.</li>
          <li><strong>Revoke sharing.</strong> Any individual share, or everything attached to a review, at any time.</li>
          <li><strong>Leave a circle.</strong> Which also revokes every share you held in it.</li>
          <li><strong>Delete your account.</strong> A hard delete. Related rows are removed by the database itself through cascading deletes, not marked hidden.</li>
        </ul>

        <h2>7. Security measures</h2>
        <p>Passwords are hashed with scrypt at the OWASP-recommended parameters. Session cookies are HTTP-only, same-site and marked secure in production, and only a hash of the token is stored. Mutations are rate-limited. Every private read and write is authorised on the server through ownership or an explicit unrevoked grant. Submitted content is always rendered as text, never as markup, and submitted links are never fetched, followed or made clickable. Uploaded files are validated by their actual magic bytes rather than the declared type, and are size-limited.</p>
        <p>The full threat model, including what is <em>not</em> covered, is in SECURITY.md in the repository.</p>

        <h2>8. Children</h2>
        <p>TrustCircle is intended for adults. It is not designed for use by children, and a family circle is not a parental-control mechanism — it grants no visibility into anyone&apos;s activity.</p>

        <h2>9. Legal status of this document</h2>
        <p>This is a technical description of data handling in an independently built, pre-release application. It is not legal advice and has not been reviewed by a lawyer. A public deployment serving users in India would need to be assessed against the Digital Personal Data Protection Act, 2023 — including notice and consent requirements, the obligations of a Data Fiduciary, breach notification, and the appointment of a point of contact for grievances. That work has not been done, and is listed as a prerequisite in the deployment documentation.</p>

        <h2>10. Changes</h2>
        <p>If this document and the application ever disagree, the application is authoritative and this page is a bug.</p>
      </Prose>

      <Card className="mt-10" tone="sunken">
        <h2 className="font-semibold">Summary, if you read nothing else</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--fg-muted)]">
          <li className="ml-5 list-disc">Codes and card numbers are removed before anything is saved.</li>
          <li className="ml-5 list-disc">Images never leave your device.</li>
          <li className="ml-5 list-disc">Your family sees nothing unless you share one specific case.</li>
          <li className="ml-5 list-disc">You can export everything and delete everything.</li>
          <li className="ml-5 list-disc">There is no advertising, no analytics and no third party.</li>
        </ul>
      </Card>
    </div>
  );
}
