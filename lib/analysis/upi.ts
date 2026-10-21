/**
 * Parses user-supplied UPI deep links / QR payloads.
 *
 * What this does: reads the fields, and explains what each one does and does not prove.
 * What this never does: initiate a payment, open a payment app, contact a PSP, or
 * suggest that a well-formed payload means a trustworthy recipient.
 */
import type { Finding } from './types.ts';

export type UpiIntent = {
  isUpi: boolean;
  /** Payee virtual payment address, e.g. someone@okaxis */
  pa?: string;
  /** Payee name — free text chosen by whoever generated the code. */
  pn?: string;
  amount?: string;
  note?: string;
  /** Merchant category code; absent on person-to-person codes. */
  mc?: string;
  /** Signature parameter used by verified merchant QRs. */
  sign?: string;
  handle?: string;
  unknownParams: string[];
};

const VPA_RE = /\b([a-z0-9._-]{2,64})@([a-z][a-z0-9.-]{1,32})\b/i;
const KNOWN_PARAMS = new Set(['pa', 'pn', 'am', 'tn', 'tr', 'tid', 'mc', 'cu', 'url', 'mode', 'orgid', 'sign', 'purpose', 'mam', 'refUrl']);

export function parseUpi(raw: string): UpiIntent {
  const trimmed = raw.trim();
  if (!/^upi:\/\//i.test(trimmed)) {
    const m = VPA_RE.exec(trimmed);
    // A bare VPA is only treated as one when it is clearly not an email address.
    if (m && !/\.(com|in|org|net|co|io|edu|gov)$/i.test(m[2] ?? '')) {
      return { isUpi: true, pa: m[0], handle: m[2], unknownParams: [] };
    }
    return { isUpi: false, unknownParams: [] };
  }

  const q = trimmed.slice(trimmed.indexOf('?') + 1);
  const params = new URLSearchParams(trimmed.includes('?') ? q : '');
  const get = (k: string): string | undefined => params.get(k) ?? undefined;
  const pa = get('pa');
  return {
    isUpi: true,
    pa,
    pn: get('pn'),
    amount: get('am'),
    note: get('tn'),
    mc: get('mc') ?? undefined,
    sign: get('sign') ?? undefined,
    handle: pa?.split('@')[1],
    unknownParams: [...params.keys()].filter((k) => !KNOWN_PARAMS.has(k)),
  };
}

let seq = 2000;

const f = (
  code: string,
  severity: Finding['severity'],
  title: string,
  explanation: string,
  excerpt?: string,
): Finding => ({ code, category: 'payment_request', severity, title, explanation, excerpt, position: seq++ });

export function analyzeUpi(raw: string): { intent: UpiIntent; findings: Finding[] } {
  seq = 2000;
  const intent = parseUpi(raw);
  const findings: Finding[] = [];
  if (!intent.isUpi) return { intent, findings };

  findings.push(
    f('upi_format_proves_nothing', 'info', 'A valid UPI code tells you nothing about the recipient',
      'TrustCircle can read the fields in this code. It cannot check who owns the account behind it, and a correctly formed code is not evidence of a genuine business.',
      intent.pa),
  );

  if (intent.pn) {
    findings.push(
      f('upi_payee_name_is_free_text', 'caution', `The displayed name "${intent.pn}" was typed in by whoever made this code`,
        'The name shown at payment time comes from the code itself, not from the bank. It can say anything. Only the UPI ID identifies the account, and only your bank can tell you whose it is.',
        intent.pn),
    );
  }

  if (!intent.mc) {
    findings.push(
      f('upi_person_to_person', 'caution', 'This looks like a transfer to an individual, not to a business',
        'Business collections normally carry a merchant category code. Without one, this is a person-to-person transfer — the kind with no chargeback and no merchant to complain to.',
        intent.pa),
    );
  }

  if (!intent.sign && intent.mc) {
    findings.push(
      f('upi_unsigned_merchant', 'caution', 'The merchant code is not signed',
        'Verified merchant QR codes carry a signature. This one claims a merchant category but has nothing attesting to it.',
        intent.pa),
    );
  }

  if (intent.amount) {
    findings.push(
      f('upi_amount_prefilled', 'info', `The amount is fixed at ₹${intent.amount}`,
        'You will not be able to change this at payment time. Check the figure against what you actually agreed, not against what the message says you owe.',
        `am=${intent.amount}`),
    );
  }

  if (intent.unknownParams.length) {
    findings.push(
      f('upi_unknown_params', 'info', 'The code carries fields TrustCircle does not recognise',
        `Unexpected fields (${intent.unknownParams.join(', ')}) are not necessarily harmful, but they mean this code was not produced by a standard payment flow.`,
        intent.unknownParams.join(', ')),
    );
  }

  return { intent, findings };
}

/** Does the claimed payee name share any token with the UPI handle's local part? */
export function payeeNameMatchesVpa(claimedName: string, vpa: string): boolean {
  const local = (vpa.split('@')[0] ?? '').toLowerCase().replace(/[^a-z]/g, '');
  const tokens = claimedName.toLowerCase().split(/[^a-z]+/).filter((t) => t.length >= 4);
  return tokens.some((t) => local.includes(t));
}
