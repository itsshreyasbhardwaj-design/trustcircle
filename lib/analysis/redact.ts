/**
 * Detects values a user should not be storing or sharing, and removes them from the
 * text before anything is saved or shown to a reviewer.
 *
 * Deliberate design choice: we redact the VALUE and keep the surrounding WORDS.
 * "share the OTP 884213 now" becomes "share the OTP ⟨removed: one-time code⟩ now",
 * so the credential-request rule still fires on the sentence while the code itself
 * never reaches the database.
 */
export type SensitiveKind =
  | 'otp'
  | 'card_number'
  | 'card_cvv'
  | 'card_expiry'
  | 'upi_pin'
  | 'password'
  | 'bank_account'
  | 'aadhaar'
  | 'pan';

export type SensitiveHit = { kind: SensitiveKind; label: string; count: number };

export type RedactionResult = {
  text: string;
  hits: SensitiveHit[];
  /** True when something was removed, i.e. the user pasted a live credential. */
  redacted: boolean;
};

const LABELS: Record<SensitiveKind, string> = {
  otp: 'one-time code',
  card_number: 'card number',
  card_cvv: 'card security code',
  card_expiry: 'card expiry',
  upi_pin: 'UPI PIN',
  password: 'password',
  bank_account: 'account number',
  aadhaar: 'Aadhaar number',
  pan: 'PAN',
};

export const sensitiveLabel = (k: SensitiveKind): string => LABELS[k];

function luhn(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return digits.length >= 13 && sum % 10 === 0;
}

type Rule = {
  kind: SensitiveKind;
  re: RegExp;
  /** Index of the capture group holding the value to remove. */
  group: number;
  guard?: (value: string) => boolean;
};

/**
 * Each rule needs a nearby keyword or a self-validating format. A bare 6-digit
 * number is not treated as an OTP — far too many pin codes, amounts and order
 * numbers look like that.
 */
const RULES: Rule[] = [
  // "OTP is 884213", "code: 4321", "otp-884213", "verification code 123456"
  {
    kind: 'otp',
    re: /\b(?:o\.?t\.?p|one[-\s]?time\s*(?:password|code|pin)|verification\s*code|security\s*code|auth(?:entication)?\s*code|ओटीपी|ওটিপি)\b[^0-9\n]{0,24}(\d{4,8})\b/giu,
    group: 1,
  },
  // "884213 is your OTP"
  {
    kind: 'otp',
    re: /\b(\d{4,8})\b[^0-9\n]{0,24}(?=(?:is|as)?\s*(?:your|the)?\s*(?:o\.?t\.?p|one[-\s]?time|verification\s*code))/giu,
    group: 1,
  },
  {
    kind: 'card_number',
    re: /\b((?:\d[ -]?){12,18}\d)\b/g,
    group: 1,
    guard: (v) => luhn(v.replace(/[ -]/g, '')),
  },
  {
    kind: 'card_cvv',
    re: /\b(?:cvv|cvc|cid|card\s*(?:security|verification)\s*(?:code|number))\b[^0-9\n]{0,16}(\d{3,4})\b/gi,
    group: 1,
  },
  {
    kind: 'card_expiry',
    re: /\b(?:exp(?:iry|iration)?|valid\s*(?:thru|till|until))\b[^0-9\n]{0,12}(\d{2}\s*\/\s*\d{2,4})\b/gi,
    group: 1,
  },
  {
    kind: 'upi_pin',
    re: /\b(?:upi\s*pin|m-?pin|mpin|atm\s*pin|transaction\s*pin|यूपीआई\s*पिन)\b[^0-9\n]{0,16}(\d{4,6})\b/giu,
    group: 1,
  },
  {
    kind: 'password',
    re: /\b(?:password|passcode|पासवर्ड|পাসওয়ার্ড)\b\s*(?:is|=|:)\s*(\S{4,64})/giu,
    group: 1,
  },
  {
    kind: 'bank_account',
    re: /\b(?:a\/c|acc(?:oun)?t)\.?\s*(?:no\.?|number|#)?\s*[:\-]?\s*(\d{9,18})\b/gi,
    group: 1,
  },
  // Grouped 4-4-4, or a bare 12-digit run next to the word Aadhaar.
  // The lookarounds stop a 4-4-4-4 reference or card number being mistaken for one:
  // reject a match that has a digit group immediately before or after it.
  { kind: 'aadhaar', re: /(?<!\d)(?<!\d[\s-])(\d{4}[\s-]\d{4}[\s-]\d{4})(?![\s-]*\d)/g, group: 1 },
  {
    kind: 'aadhaar',
    re: /\b(?:aadhaar|aadhar|uidai|आधार|আধার)\b[^0-9\n]{0,20}(\d{12})\b/giu,
    group: 1,
  },
  { kind: 'pan', re: /\b([A-Z]{5}\d{4}[A-Z])\b/g, group: 1 },
];

/** Keyword-only signals: the credential is being *asked for*, with no value present. */
const ASK_PATTERNS: Array<{ kind: SensitiveKind; re: RegExp }> = [
  { kind: 'upi_pin', re: /\b(?:upi\s*pin|m-?pin|mpin|atm\s*pin)\b/i },
  { kind: 'otp', re: /\b(?:o\.?t\.?p|one[-\s]?time\s*(?:password|code|pin))\b/i },
  { kind: 'password', re: /\b(?:password|passcode|login\s*credentials)\b/i },
  { kind: 'card_cvv', re: /\b(?:cvv|cvc)\b/i },
];

export function redact(input: string): RedactionResult {
  const counts = new Map<SensitiveKind, number>();
  let text = input;

  for (const rule of RULES) {
    text = text.replace(rule.re, (match, ...groups) => {
      const value = String(groups[rule.group - 1] ?? '');
      if (!value) return match;
      if (rule.guard && !rule.guard(value)) return match;
      counts.set(rule.kind, (counts.get(rule.kind) ?? 0) + 1);
      return match.replace(value, `⟨removed: ${LABELS[rule.kind]}⟩`);
    });
  }

  const hits: SensitiveHit[] = [...counts.entries()].map(([kind, count]) => ({
    kind,
    label: LABELS[kind],
    count,
  }));

  return { text, hits, redacted: hits.length > 0 };
}

/** Credential types the message *mentions*, whether or not a value was present. */
export function mentionedCredentials(text: string): SensitiveKind[] {
  return ASK_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.kind);
}
