/**
 * Locally maintained directory of official resources.
 *
 * Rules for this file:
 *  - Every entry records where it was checked and when. Nothing goes in unverified.
 *  - Nothing here is "live". The app always labels these as "last checked on <date>"
 *    and tells the user to confirm on the organisation's own site.
 *  - Phone numbers and links that arrive inside a suspicious message are NEVER
 *    promoted into this list. See `lib/analysis/signals.ts` (contact_channel_in_message).
 */
export type OfficialResource = {
  slug: string;
  organisation: string;
  what: string;
  /** Use for this exact situation. */
  useWhen: string;
  website?: string;
  phone?: string;
  /** Where the entry was verified. */
  source: string;
  /** ISO date this entry was last checked by a maintainer. */
  checkedOn: string;
  /** Honest caveats the UI must show alongside the entry. */
  limitations: string[];
  tags: Array<'fraud_report' | 'financial_fraud' | 'telecom_fraud' | 'bank_escalation'>;
};

export const DIRECTORY_CHECKED_ON = '2026-10-20';

export const officialResources: OfficialResource[] = [
  {
    slug: 'ncrp',
    organisation: 'National Cyber Crime Reporting Portal (Ministry of Home Affairs, India)',
    what: 'The government portal for filing a written cybercrime complaint.',
    useWhen: 'You want to file a formal complaint about online fraud, impersonation or a cyber offence.',
    website: 'https://cybercrime.gov.in',
    source: 'cybercrime.gov.in responded as the "Cybercrime Portal"; corroborated by the DoT short-code circular on dotws.cdot.in and the Wikipedia entry for the National Cybercrime Reporting Portal.',
    checkedOn: '2026-10-20',
    limitations: [
      'TrustCircle cannot file a complaint for you and has no integration with this portal.',
      'Reporting does not guarantee that money is recovered.',
    ],
    tags: ['fraud_report'],
  },
  {
    slug: 'helpline-1930',
    organisation: 'Cyber financial fraud helpline 1930 (Ministry of Home Affairs, India)',
    what: 'Phone helpline for reporting money already lost to cyber fraud.',
    useWhen: 'Money has already left your account. Call first — speed matters most here.',
    phone: '1930',
    source: 'Department of Telecommunications circular allocating short code 1930 to the MHA for the National Cyber Crime Reporting Portal (dotws.cdot.in), corroborated by Kerala Police and Tribune India notices.',
    checkedOn: '2026-10-20',
    limitations: [
      'Reported as a 24x7 line by state police notices, but we could not confirm current hours on a central government page — if it does not connect, use the portal as well.',
      'Dial 1930 from an Indian phone number. It is not reachable from outside India.',
    ],
    tags: ['fraud_report', 'financial_fraud'],
  },
  {
    slug: 'sanchar-saathi-chakshu',
    organisation: 'Sanchar Saathi — Chakshu (Department of Telecommunications, India)',
    what: 'Reports a suspected fraud call, SMS or WhatsApp message.',
    useWhen: 'You received a suspicious communication but have not lost money.',
    website: 'https://sancharsaathi.gov.in',
    source: 'sancharsaathi.gov.in (Government of India) plus HDFC Bank and Outlook Money guides describing the Chakshu flow.',
    checkedOn: '2026-10-20',
    limitations: [
      'Chakshu is for suspected attempts only. If money is already gone, use 1930 and the cybercrime portal instead.',
      'Reports are expected within 30 days of receiving the communication.',
    ],
    tags: ['telecom_fraud'],
  },
  {
    slug: 'rbi-cms',
    organisation: 'Reserve Bank of India — Complaint Management System',
    what: 'Escalation route for a complaint your bank has not resolved.',
    useWhen: 'You complained to your bank and got no resolution in 30 days, or an unsatisfactory one.',
    website: 'https://cms.rbi.org.in',
    source: 'RBI press release announcing the Complaint Management System (rbi.org.in, PR 47383); process corroborated by Business Standard, Nov 2025.',
    checkedOn: '2026-10-20',
    limitations: [
      'Go to your bank first. RBI CMS is an escalation, not a first report.',
      'Eligibility and timelines change — confirm them on rbi.org.in before filing.',
    ],
    tags: ['bank_escalation'],
  },
];

/**
 * Deliberately NOT in this file: bank phone numbers and bank websites.
 * We will not hand a user a bank contact detail we cannot keep current — a stale
 * "official" number is exactly the failure mode this product exists to prevent.
 * VerifyPath instead tells the user where to find it themselves: the back of their
 * card, their passbook, or the bank's own app.
 */
export const selfSourcedChannels = [
  {
    slug: 'bank-card-back',
    label: 'The number printed on the back of your bank card',
    why: 'It came with the card, not from the message you are checking.',
  },
  {
    slug: 'bank-app',
    label: 'Your bank\'s own app, opened from your phone\'s app library',
    why: 'Open the app you already use. Do not follow a link from the message.',
  },
  {
    slug: 'passbook-statement',
    label: 'Your passbook or an old account statement',
    why: 'Printed by the bank before this message existed.',
  },
  {
    slug: 'known-contact',
    label: 'A phone number you already had saved for this person',
    why: 'Call the number in your contacts, not the new number that messaged you.',
  },
  {
    slug: 'merchant-order-history',
    label: 'The order history inside the shopping app you actually ordered from',
    why: 'A real delivery problem shows up against a real order.',
  },
] as const;
