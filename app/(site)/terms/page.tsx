import type { Metadata } from 'next';
import { SectionTitle, Prose, Alert } from '@/components/ui';

export const metadata: Metadata = { title: 'Terms of service', description: 'The terms on which TrustCircle is provided, and the limits of what it does.' };

const LAST_UPDATED = '20 October 2026';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <SectionTitle eyebrow="Terms of service" title="Terms of use" />
      <p className="mt-3 text-sm text-[var(--fg-subtle)]">Last updated {LAST_UPDATED}</p>

      <Alert tone="caution" className="mt-8" title="The most important term">
        TrustCircle does not and cannot tell you that a message, link, payment, recipient or website is safe.
        It reports which known patterns it matched and helps you verify a claim yourself. An absence of
        warning signs is never evidence of legitimacy, and every decision about what to do remains yours.
      </Alert>

      <Prose>
        <h2>1. What this service is</h2>
        <p>TrustCircle is an informational tool that inspects content you submit against a published list of rules, explains what it found, suggests ways you can verify a claim through your own channels, and lets you ask a trusted contact for a second opinion.</p>

        <h2>2. What this service is not</h2>
        <ul>
          <li>It is not a bank, a payment service, or a financial institution, and it processes no payments.</li>
          <li>It is not an antivirus, endpoint security or malware-removal product.</li>
          <li>It is not a law-enforcement service and cannot file a complaint on your behalf.</li>
          <li>It is not a fraud-prevention guarantee, a fraud-detection certification, or an identity-verification service.</li>
          <li>It does not provide legal, financial or investment advice.</li>
        </ul>

        <h2>3. No warranty of detection</h2>
        <p>The analysis is rule-based. It will miss fraud that does not match its rules, including anything written in a language or style the rules do not cover, and it will sometimes flag ordinary messages. No accuracy figure is published because none has been measured on a representative dataset, and a figure derived from a handful of examples would be misleading.</p>
        <p>The service is provided &ldquo;as is&rdquo;, without warranties of any kind, express or implied, including fitness for a particular purpose. To the maximum extent permitted by law, the operator of this instance is not liable for any loss arising from your use of, or reliance on, its output. Nothing here limits any liability that cannot lawfully be limited.</p>

        <h2>4. Your responsibilities</h2>
        <ul>
          <li>Keep your password and your one-time recovery code safe. There is no email-based password reset, because no email is sent from this application.</li>
          <li>Do not submit other people&apos;s personal data that you have no right to share, and do not submit live credentials. The application removes credentials it recognises, but you should not be pasting them anywhere.</li>
          <li>Share a case only with people you actually trust. A share gives a real person real access until you withdraw it.</li>
          <li>Do not use the service to harass, monitor or investigate another person. Family circles grant no visibility into anyone&apos;s activity and must not be presented to a family member as though they do.</li>
          <li>Do not attempt to access another account&apos;s data. If you find a way to, please report it instead.</li>
        </ul>

        <h2>5. Trusted contacts and second opinions</h2>
        <p>A second opinion is one person&apos;s view, not a verification. Reviewers are deliberately unable to mark anything as safe. Comments are written by other users and are their own statements, not the operator&apos;s. Acting on a reviewer&apos;s comment remains your decision.</p>

        <h2>6. Official resources</h2>
        <p>Links and phone numbers to official bodies are maintained manually and shown with the date each was last checked. They may be out of date. Confirm them on the organisation&apos;s own site before relying on them, and never use a contact detail supplied inside a suspicious message.</p>

        <h2>7. Plans and payment</h2>
        <p>Plan entitlements exist in the application and are enforced. No payment provider is connected, so nothing can be purchased, no charge can be made, and no subscription exists. Prices described anywhere in this application are proposals, not offers. If paid plans are ever introduced, they will require separate terms covering billing, refunds and cancellation under applicable consumer protection law.</p>

        <h2>8. Availability and data</h2>
        <p>This is pre-release software with no uptime commitment. Your data lives in a local database maintained by whoever runs this instance. Keep your own copy of anything important — the export function in your privacy settings produces a complete one.</p>

        <h2>9. Account termination</h2>
        <p>You may delete your account at any time from your settings, which removes your data by cascading deletion. The operator of an instance may suspend an account used to attack the service or to harass another user.</p>

        <h2>10. Intellectual property and third-party names</h2>
        <p>Brand names appearing in rule descriptions and fictional examples are referenced only for the purpose of describing deception patterns. TrustCircle is not affiliated with, endorsed by or connected to any bank, payment network, retailer, courier, government body or law-enforcement agency. Every example in this application is invented and uses domains reserved for documentation.</p>

        <h2>11. Governing law</h2>
        <p>These terms are intended to be read under the laws of India. An instance deployed for public use would need these terms reviewed by a qualified lawyer in the relevant jurisdiction, together with a data protection assessment; that review has not been done.</p>

        <h2>12. Changes</h2>
        <p>These terms may change as the application changes. Where the terms and the application disagree, the application&apos;s actual behaviour is what the operator is bound by, and the discrepancy should be reported.</p>
      </Prose>
    </div>
  );
}
