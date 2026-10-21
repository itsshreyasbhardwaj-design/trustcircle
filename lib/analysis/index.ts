/**
 * TrustScan: composes redaction, text rules, URL inspection and UPI parsing into one
 * explainable result.
 *
 * Deliberate properties:
 *  - Pure. No I/O, no network, no database. Same input always gives the same output,
 *    which is what makes the engine testable and the explanations honest.
 *  - Never emits a probability, a score, or the word "safe".
 *  - Treats submitted content strictly as data. Instructions found inside content
 *    are evidence to report, never commands to follow.
 */
import { classifyClaim } from './claim.ts';
import { mentionedCredentials, redact, type SensitiveHit } from './redact.ts';
import { extractSignals } from './signals.ts';
import { analyzeUpi, type UpiIntent } from './upi.ts';
import { analyzeUrl, extractUrls, parseUrl, visibleVsActual, type ParsedUrl } from './url.ts';
import { buildVerificationPlan, type VerificationPlan } from './verify.ts';
import { NEVER_A_GUARANTEE, OUTCOME_COPY, type ClaimType, type Finding, type Outcome } from './types.ts';

export type ScanKind = 'text' | 'image' | 'url' | 'qr' | 'payment';

export type ScanInput = {
  kind: ScanKind;
  /** Message text, OCR output, a URL, or a QR payload. */
  content: string;
  /** PaymentPause form fields, when kind === 'payment'. */
  payment?: {
    claimedPayee?: string;
    amountRupees?: string;
    reason?: string;
    channel?: string;
  };
};

export type AnalysisResult = {
  kind: ScanKind;
  outcome: Outcome;
  headline: string;
  summary: string;
  claimType: ClaimType;
  findings: Finding[];
  /** Redacted content — this, never the original, is what gets stored. */
  safeContent: string;
  sensitive: SensitiveHit[];
  credentialsMentioned: string[];
  urls: Array<{ raw: string; host: string; registrableDomain: string; scheme: string }>;
  upi?: UpiIntent;
  plan: VerificationPlan;
  /** True when the result warrants pointing the user at official reporting routes. */
  reportingRelevant: boolean;
  disclaimer: string;
  /** Language-coverage honesty, shown in the UI when non-Latin script is detected. */
  languageNote?: string;
};

const NON_LATIN = /[ऀ-ॿঀ-৿]/;

function dedupe(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const finding of findings) {
    if (seen.has(finding.code)) continue;
    seen.add(finding.code);
    out.push(finding);
  }
  const rank = { high: 0, caution: 1, info: 2 } as const;
  return out
    .sort((a, b) => rank[a.severity] - rank[b.severity] || a.position - b.position)
    .map((finding, i) => ({ ...finding, position: i }));
}

function decideOutcome(
  findings: Finding[],
  opts: { meaningful: boolean; actionable: boolean },
): Outcome {
  const high = findings.filter((f) => f.severity === 'high').length;
  const caution = findings.filter((f) => f.severity === 'caution').length;

  if (high >= 1) return 'warning_signs';
  if (caution >= 2) return 'warning_signs';
  if (!opts.meaningful) return 'insufficient_information';
  // A single ordinary warning sign is not enough to call something a scam.
  if (caution === 1) return 'verification_recommended';
  if (opts.actionable) return 'verification_recommended';
  return 'no_known_warning_signs';
}

function headlineFor(outcome: Outcome, findings: Finding[]): string {
  if (outcome !== 'warning_signs') return OUTCOME_COPY[outcome].headline;
  const strong = findings.filter((f) => f.severity === 'high').length;
  const n = findings.filter((f) => f.severity !== 'info').length;
  return strong > 0
    ? `${strong} strong warning sign${strong === 1 ? '' : 's'} in this content`
    : `${n} warning signs in this content`;
}

export function analyze(input: ScanInput): AnalysisResult {
  const raw = input.content ?? '';
  const payment = input.payment;

  // Payment form fields are part of the analysed text so the same rules apply to them.
  const combined = [
    raw,
    payment?.claimedPayee ? `Claimed payee: ${payment.claimedPayee}` : '',
    payment?.reason ? `Stated reason: ${payment.reason}` : '',
    payment?.amountRupees ? `Amount: ₹${payment.amountRupees}` : '',
    payment?.channel ? `Arrived via: ${payment.channel}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const { text: safeContent, hits: sensitive } = redact(combined);

  const urlStrings = extractUrls(safeContent);
  const urlFindings: Finding[] = [];
  const urls: AnalysisResult['urls'] = [];
  for (const u of urlStrings.slice(0, 12)) {
    const parsed: ParsedUrl = parseUrl(u);
    if (/^upi:/i.test(u)) continue;
    urls.push({
      raw: u,
      host: parsed.host,
      registrableDomain: parsed.registrableDomain,
      scheme: parsed.scheme,
    });
    urlFindings.push(...analyzeUrl(u).findings);
  }
  urlFindings.push(...visibleVsActual(safeContent));

  const upiSource =
    urlStrings.find((u) => /^upi:/i.test(u)) ??
    (input.kind === 'qr' || input.kind === 'payment' ? safeContent : undefined);
  const upiAnalysis = upiSource ? analyzeUpi(upiSource) : undefined;

  const hasUpiTarget = Boolean(upiAnalysis?.intent.isUpi);
  const signalFindings = extractSignals({
    text: safeContent,
    hasLink: urls.length > 0,
    hasUpiTarget,
  });

  const sensitiveFindings: Finding[] = sensitive.length
    ? [
        {
          code: 'sensitive_value_present',
          category: 'sensitive_data',
          severity: 'caution',
          title: 'The content contained something that should not be stored or shared',
          explanation: `TrustCircle removed ${sensitive
            .map((s) => `${s.count} ${s.label}${s.count === 1 ? '' : 's'}`)
            .join(', ')} before saving anything. If a live code was in there, treat it as exposed: do not use it, and do not forward this content to anyone.`,
          excerpt: undefined,
          position: 900,
        },
      ]
    : [];

  const findings = dedupe([...signalFindings, ...urlFindings, ...(upiAnalysis?.findings ?? []), ...sensitiveFindings]);
  const claimType = classifyClaim(safeContent);

  const textOnly = safeContent.replace(/https?:\/\/\S+/gi, ' ').replace(/\s+/g, ' ').trim();
  const meaningful = textOnly.length >= 12 || urls.length > 0 || hasUpiTarget;
  const actionable =
    urls.length > 0 ||
    hasUpiTarget ||
    claimType !== 'unknown' ||
    mentionedCredentials(safeContent).length > 0;

  const outcome = decideOutcome(findings, { meaningful, actionable });

  return {
    kind: input.kind,
    outcome,
    headline: headlineFor(outcome, findings),
    summary: OUTCOME_COPY[outcome].summary,
    claimType,
    findings,
    safeContent,
    sensitive,
    credentialsMentioned: mentionedCredentials(safeContent),
    urls,
    upi: upiAnalysis?.intent,
    plan: buildVerificationPlan(claimType),
    reportingRelevant: outcome === 'warning_signs',
    disclaimer: NEVER_A_GUARANTEE,
    languageNote: NON_LATIN.test(safeContent)
      ? 'This content contains Hindi or Bengali script. TrustCircle\'s rules cover only the most common phrases in those languages, so it may miss warning signs an English message would catch. Treat a clean result here with extra caution.'
      : undefined,
  };
}

export { NEVER_A_GUARANTEE } from './types.ts';
export type { Finding, Outcome, ClaimType } from './types.ts';
