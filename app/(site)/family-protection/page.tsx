import type { Metadata } from 'next';
import { Eye, EyeOff, KeyRound, ShieldOff, Timer, UserMinus } from 'lucide-react';
import { ButtonLink, Card, SectionTitle, Alert, Badge } from '@/components/ui';
import { VERDICTS, STATE_LABEL, REVIEW_STATES } from '@/lib/reviews';

export const metadata: Metadata = {
  title: 'Family protection',
  description: 'Consent-based family collaboration. No monitoring, no admin override, no approve button.',
};

export default function FamilyProtectionPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <SectionTitle
        eyebrow="FamilyShield"
        title="Help from your family, without surveillance of your family"
        lead="Most products in this category protect older relatives by watching them. TrustCircle protects them by making it easy to ask — and by making sure that asking costs them nothing in privacy."
      />

      <Alert tone="info" className="mt-8" title="The design rule">
        Membership of a circle authorises nothing. Not one message, not one scan, not one case. Access exists
        only where someone created a specific, recorded permission for a specific case, and it ends when they
        withdraw it.
      </Alert>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">What a circle administrator can and cannot see</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Card>
            <Eye className="h-5 w-5 text-[var(--color-teal-600)]" aria-hidden />
            <h3 className="mt-2 font-semibold">Can</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--fg-muted)]">
              <li className="ml-5 list-disc">See who is in the circle and when they joined.</li>
              <li className="ml-5 list-disc">Create and revoke invitation links.</li>
              <li className="ml-5 list-disc">Remove a member, which also ends every share that member held.</li>
              <li className="ml-5 list-disc">See cases that were explicitly shared with them, like any other member.</li>
            </ul>
          </Card>
          <Card tone="sunken">
            <EyeOff className="h-5 w-5 text-[var(--fg-muted)]" aria-hidden />
            <h3 className="mt-2 font-semibold">Cannot</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--fg-muted)]">
              <li className="ml-5 list-disc">See any member&apos;s check history.</li>
              <li className="ml-5 list-disc">Open a case that was not shared with them personally.</li>
              <li className="ml-5 list-disc">See which members ran checks, or how many.</li>
              <li className="ml-5 list-disc">Turn on monitoring. There is no such mode in the product.</li>
            </ul>
          </Card>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">How sharing is controlled</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [KeyRound, 'Per case', 'A share covers exactly one case. Sharing a second case is a second decision.'],
            [Eye, 'Per scope', 'Findings only, or findings plus the message. Your choice, per share.'],
            [Timer, 'Time-limited invitations', 'Invitation links expire after seven days and can be revoked before use. Only a hash of the token is stored.'],
            [UserMinus, 'Revocable', 'Withdraw access and the server refuses the next read. Leaving a circle or being removed revokes everything at once.'],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof Eye;
            return (
              <Card key={title as string}>
                <I className="h-5 w-5 text-[var(--accent)]" aria-hidden />
                <h3 className="mt-2 font-semibold">{title as string}</h3>
                <p className="mt-1.5 text-sm text-[var(--fg-muted)]">{body as string}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">What a reviewer is allowed to say</h2>
        <p className="mt-2 max-w-2xl text-[var(--fg-muted)]">
          These are the only four responses in the product. The missing fifth option is deliberate: a relative
          cannot certify a payment or a message, and a button that looked like certification would be the most
          dangerous thing this product could ship.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Object.entries(VERDICTS).map(([key, label]) => (
            <Card key={key} tone="sunken">
              <p className="font-medium">&ldquo;{label}&rdquo;</p>
              <code className="mt-1 block text-xs text-[var(--fg-subtle)]">{key}</code>
            </Card>
          ))}
        </div>
        <Card className="mt-4 border-[var(--alert-border)] bg-[var(--alert-bg)]">
          <div className="flex items-start gap-3">
            <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-[var(--alert-fg)]" aria-hidden />
            <div>
              <p className="font-semibold text-[var(--alert-fg)]">There is no &ldquo;this is safe&rdquo; response</p>
              <p className="mt-1 text-sm text-[var(--alert-fg)] opacity-90">
                Not for reviewers, not for the engine, not anywhere. A second opinion can raise a concern or
                recommend verification. It cannot clear something.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">The states a request moves through</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {REVIEW_STATES.map((s) => (
            <Badge key={s} tone={s === 'closed' || s === 'cancelled' ? 'neutral' : 'accent'}>{STATE_LABEL[s]}</Badge>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-sm text-[var(--fg-muted)]">
          Who may move a request between states is fixed on the server. A reviewer can mark a request as
          needing more information or as reviewed; only the owner can send, cancel or close it. Closing or
          cancelling withdraws the access the request created.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">Without an email provider</h2>
        <Card className="mt-4">
          <p className="text-sm text-[var(--fg-muted)]">
            TrustCircle sends no email. None. That means invitations work by you copying a link and sending it
            however you normally talk to that person. It also means there is no email-based password reset — on
            registration you are shown a one-time recovery code, and that is the only recovery route that
            exists. The app states this at the point where it matters rather than pretending a reset email is
            on its way.
          </p>
        </Card>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <ButtonLink href="/signup">Create a circle</ButtonLink>
        <ButtonLink href="/privacy" tone="secondary">How your data is handled</ButtonLink>
      </div>
    </div>
  );
}
