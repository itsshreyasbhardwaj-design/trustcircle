/**
 * VerifyPath: turns "this looks suspicious" into "here is the independent channel
 * to check it on".
 *
 * Non-negotiable rule implemented here: a verification step never reuses a phone
 * number, link or app named inside the content being checked. Every step points at
 * something the user already had before the message arrived.
 */
import type { ClaimType } from './types.ts';

export type VerificationStep = { instruction: string; detail: string };

export type VerificationPlan = {
  claimType: ClaimType;
  title: string;
  /** Stated plainly so the user knows what the scan did *not* establish. */
  unverified: string[];
  steps: VerificationStep[];
  doNotShare: string[];
};

const UNIVERSAL_DO_NOT_SHARE = [
  'Any OTP or one-time code, even to someone who says they sent it',
  'Your UPI PIN, ATM PIN or card CVV — no process ever needs these',
  'Your net-banking password or login details',
  'A screenshot of your banking app or card',
];

const UNIVERSAL_UNVERIFIED = [
  'Who actually sent this. Sender names, numbers and logos can all be set freely.',
  'Whether the organisation named here has any record of this message.',
];

const PLANS: Record<ClaimType, Omit<VerificationPlan, 'claimType'>> = {
  bank: {
    title: 'Check this with your bank, not through the message',
    unverified: [
      ...UNIVERSAL_UNVERIFIED,
      'Whether there is any real problem with your account.',
      'Whether the account or card number quoted is actually yours.',
    ],
    steps: [
      { instruction: 'Close the message. Do not tap any link in it.', detail: 'Leave it open in another app if you want to keep it as evidence, but do not act from inside it.' },
      { instruction: 'Open your bank app from your own phone — the one you already use.', detail: 'Open it from your app list, not from a link. If there is a genuine issue, it appears inside the app.' },
      { instruction: 'Check your recent transactions and any alerts in the app.', detail: 'A real block, debit or KYC requirement will be visible there.' },
      { instruction: 'If you still need to talk to someone, call the number printed on the back of your card.', detail: 'That number came with the card. The number in the message came from the sender.' },
      { instruction: 'Tell the bank what you received, and ask them to confirm whether they sent it.', detail: 'Describe it. Do not read out any code, PIN or password to them either.' },
    ],
    doNotShare: UNIVERSAL_DO_NOT_SHARE,
  },
  delivery: {
    title: 'Check this against the order you actually placed',
    unverified: [
      ...UNIVERSAL_UNVERIFIED,
      'Whether a parcel addressed to you exists at all.',
      'Whether any fee is genuinely due — Indian deliveries are normally prepaid or collected at the door.',
    ],
    steps: [
      { instruction: 'Open the shopping app you ordered from and find the order.', detail: 'If you cannot find a matching order, there is nothing to pay for.' },
      { instruction: 'Compare the tracking number in the message with the one in your order.', detail: 'A tracking number that does not match your order history is not yours.' },
      { instruction: 'If a fee is demanded, stop. Do not pay it online.', detail: 'Genuine charges are shown in the app or collected by the delivery person at your door, against a receipt.' },
      { instruction: 'Contact the courier only through the link inside your order page.', detail: 'Not through the number or link in the message.' },
    ],
    doNotShare: [...UNIVERSAL_DO_NOT_SHARE, 'Your full address and phone number in reply to an unsolicited message'],
  },
  payment: {
    title: 'Confirm the recipient before any money moves',
    unverified: [
      ...UNIVERSAL_UNVERIFIED,
      'Who owns the UPI ID or account you have been asked to pay. Only the bank can establish that.',
      'Whether the name displayed at payment time belongs to the account — that text is set by whoever made the code.',
    ],
    steps: [
      { instruction: 'Do not pay yet. Nothing here expires in the next ten minutes, whatever it says.', detail: 'A pause costs nothing. A transfer to the wrong person is usually unrecoverable.' },
      { instruction: 'Contact the person or business you believe you are paying, on a number you already had.', detail: 'Your contacts, their printed invoice, or their official app — not the number that sent the request.' },
      { instruction: 'Ask them to confirm the exact UPI ID or account number.', detail: 'Read it back to them digit by digit. Payment detail swaps are the whole point of invoice fraud.' },
      { instruction: 'If this is a first payment to a new recipient, send a token ₹1 first and confirm receipt.', detail: 'Only after they confirm on the channel you called them on.' },
      { instruction: 'Never scan a QR code in order to *receive* money.', detail: 'Scanning sends money out. There is no receive-by-scanning flow in UPI.' },
    ],
    doNotShare: [...UNIVERSAL_DO_NOT_SHARE, 'Any "approve" or "collect" request you did not initiate yourself'],
  },
  support: {
    title: 'Reach support yourself instead of being reached',
    unverified: [...UNIVERSAL_UNVERIFIED, 'Whether any ticket or complaint number quoted exists.'],
    steps: [
      { instruction: 'Do not call back the number given to you.', detail: 'Fake support numbers are placed where people search for them, and sent in messages like this one.' },
      { instruction: 'Open the company\'s own app, or type its address yourself into the browser.', detail: 'Reach the help section from inside the app or site you navigated to by hand.' },
      { instruction: 'Raise your own ticket and quote nothing from the message.', detail: 'If their records show no issue, the message was not theirs.' },
      { instruction: 'Refuse any request to install a screen-sharing or remote-support app.', detail: 'No legitimate support process needs control of your phone.' },
    ],
    doNotShare: [...UNIVERSAL_DO_NOT_SHARE, 'Remote access to your phone or computer'],
  },
  job: {
    title: 'Verify the employer exists and that nothing is payable',
    unverified: [...UNIVERSAL_UNVERIFIED, 'Whether the company exists, and whether this role exists.'],
    steps: [
      { instruction: 'Look up the company independently and find its official careers page.', detail: 'Search for it yourself. Do not use the link you were sent.' },
      { instruction: 'Check that the role is actually posted there.', detail: 'A job that exists only in a WhatsApp message does not exist.' },
      { instruction: 'Treat any request for money as the end of the conversation.', detail: 'Registration fees, training fees, deposits and "refundable security" are the scam, not a step in hiring.' },
      { instruction: 'Do not send identity documents before you have confirmed the employer.', detail: 'Document copies feed identity fraud and loan applications in your name.' },
    ],
    doNotShare: [...UNIVERSAL_DO_NOT_SHARE, 'Scans of your Aadhaar, PAN or passport', 'Bank account details "for salary setup" before an offer is verified'],
  },
  shopping: {
    title: 'Check the order inside the shop\'s own app',
    unverified: [...UNIVERSAL_UNVERIFIED, 'Whether the order, refund or offer referred to exists on your account.'],
    steps: [
      { instruction: 'Open the shopping app and look at your own order list.', detail: 'Offers, refunds and problems all show up on your account if they are real.' },
      { instruction: 'Compare prices with the normal listing inside the app.', detail: 'A price far below the app\'s own is a lure, not a sale.' },
      { instruction: 'Never complete a purchase or refund on a page you reached from a message.', detail: 'Go through the app you already have installed.' },
    ],
    doNotShare: UNIVERSAL_DO_NOT_SHARE,
  },
  utility: {
    title: 'Check the bill with your provider directly',
    unverified: [...UNIVERSAL_UNVERIFIED, 'Whether any bill is actually overdue, and whether the consumer number quoted is yours.'],
    steps: [
      { instruction: 'Find your consumer or connection number on an old bill.', detail: 'Compare it with the one in the message. A mismatch settles it immediately.' },
      { instruction: 'Open the provider\'s official app or website yourself and check the dues.', detail: 'Type the address in, or use an app you already have.' },
      { instruction: 'Ignore any threat of same-night disconnection.', detail: 'Disconnection follows a written notice process. It does not happen because you ignored an SMS.' },
      { instruction: 'Pay only through the provider\'s own payment page or an authorised counter.', detail: 'Never through a link, and never to a personal UPI ID.' },
    ],
    doNotShare: UNIVERSAL_DO_NOT_SHARE,
  },
  acquaintance: {
    title: 'Confirm with the person on a number you already have',
    unverified: [
      ...UNIVERSAL_UNVERIFIED,
      'Whether the person named is actually involved. A name, a photo and a relationship are all easy to copy.',
    ],
    steps: [
      { instruction: 'Do not reply to the new number.', detail: 'Replying tells the sender the approach is working.' },
      { instruction: 'Call the person on the number already saved in your contacts.', detail: 'Call, do not message. Hearing them answer is the check.' },
      { instruction: 'If they do not answer, ask another family member who speaks to them.', detail: 'Two independent confirmations are better than one.' },
      { instruction: 'Ask something only they would know — and not something from social media.', detail: 'Not a birthday or a school name. Something unpublished.' },
      { instruction: 'Send no money until you have spoken to them directly.', detail: 'The urgency in the message exists to stop exactly this call.' },
    ],
    doNotShare: [...UNIVERSAL_DO_NOT_SHARE, 'Money, until you have spoken to the person on a number you already had'],
  },
  institution: {
    title: 'Check with the department through its own channels',
    unverified: [
      ...UNIVERSAL_UNVERIFIED,
      'Whether any notice, case or dues exist in your name.',
      'Whether the officer, department or case number quoted is real.',
    ],
    steps: [
      { instruction: 'Do not join a video call and do not stay on the line.', detail: 'No Indian agency conducts an arrest, an interrogation or a settlement over a video call. That format is the scam itself.' },
      { instruction: 'Log in to the department\'s own portal yourself and check for notices.', detail: 'Type the address in by hand. Government notices appear on your account, not only in a message.' },
      { instruction: 'Speak to someone before you act — a family member, a lawyer, or your bank.', detail: 'Pressure to tell nobody is the clearest sign that this is not an official process.' },
      { instruction: 'Pay nothing. No department settles a case by UPI transfer.', detail: 'Fines and dues are paid through official challans on official portals.' },
    ],
    doNotShare: [...UNIVERSAL_DO_NOT_SHARE, 'Your Aadhaar or PAN number', 'Video of yourself, your home, or your documents'],
  },
  unknown: {
    title: 'General checks before you act on this',
    unverified: [...UNIVERSAL_UNVERIFIED, 'What this message is actually about, from the content supplied.'],
    steps: [
      { instruction: 'Identify who the message claims to be from, and reach them yourself.', detail: 'Use a channel you already had: an installed app, a printed document, or a saved contact.' },
      { instruction: 'Do not use any link, number or QR code supplied in the content.', detail: 'Those lead back to whoever sent it.' },
      { instruction: 'Ask someone you trust to read it with you.', detail: 'A second pair of eyes catches what urgency hides. TrustCircle can send it to a trusted contact for you.' },
    ],
    doNotShare: UNIVERSAL_DO_NOT_SHARE,
  },
};

export function buildVerificationPlan(claimType: ClaimType): VerificationPlan {
  return { claimType, ...PLANS[claimType] };
}
