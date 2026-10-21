/**
 * Transparent, rule-based warning-signal extraction.
 *
 * Every rule is a regular expression plus a plain-language explanation. There is no
 * model, no score, no probability. If a rule fires, the user is shown the exact words
 * that fired it. If no rule fires, the app says so and says that this is not a
 * safety verdict.
 *
 * Conservatism is enforced in two places:
 *   1. individual rules require a specific pattern, not a single emotive word;
 *   2. `lib/analysis/index.ts` needs more than one ordinary warning sign before it
 *      will call a result "warning signs detected".
 *
 * Language coverage: English is the most developed. Hindi and Bengali have keyword
 * coverage for the highest-signal phrases only (both Latin-transliterated and native
 * script). This gap is disclosed to the user in the result UI and in LIMITATIONS.md.
 */
import type { Category, Finding, Severity } from './types.ts';
import { mentionedCredentials } from './redact.ts';

export type SignalContext = {
  /** Redacted content. */
  text: string;
  hasLink: boolean;
  hasUpiTarget: boolean;
};

type Rule = {
  code: string;
  category: Category;
  severity: Severity;
  title: string;
  explanation: string;
  re: RegExp;
  /** Extra condition beyond the regex. */
  when?: (ctx: SignalContext) => boolean;
};

/**
 * `\b` in JavaScript is ASCII-only: `/\bतुरंत\b/u` never matches, because a space and
 * a Devanagari letter are both "non-word" characters. Every rule therefore uses these
 * Unicode-aware boundaries instead, which is what makes the Hindi and Bengali keywords
 * below actually fire.
 */
const B0 = String.raw`(?<![\p{L}\p{N}_])`;
const B1 = String.raw`(?![\p{L}\p{N}_])`;
/** Wraps an alternation in Unicode word boundaries. */
const w = (alternation: string): string => `${B0}(?:${alternation})${B1}`;
const rx = (source: string): RegExp => new RegExp(source, 'giu');

const excerptAround = (text: string, index: number, length: number): string => {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + length + 40);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
};

// ---------- shared vocabulary ----------
const THREAT_VERB =
  String.raw`block(?:ed|ing)?|suspend(?:ed|ing)?|deactivat\w*|freez\w*|frozen|clos(?:ed|ing)?|terminat\w*|disconnect(?:ed|ing)?|seiz\w*|band\s+ho\w*|बंद|बन्द|ब्लॉक|निष्क्रिय|बंद\s+हो|বন্ধ|ব্লক`;
const THREAT_NOUN =
  String.raw`account|a\/c|card|sim|kyc|service|connection|wallet|upi|electricity|meter|gas|khata|खाता|अकाउंट|कार्ड|सिम|बिजली|अ्ंकाउंट|অ্যাকাউন্ট|কার্ড|সিম|বিদ্যুৎ`;
const ASK_VERB =
  String.raw`share|send|tell|give|provide|confirm|verify|type|enter|forward|read\s+out|batao?|bataiye|bhejo?|बताओ|बताइए|बता\s*दो|भेजो|भेज\s*दो|दीजिए|পাঠান|পাঠিয়ে|বলুন|বলো|দিন`;
const SECRET =
  String.raw`o\.?t\.?p|one[-\s]?time\s*(?:password|code|pin)|pin(?!\s*code)|m-?pin|mpin|cvv|cvc|password|passcode|ओटीपी|पासवर्ड|पिन|ওটিপি|পাসওয়ার্ড|পিন`;

const RULES: Rule[] = [
  // ---------- pressure ----------
  {
    code: 'urgency_deadline',
    category: 'urgency',
    severity: 'caution',
    title: 'A deadline is being used to rush you',
    explanation:
      'A short deadline is there to stop you checking. Real organisations give you time, and nothing legitimate stops being possible because you waited an hour to verify it.',
    re: rx(
      w(
        String.raw`with?in\s+(?:the\s+next\s+)?\d{1,3}\s*(?:min(?:ute)?s?|hours?|hrs?)|before\s+(?:midnight|today|tonight|\d{1,2}\s*(?:am|pm))|(?:expires?|validity|closing)\s+(?:today|tonight|in\s+\d+)|last\s+(?:chance|warning|reminder)|final\s+(?:notice|warning|reminder)|turant|abhi\s*hi|jald?i\s*se|तुरंत|फ़ौरन|फौरन|अभी\s*ही|जल्दी\s*से|এখনই|অবিলম্বে|সত্বর`,
      ),
    ),
  },
  {
    code: 'urgency_immediate',
    category: 'urgency',
    severity: 'caution',
    title: 'The message demands immediate action',
    explanation:
      'Urgency plus instructions is the core of almost every scam script. Treat "immediately" as a reason to slow down, not to hurry.',
    re: rx(w(String.raw`immediate(?:ly)?|urgent(?:ly)?|right\s+now|at\s+once|without\s+delay|do\s+(?:it\s+)?now|hurry`)),
  },

  // ---------- threats ----------
  {
    code: 'account_threat',
    category: 'threat',
    severity: 'high',
    title: 'It threatens to block or close something you depend on',
    explanation:
      'Threatening an account, SIM, card or connection is a pressure tactic. Your bank or operator does not stop a service because you did not reply to a message.',
    re: rx(
      `${w(THREAT_VERB)}[^.\\n]{0,60}${w(THREAT_NOUN)}|${w(THREAT_NOUN)}[^.\\n]{0,60}${w(THREAT_VERB)}`,
    ),
  },
  {
    code: 'legal_threat',
    category: 'threat',
    severity: 'high',
    title: 'It threatens police, arrest or legal action',
    explanation:
      'Police and courts do not open cases over SMS or WhatsApp, and no agency conducts an arrest over a video call. This threat exists to produce panic, which is when people stop checking.',
    re: rx(
      w(
        String.raw`arrest(?:ed|ing)?|warrant|non-?bailable|f\.?i\.?r\.?|legal\s+action|court\s+(?:case|notice|summons)|police\s+(?:case|complaint|verification)|digital\s+arrest|cbi|narcotics|money\s+laundering|customs\s+(?:seiz|detain)\w*|girafta?ar|गिरफ्तार|पुलिस\s+केस|वारंट|গ্রেপ্তার|ওয়ারেন্ট`,
      ),
    ),
  },

  // ---------- secrets ----------
  {
    code: 'credential_request',
    category: 'credential_request',
    severity: 'high',
    title: 'It asks you to hand over a code, PIN or password',
    explanation:
      'No bank, delivery company, government office or support desk ever needs your OTP, PIN, CVV or password. Anyone asking for one is trying to use your account, not help you with it.',
    re: rx(`${w(ASK_VERB)}[^.\\n]{0,50}${w(SECRET)}`),
  },
  {
    code: 'credential_request_reverse',
    category: 'credential_request',
    severity: 'high',
    title: 'It asks for a code it says it just sent you',
    explanation:
      'A code sent to your phone is how a system checks that *you* are acting. Reading it out to someone else hands them that action — most often a payment or a password reset.',
    re: rx(`${w(SECRET)}[^.\\n]{0,45}${w(ASK_VERB)}`),
  },
  {
    code: 'credential_never_asked',
    category: 'credential_request',
    severity: 'caution',
    title: 'The message brings up a secret you should never be asked for',
    explanation:
      'This mentions a credential that no legitimate process asks a customer to disclose. Even if the wording sounds like a warning, be careful about what the next message asks for.',
    re: rx(w(String.raw`upi\s*pin|m-?pin|mpin|atm\s*pin|cvv|cvc|net\s*banking\s+password|login\s+credentials`)),
    when: (ctx) => mentionedCredentials(ctx.text).length > 0,
  },

  // ---------- device control ----------
  {
    code: 'remote_access_request',
    category: 'remote_access',
    severity: 'high',
    title: 'It asks you to install a remote-control app',
    explanation:
      'Screen-sharing and remote-support apps let the other person operate your phone, including your banking app. Support staff for a bank or wallet will never ask you to install one.',
    re: rx(
      w(
        String.raw`anydesk|teamviewer|quick\s*support|quicksupport|airdroid|vysor|screen\s*shar\w*|screen\s*mirror\w*|remote\s*(?:access|desktop|support)|alpemix|rustdesk`,
      ),
    ),
  },
  {
    code: 'install_apk_request',
    category: 'remote_access',
    severity: 'high',
    title: 'It asks you to install an app from outside the app store',
    explanation:
      'Side-loaded apps bypass store checks. This is how banking-overlay and SMS-reading malware is delivered in India. Install apps only from the Play Store or App Store.',
    re: rx(
      `${w(String.raw`install|download|side-?load`)}[^.\\n]{0,40}${w(String.raw`apk|from\s+(?:this|the)\s+link|attached\s+file`)}|\\.apk${B1}`,
    ),
  },

  // ---------- money ----------
  {
    code: 'advance_fee',
    category: 'payment_request',
    severity: 'high',
    title: 'It asks for a payment before you receive something',
    explanation:
      'Paying a fee to unlock a refund, prize, parcel, loan or job is the oldest pattern there is. Money you are genuinely owed never requires you to send money first.',
    re: rx(
      `${w(String.raw`processing|clearance|clearing|handling|customs|registration|security|refundable|convenience|delivery|courier|gst|tax|legal|verification`)}\\s*${w(String.raw`fee|fees|charge|charges|deposit|amount`)}|${w(String.raw`pay|deposit|transfer|send`)}[^.\\n]{0,50}${w(String.raw`to\s+(?:receive|claim|release|unlock|get)|before\s+(?:delivery|release|refund|disbursal)`)}`,
    ),
  },
  {
    code: 'payment_request',
    category: 'payment_request',
    severity: 'caution',
    title: 'It asks you to send money',
    explanation:
      'A payment request on its own is not proof of anything — but who you are paying cannot be checked from the request itself. Confirm the recipient through a channel you already had.',
    re: rx(
      `${w(String.raw`pay|paid|payment|transfer|deposit|remit|recharge|upi|gpay|phonepe|paytm|neft|imps|rtgs|send\s+(?:money|rs\.?|inr)|scan\s+(?:the\s+)?qr|qr\s*code|paise?\s+bhej\w*|पैसे?\s+भेज\w*|टाका|টাকা\s+পাঠা\w*`)}|₹\\s?\\d|${B0}rs\\.?\\s?\\d|${B0}inr\\s?\\d`,
    ),
  },
  {
    code: 'refund_requires_details',
    category: 'payment_request',
    severity: 'caution',
    title: 'A refund is offered, but only if you do something first',
    explanation:
      'A genuine refund goes back the way the money came, with no form to fill and no code to confirm. A refund that needs your details or a small payment is a way in, not a way back.',
    re: rx(
      `${w(String.raw`refund|cashback|reversal|claim\s+your|amount\s+credited`)}[^.\\n]{0,70}${w(String.raw`click|link|form|share|confirm|verify|complete|pay|scan`)}`,
    ),
  },
  {
    code: 'qr_to_receive_money',
    category: 'payment_request',
    severity: 'high',
    title: 'It says to scan a QR code in order to receive money',
    explanation:
      'Scanning a QR code sends money out of your account. There is no QR code in UPI that pulls money in. Anyone telling you otherwise is reversing the direction on purpose.',
    re: rx(
      `${w(String.raw`scan|scanning`)}[^.\\n]{0,50}${w(String.raw`to\s+(?:receive|get|collect)|and\s+(?:you\s+will\s+)?(?:receive|get)`)}|${w(String.raw`receive|get|collect`)}[^.\\n]{0,30}${w(String.raw`scan(?:ning)?\s+(?:the\s+)?qr`)}`,
    ),
  },

  // ---------- identity ----------
  {
    code: 'authority_claim',
    category: 'authority_claim',
    severity: 'caution',
    title: 'It claims to speak for a bank or government body',
    explanation:
      'A name in a message proves nothing — sender names, logos and letterheads are trivially copied. Treat the claimed identity as unverified until you reach the organisation yourself.',
    re: rx(
      w(
        String.raw`bank|branch\s+manager|customer\s+(?:care|support|service)|help\s*desk|income\s*tax|it\s+department|gst|rbi|reserve\s+bank|npci|uidai|aadhaar|epfo|trai|police|cyber\s*cell|municipal|electricity\s+board|discom|customs|courier\s+(?:company|team)|बैंक|पुलिस|आयकर|ব্যাংক|পুলিশ`,
      ),
    ),
  },
  {
    code: 'identity_claim_new_number',
    category: 'identity_claim',
    severity: 'high',
    title: 'Someone claims to be a known person on a new number',
    explanation:
      'This is the impersonation pattern: a familiar relationship asserted from an unfamiliar number, followed by a request. Call the number you already have saved for that person and ask them directly.',
    re: rx(
      `${w(String.raw`this\s+is|it'?s|main\s+hoon|मैं\s+हूँ|আমি`)}[^.\\n]{0,40}${w(String.raw`new\s+number|changed\s+my\s+number|naya\s+number|नया\s+नंबर|নতুন\s+নম্বর`)}|${w(String.raw`new|changed|different`)}\\s+number${B1}[^.\\n]{0,60}${w(String.raw`save|note|urgent|need|send|pay|help`)}`,
    ),
  },
  {
    code: 'identity_claim_relative',
    category: 'identity_claim',
    severity: 'caution',
    title: 'It leans on a family or workplace relationship',
    explanation:
      'Naming a relationship is free. If a message using a familiar role asks for money or secrecy, confirm with that person on a number you already had.',
    re: rx(
      w(
        String.raw`your\s+(?:son|daughter|mother|father|brother|sister|uncle|aunty|nephew|niece|grand(?:son|daughter|father|mother))|mummy|papa|beta|bhai|didi|boss|manager|sir\s+here|ceo|बेटा|माँ|पापा|भाई|बाबा|মা`,
      ),
    ),
  },

  // ---------- process ----------
  {
    code: 'secrecy_request',
    category: 'process_bypass',
    severity: 'high',
    title: 'It asks you to keep this from other people',
    explanation:
      'Secrecy has no legitimate purpose in a bank, delivery or government process. It exists to keep you away from the person who would have told you to stop.',
    re: rx(
      `${w(String.raw`do\s*n[o']?t\s+(?:tell|inform|discuss|share\s+(?:this\s+)?with)|keep\s+(?:this|it)\s+(?:secret|confidential|between\s+us)|without\s+(?:telling|informing)|kisi\s+ko\s+(?:mat|na)\s+bata\w*`)}|किसी\\s+को\\s+(?:मत|ना|न)\\s+बता\\w*|কাউকে\\s+(?:বলবেন|বলো|বলবে)\\s*না`,
    ),
  },
  {
    code: 'process_bypass',
    category: 'process_bypass',
    severity: 'high',
    title: 'It asks you to skip a normal check',
    explanation:
      'Being told to ignore a warning, dismiss a security prompt or avoid the official app means the normal check would have stopped this.',
    re: rx(
      w(
        String.raw`ignore\s+(?:the\s+)?(?:warning|message|alert|sms)|do\s*n[o']?t\s+(?:use|open)\s+the\s+app|bypass|skip\s+(?:the\s+)?verification|disable\s+(?:the\s+)?(?:security|antivirus|play\s*protect)|allow\s+(?:all\s+)?permissions`,
      ),
    ),
  },

  // ---------- bait ----------
  {
    code: 'reward_bait',
    category: 'reward_bait',
    severity: 'caution',
    title: 'It offers a prize or reward you did not enter for',
    explanation:
      'You cannot win a draw you never entered. The prize is the hook; the cost arrives in the next message as a fee, a form or a code.',
    re: rx(
      w(
        String.raw`congratulations|congrats|you\s+have\s+won|winner|lucky\s+(?:draw|winner|customer)|lottery|jackpot|prize|kbc|gift\s+(?:card|voucher)|free\s+(?:gift|iphone|recharge)|बधाई|इनाम|পুরস্কার`,
      ),
    ),
  },
  {
    code: 'investment_bait',
    category: 'reward_bait',
    severity: 'caution',
    title: 'It promises a guaranteed or outsized return',
    explanation:
      'No one can guarantee a return. Fixed daily profits, doubled capital and "no risk" language describe a payout structure that depends on new deposits, not on an investment.',
    re: rx(
      w(
        String.raw`guaranteed\s+(?:returns?|profit|income)|double\s+your\s+(?:money|investment)|risk[-\s]?free\s+(?:returns?|profit)|\d{2,3}\s*%\s*(?:daily|weekly|monthly|per\s+day)|fixed\s+daily\s+(?:profit|income)|assured\s+returns?`,
      ),
    ),
  },
  {
    code: 'job_bait',
    category: 'reward_bait',
    severity: 'caution',
    title: 'It offers easy earnings for simple tasks',
    explanation:
      'Task-based earning offers start by paying small amounts, then ask for a deposit to "unlock" bigger tasks. The deposit is the product.',
    re: rx(
      w(
        String.raw`work\s+from\s+home|part[-\s]?time\s+job|earn\s+(?:rs\.?|₹)?\s?\d|daily\s+(?:income|payout|earning)|simple\s+task|like\s+(?:and\s+)?subscribe\s+task|data\s+entry\s+job|no\s+experience\s+(?:required|needed)|join\s+(?:our\s+)?telegram`,
      ),
    ),
  },

  // ---------- contact route ----------
  {
    code: 'contact_channel_in_message',
    category: 'contact_channel',
    severity: 'caution',
    title: 'It supplies the number you should call',
    explanation:
      'A contact number inside the message routes you back to the sender. Never use it. Use the number on your card, in your passbook, or inside the app you already have.',
    re: rx(
      `${w(String.raw`call|contact|dial|whatsapp|reach\s+(?:us|out\s+to)`)}[^.\\n]{0,40}(?:\\+?91[\\s-]?)?${B0}\\d{10}${B1}|${w(String.raw`helpline|customer\s*care|toll[-\s]?free`)}[^.\\n]{0,30}${B0}\\d{4,12}${B1}`,
    ),
  },
];

export function extractSignals(ctx: SignalContext): Finding[] {
  const out: Finding[] = [];
  let position = 0;

  for (const rule of RULES) {
    if (rule.when && !rule.when(ctx)) continue;
    rule.re.lastIndex = 0;
    const match = rule.re.exec(ctx.text);
    if (!match) continue;
    out.push({
      code: rule.code,
      category: rule.category,
      severity: rule.severity,
      title: rule.title,
      explanation: rule.explanation,
      excerpt: excerptAround(ctx.text, match.index, match[0].length),
      position: position++,
    });
  }

  return out;
}

/** Exposed so tests and docs can enumerate the rule set. */
export const ruleCodes = RULES.map((r) => r.code);
