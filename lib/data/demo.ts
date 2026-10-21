/**
 * Fictional examples used in the marketing demo and the optional demo seed.
 *
 * Rules for this file:
 *  - Every domain is an RFC 2606 / RFC 6761 reserved example domain. No live link,
 *    no real brand domain, no working shortener.
 *  - Every name, number, amount and account is invented.
 *  - The analysis shown next to these in the UI is produced by running the real
 *    engine on them at render time. Nothing is a hand-written mock-up.
 */
import type { ScanKind } from '../analysis/index.ts';

export type DemoCase = {
  slug: string;
  label: string;
  /** What the person receiving this would have been doing. */
  context: string;
  kind: ScanKind;
  content: string;
  payment?: { claimedPayee?: string; amountRupees?: string; reason?: string; channel?: string };
};

export const demoCases: DemoCase[] = [
  {
    slug: 'bank-kyc',
    label: 'A message claiming your bank account will be blocked',
    context: 'Arrived as an SMS at 9:40 pm from a sender ID that looked like a bank short code.',
    kind: 'text',
    content:
      'URGENT: Dear Customer, your account will be SUSPENDED within 24 hours as your KYC is incomplete. ' +
      'Complete it immediately at https://sbi.kyc-update.example.net/verify to avoid deactivation. ' +
      'Our executive will call you — please share the OTP sent to your registered number for verification. ' +
      'Helpline 9812345670.',
  },
  {
    slug: 'delivery-fee',
    label: 'A delivery that needs a small payment to be released',
    context: 'Arrived on WhatsApp the day a real parcel was expected.',
    kind: 'text',
    content:
      'Your parcel BD889214 could not be delivered as the address is incomplete. ' +
      'Pay a delivery charge of Rs.38 to reschedule: https://bit.ly/exmpl-parcel ' +
      'Last attempt will be made today, after that the parcel is returned to sender.',
  },
  {
    slug: 'family-new-number',
    label: 'Someone claiming to be family on a new number',
    context: 'Arrived on WhatsApp from an unsaved number with no profile photo.',
    kind: 'text',
    content:
      'Papa, this is me. My phone fell in water so this is my new number, please save it. ' +
      'I am stuck and need Rs 24,000 urgently for a hospital deposit, I will return it tomorrow when my ' +
      'salary comes. Please do not tell mummy, she will panic. Send on this UPI: rahul9988@okexample',
  },
  {
    slug: 'payment-refund-qr',
    label: 'A refund that asks you to scan a QR code',
    context: 'A caller claiming to be from a shopping app support team sent this while on the phone.',
    kind: 'payment',
    content: 'upi://pay?pa=stranger4471@okexample&pn=Example%20Shop%20Refund%20Cell&am=2499&cu=INR&tn=Refund%20processing',
    payment: {
      claimedPayee: 'Example Shop Refund Cell',
      amountRupees: '2499',
      reason: 'Processing fee to release my refund — they said scan this QR to receive the money',
      channel: 'Phone call, then WhatsApp',
    },
  },
  {
    slug: 'merchant-link',
    label: 'An unfamiliar shopping link with a familiar-looking name',
    context: 'Forwarded in a family group as a festival sale.',
    kind: 'url',
    content: 'https://flipkart.festive-offers.example.org/win?ref=whatsapp',
  },
  {
    slug: 'digital-arrest',
    label: 'A caller claiming to be the police',
    context: 'A WhatsApp video call followed by this message.',
    kind: 'text',
    content:
      'This is Inspector from Cyber Cell. A parcel in your name contained illegal items. ' +
      'An FIR is being registered and a non-bailable warrant will be issued. ' +
      'Stay on this video call for verification and do not tell anyone, including your family, ' +
      'as this is a confidential investigation. A settlement amount of Rs 85,000 must be transferred immediately ' +
      'to close the case.',
  },
  {
    slug: 'ordinary-message',
    label: 'An ordinary message, for contrast',
    context: 'Included to show what the engine does when nothing matches.',
    kind: 'text',
    content: 'Hi Ma, reaching home around 8 tonight. Shall I pick up vegetables on the way? The traffic looks fine.',
  },
];

export const demoBySlug = (slug: string): DemoCase | undefined => demoCases.find((c) => c.slug === slug);
