import type { ClaimType } from './types.ts';

const PATTERNS: Array<{ type: ClaimType; re: RegExp; weight: number }> = [
  { type: 'bank', re: /\b(?:bank|a\/c|account|debit\s*card|credit\s*card|net\s*banking|kyc|ifsc|branch|atm|neft|imps|cheque|loan|emi|खाता|ব্যাংক)\b/giu, weight: 2 },
  { type: 'delivery', re: /\b(?:deliver(?:y|ed)?|parcel|courier|shipment|consignment|tracking|awb|out\s+for\s+delivery|address\s+incomplete|customs|पार्सल|কুরিয়ার)\b/giu, weight: 2 },
  { type: 'payment', re: /\b(?:upi|gpay|phonepe|paytm|qr\s*code|payment\s+request|collect\s+request|pay\s+₹|vpa|@ok[a-z]+|@paytm|@ybl|@axl)\b/gi, weight: 3 },
  { type: 'support', re: /\b(?:customer\s*(?:care|support|service)|help\s*desk|support\s+team|ticket\s+(?:id|number)|complaint\s+(?:id|number)|executive)\b/gi, weight: 2 },
  { type: 'job', re: /\b(?:job|vacancy|hiring|recruit\w*|interview|offer\s+letter|salary|work\s+from\s+home|internship|part[-\s]?time)\b/gi, weight: 2 },
  { type: 'shopping', re: /\b(?:order\s*(?:id|no|number)?|cart|checkout|invoice|return|exchange|cod|cash\s+on\s+delivery|flash\s+sale|coupon)\b/gi, weight: 2 },
  { type: 'utility', re: /\b(?:electricity|bijli|power\s+bill|meter|gas\s+(?:bill|connection)|water\s+bill|broadband|postpaid\s+bill|recharge\s+(?:due|expir)|बिजली)\b/giu, weight: 2 },
  // Impersonation outranks the payment rail it asks you to use: "this is me on my
  // new number, send to this UPI" needs the plan that says ring them on the number
  // you already had, not the one about confirming a payee.
  { type: 'acquaintance', re: /\b(?:friend|cousin|relative)\b/gi, weight: 2 },
  { type: 'acquaintance', re: /\b(?:new\s+number|changed\s+my\s+number|naya\s+number|this\s+is\s+me|this\s+is\s+(?:your\s+)?(?:son|daughter|mummy|papa|beta|bhai|didi|uncle|aunty))\b/gi, weight: 6 },
  // Law-enforcement framing outweighs an incidental noun: the "parcel" in a
  // digital-arrest script is set dressing, not what the message is about.
  { type: 'institution', re: /\b(?:income\s*tax|gst|rbi|uidai|aadhaar|epfo|pan\s+card|trai|municipal|passport|election\s+commission|scholarship|subsidy)\b/gi, weight: 3 },
  { type: 'institution', re: /\b(?:police|cyber\s*cell|cbi|inspector|f\.?i\.?r\.?|warrant|arrest|court\s+(?:case|notice|summons)|narcotics|money\s+laundering|enforcement\s+directorate|digital\s+arrest)\b/gi, weight: 6 },
];

/** Picks the claim type with the strongest keyword evidence; 'unknown' when nothing scores. */
export function classifyClaim(text: string): ClaimType {
  let best: ClaimType = 'unknown';
  let bestScore = 0;
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    const hits = text.match(p.re)?.length ?? 0;
    const score = hits * p.weight;
    if (score > bestScore) {
      bestScore = score;
      best = p.type;
    }
  }
  return bestScore >= 2 ? best : 'unknown';
}

export const CLAIM_LABEL: Record<ClaimType, string> = {
  bank: 'Something claiming to be about your bank account',
  delivery: 'Something claiming to be about a delivery',
  payment: 'A payment or money request',
  support: 'Something claiming to be customer support',
  job: 'A job or earning offer',
  shopping: 'Something claiming to be about an online order',
  utility: 'Something claiming to be about a utility bill',
  acquaintance: 'Someone claiming to be a person you know',
  institution: 'Something claiming to be from a government body',
  unknown: 'Unclear what this is about',
};
