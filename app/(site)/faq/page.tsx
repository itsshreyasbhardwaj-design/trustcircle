import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, SectionTitle, ButtonLink } from '@/components/ui';

export const metadata: Metadata = { title: 'FAQ', description: 'Straight answers about what TrustCircle does and does not do.' };

const GROUPS: Array<{ heading: string; items: Array<[string, React.ReactNode]> }> = [
  {
    heading: 'What it can and cannot tell you',
    items: [
      ['Can TrustCircle tell me whether a message is a scam?',
        'It tells you which known warning signs appear in it, and quotes the words that matched. It will not call something definitely fraudulent or definitely genuine, because it cannot verify who sent a message or who owns an account.'],
      ['What does "no known warning signs identified" mean?',
        'That none of the rules in the published list matched. It is a statement about the checks, not about the content. Anything asking for money, codes or personal details still needs independent verification.'],
      ['Why is there no risk score or percentage?',
        'Because any number would be made up. The engine is a set of rules, not a trained model, and there is no labelled dataset behind it. A fabricated confidence figure is worse than none, because people act on numbers.'],
      ['Does it use AI?',
        'No. There is no model, no API call, and no external service in the analysis path. Every finding comes from a rule you can read on the features page. That is a limitation as much as a design choice: the rules miss what they were not written for.'],
      ['Does it check whether a website is known to be malicious?',
        'No. There is no threat-intelligence feed and no reputation lookup, and no suspicious link is ever opened or fetched. Links are inspected purely as text, so a brand-new scam domain looks like any other unknown domain.'],
    ],
  },
  {
    heading: 'Privacy and family access',
    items: [
      ['Can my family see my messages?',
        'No. Being in the same circle gives nobody access to anything. A case becomes visible to one specific person only when you share it, with the scope you choose, until you withdraw it.'],
      ['Can a circle administrator monitor the rest of the family?',
        <>No. There is no monitoring mode, no admin override and no activity feed of other people&apos;s checks. See <Link href="/family-protection">family protection</Link> for exactly what an administrator can and cannot see.</>],
      ['What happens to a screenshot I upload?',
        'It is read in your own browser. Text extraction and QR decoding happen on your device, and the image is never uploaded. Only the text you confirm reaches the server.'],
      ['Is my message content encrypted?',
        'Yes, at rest, with a key stored outside the database. That protects the content if the database file is taken on its own. It does not protect against someone who controls the whole server, and the security documentation says so.'],
      ['Can I delete everything?',
        <>Yes. Individual cases, all cases at once, or the whole account — in which case every related row is removed by the database itself. You can also export everything first from <Link href="/privacy">your privacy settings</Link>.</>],
      ['Do you sell or advertise against my data?',
        'No. There is no advertising, no analytics service, no third-party script and no data sale. The only analytics are counts of your own cases, shown to you.'],
    ],
  },
  {
    heading: 'Money and reporting',
    items: [
      ['Money has already left my account. What do I do?',
        <><strong>Do not start with a scan.</strong> Call your bank and report an unauthorised transaction, then call 1930. Funds can sometimes be held while they are still in the receiving account, which is often a matter of hours. <Link href="/recovery">The recovery guide</Link> has the order.</>],
      ['Can TrustCircle file a complaint for me?',
        'No. There is no authorised integration with any bank, portal or authority. It gives you the official channels, in order, with the date each was checked, and helps you organise the evidence you will need.'],
      ['Will it recover my money?',
        'It cannot, and it will never say otherwise. Anyone promising recovery for a fee is running a second scam that specifically targets people who have already lost money.'],
      ['Does it ever need my bank or UPI credentials?',
        'Never. No account number, card number, OTP, PIN or password is needed for anything in this product. The app actively removes those values from content you submit.'],
      ['Can it verify who owns a UPI ID?',
        'No. Only your bank can do that. TrustCircle can read the fields in a UPI code and explain which of them prove nothing — including the payee name, which is free text typed in by whoever generated the code.'],
    ],
  },
  {
    heading: 'Accounts, languages and platforms',
    items: [
      ['I forgot my password. Can you email me a reset link?',
        'No, because no email provider is configured and no email is sent from this application at all. On registration you are shown a one-time recovery code; that is the only recovery route that exists. Keep it somewhere safe.'],
      ['Why do invitations not arrive by email?',
        'Same reason. You copy the invitation link and send it to the person however you normally talk to them. The link expires in seven days and can be revoked.'],
      ['Which languages are supported?',
        <>English, Hindi and Bengali for the interface and safety guidance. Where a string has no translation yet, English is shown and <em>labelled</em> as English. Detection rules for Hindi and Bengali cover the most common phrases only, and a result containing those scripts says so.</>],
      ['Is there a mobile app?',
        'It is a responsive web application that installs as a PWA, so it can be added to a home screen and opened like an app. There is no native iOS or Android build.'],
      ['Can I use it offline?',
        'The analysis needs no external service, but it does run on the server, so the page itself needs to reach the application. There is no offline-first sync layer.'],
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <SectionTitle
        eyebrow="FAQ"
        title="Common questions"
        lead="If an answer here ever contradicts the application, the application is right and this page is a bug."
      />
      <div className="mt-12 space-y-12">
        {GROUPS.map((group) => (
          <section key={group.heading}>
            <h2 className="text-xl font-semibold">{group.heading}</h2>
            <div className="mt-5 space-y-3">
              {group.items.map(([q, a]) => (
                <Card key={q} as="article">
                  <h3 className="font-semibold">{q}</h3>
                  <div className="mt-1.5 text-sm leading-relaxed text-[var(--fg-muted)] [&_a]:text-[var(--accent)] [&_a]:underline [&_strong]:text-[var(--fg)]">{a}</div>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <ButtonLink href="/signup">Create a free account</ButtonLink>
        <ButtonLink href="/contact" tone="secondary">Ask something else</ButtonLink>
      </div>
    </div>
  );
}
