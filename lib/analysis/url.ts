/**
 * Offline, static URL inspection.
 *
 * Nothing in this file performs network I/O. No fetch, no DNS, no redirect following,
 * no reputation lookup. Every finding is derived from the characters of the URL itself.
 * That is a deliberate limitation, not an omission: see LIMITATIONS.md.
 */
import type { Finding } from './types.ts';

/** Two-label public suffixes we understand. Short, India-first, no PSL dependency. */
const MULTI_SUFFIXES = new Set([
  'co.in', 'net.in', 'org.in', 'gen.in', 'firm.in', 'ind.in', 'gov.in', 'nic.in', 'ac.in', 'edu.in', 'res.in', 'mil.in',
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'me.uk',
  'com.au', 'net.au', 'org.au', 'com.br', 'com.cn', 'com.sg', 'com.my', 'com.pk', 'com.bd', 'com.np',
  'co.jp', 'or.jp', 'ne.jp', 'co.kr', 'co.za', 'co.nz', 'com.mx', 'com.tr',
]);

const SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'rb.gy', 'cutt.ly', 'is.gd', 'shorturl.at',
  'rebrand.ly', 'ow.ly', 'buff.ly', 't.ly', 'tiny.cc', 'shrtco.de', 'surl.li', 'clck.ru',
  'qrco.de', 'short.gy', 'u.to', 'v.gd', 'trib.al', 'bitly.com', 'lnk.to',
]);

const MESSAGING_HANDOFF = new Set(['wa.me', 'api.whatsapp.com', 'chat.whatsapp.com', 't.me', 'telegram.me']);

/** Low-cost registration TLDs that disproportionately show up in throwaway domains. */
const CHEAP_TLDS = new Set([
  'top', 'xyz', 'cfd', 'icu', 'rest', 'click', 'link', 'live', 'buzz', 'sbs', 'shop',
  'store', 'online', 'site', 'website', 'space', 'fun', 'monster', 'quest', 'cyou', 'bond', 'cc', 'tk', 'ml', 'ga', 'gq',
]);

/**
 * Brand-shaped tokens. Used ONLY for structural checks — "this name appears somewhere
 * that is not the registered domain". The app never claims to know a brand's real
 * domain, so there is no official-domain table to go stale.
 */
const BRAND_TOKENS = [
  'sbi', 'onlinesbi', 'hdfc', 'icici', 'axis', 'kotak', 'pnb', 'bob', 'canara', 'idfc', 'yesbank', 'indusind', 'rbl',
  'paytm', 'phonepe', 'gpay', 'googlepay', 'bhim', 'npci', 'upi', 'mobikwik', 'freecharge',
  'amazon', 'flipkart', 'myntra', 'meesho', 'ajio', 'swiggy', 'zomato', 'blinkit',
  'irctc', 'indianrailway', 'epfo', 'uidai', 'aadhaar', 'incometax', 'itdept', 'gst', 'trai', 'dot', 'cowin',
  'indiapost', 'bluedart', 'dtdc', 'delhivery', 'ekart', 'fedex', 'dhl', 'shiprocket',
  'netflix', 'whatsapp', 'instagram', 'facebook', 'microsoft', 'apple', 'paypal', 'binance', 'jio', 'airtel', 'vi',
  'kbc', 'lic', 'nsdl', 'cdsl', 'zerodha', 'groww', 'upstox',
];

const DANGEROUS_SCHEMES = new Set(['javascript:', 'data:', 'file:', 'vbscript:', 'blob:']);

/** Latin letters commonly impersonated by other scripts. */
const CONFUSABLES: Record<string, string> = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x', і: 'i', ј: 'j', ѕ: 's', ԁ: 'd', һ: 'h', ν: 'v', ο: 'o',
  α: 'a', ε: 'e', ι: 'i', κ: 'k', ρ: 'p', τ: 't', υ: 'u', χ: 'x', ʼ: "'", ɡ: 'g', ӏ: 'l',
};

const URL_RE =
  /\b(?:(?:https?|upi|ftp|file|javascript|data|vbscript):\/*[^\s<>"')\]]+|www\.[^\s<>"')\]]+|upi:\/\/[^\s<>"')\]]+)/gi;

/** Bare `example.co.in/path` forms, which people paste constantly. */
const BARE_DOMAIN_RE =
  /\b((?:[a-z0-9¡-￿](?:[a-z0-9¡-￿-]*[a-z0-9¡-￿])?\.)+(?:com|net|org|in|co|io|xyz|top|info|biz|online|site|shop|store|link|click|live|app|dev|me|cc|ru|cn|uk|us))(\/[^\s<>"')\]]*)?/gi;

export function extractUrls(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(URL_RE)) out.add(trimTrailing(m[0]));
  for (const m of text.matchAll(BARE_DOMAIN_RE)) {
    const whole = trimTrailing(m[0]);
    // Skip anything already captured by the scheme-aware pass.
    if (![...out].some((u) => u.includes(whole))) out.add(whole);
  }
  return [...out];
}

function trimTrailing(u: string): string {
  return u.replace(/[.,;:!?)\]}'"]+$/, '');
}

export type ParsedUrl = {
  raw: string;
  parsed: boolean;
  scheme: string;
  host: string;
  /** Punycode form as the browser would resolve it. */
  asciiHost: string;
  registrableDomain: string;
  tld: string;
  port: string;
  path: string;
  query: string;
  hasUserinfo: boolean;
};

export function parseUrl(raw: string): ParsedUrl {
  const empty: ParsedUrl = {
    raw, parsed: false, scheme: '', host: '', asciiHost: '', registrableDomain: '',
    tld: '', port: '', path: '', query: '', hasUserinfo: false,
  };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return empty;
  }
  const asciiHost = u.hostname.toLowerCase();
  return {
    raw,
    parsed: true,
    scheme: u.protocol,
    host: asciiHost,
    asciiHost,
    registrableDomain: registrable(asciiHost),
    tld: asciiHost.split('.').pop() ?? '',
    port: u.port,
    path: u.pathname,
    query: u.search,
    hasUserinfo: Boolean(u.username || u.password),
  };
}

export function registrable(host: string): string {
  const labels = host.split('.').filter(Boolean);
  if (labels.length <= 2) return host;
  const lastTwo = labels.slice(-2).join('.');
  return MULTI_SUFFIXES.has(lastTwo) ? labels.slice(-3).join('.') : lastTwo;
}

const isIpLiteral = (h: string): boolean =>
  /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || /^\[?[0-9a-f:]+\]?$/i.test(h) && h.includes(':');

function scriptsIn(s: string): Set<string> {
  const found = new Set<string>();
  for (const ch of s) {
    if (/[a-z]/i.test(ch)) found.add('Latin');
    else if (/[Ѐ-ӿ]/.test(ch)) found.add('Cyrillic');
    else if (/[Ͱ-Ͽ]/.test(ch)) found.add('Greek');
    else if (/[ऀ-ॿ]/.test(ch)) found.add('Devanagari');
    else if (/[ঀ-৿]/.test(ch)) found.add('Bengali');
    else if (/[一-鿿]/.test(ch)) found.add('Han');
  }
  return found;
}

/** Collapses confusable characters so `аmazon` (Cyrillic а) folds onto `amazon`. */
export function skeleton(s: string): string {
  return [...s.toLowerCase()].map((c) => CONFUSABLES[c] ?? c).join('');
}

let seq = 0;
const f = (
  code: string,
  category: Finding['category'],
  severity: Finding['severity'],
  title: string,
  explanation: string,
  excerpt?: string,
): Finding => ({ code, category, severity, title, explanation, excerpt, position: seq++ });

/** Static inspection of one URL. Pure function; no I/O. */
export function analyzeUrl(raw: string): { url: ParsedUrl; findings: Finding[] } {
  seq = 0;
  const url = parseUrl(raw);
  const findings: Finding[] = [];

  if (DANGEROUS_SCHEMES.has(url.scheme)) {
    findings.push(
      f('url_dangerous_scheme', 'link', 'high', 'This is not an ordinary web address',
        `It starts with "${url.scheme}", which tells the device to run something rather than open a page. TrustCircle will not open it, and neither should you.`,
        raw),
    );
    return { url, findings };
  }

  if (!url.parsed) {
    findings.push(
      f('url_unparseable', 'link', 'caution', 'This address could not be read',
        'The text looks like a link but is not a valid web address. Malformed addresses are sometimes used to hide the real destination.',
        raw),
    );
    return { url, findings };
  }

  const { host, registrableDomain, path, query } = url;
  const hay = `${host}${path}${query}`.toLowerCase();

  if (url.hasUserinfo) {
    findings.push(
      f('url_userinfo', 'link', 'high', 'The real destination is hidden before the "@"',
        `Everything before the "@" is ignored by the browser. This link actually goes to "${registrableDomain}", not to the name shown at the start.`,
        raw),
    );
  }

  if (isIpLiteral(host)) {
    findings.push(
      f('url_ip_host', 'link', 'high', 'The address is a raw IP number, not a domain name',
        'Real organisations publish a named website. A bare IP address means there is no domain name to check and no certificate identity to inspect.',
        host),
    );
  }

  if (host.startsWith('xn--') || host.includes('.xn--')) {
    findings.push(
      f('url_punycode', 'link', 'high', 'The domain uses characters that can imitate another name',
        `The browser reads this domain as "${host}". Non-Latin characters can be chosen to look identical to a familiar brand name on screen.`,
        host),
    );
  }

  const scripts = scriptsIn(raw.replace(/^[a-z]+:\/\//i, '').split('/')[0] ?? '');
  if (scripts.size > 1 && scripts.has('Latin')) {
    findings.push(
      f('url_mixed_script', 'link', 'high', 'The domain mixes alphabets',
        `This name is written in more than one alphabet (${[...scripts].join(' + ')}). That is a common way to register a domain that looks like a well-known one.`,
        host),
    );
  }

  if (url.scheme === 'http:') {
    findings.push(
      f('url_plain_http', 'link', 'caution', 'The link is not encrypted',
        'Anything typed into an "http://" page travels unprotected. Note the reverse is not reassuring either: "https://" only means the connection is encrypted, never that the site is honest.',
        raw),
    );
  }

  if (url.port && url.port !== '80' && url.port !== '443') {
    findings.push(
      f('url_unusual_port', 'link', 'caution', `The link points at an unusual port (${url.port})`,
        'Ordinary websites are served on the default ports. A custom port often means a service running outside normal hosting.',
        `${host}:${url.port}`),
    );
  }

  if (SHORTENERS.has(registrableDomain)) {
    findings.push(
      f('url_shortener', 'link', 'caution', 'This is a shortened link, so the destination is hidden',
        `"${registrableDomain}" forwards somewhere else. You cannot tell where from the link alone, and TrustCircle will not follow it to find out.`,
        raw),
    );
  }

  if (MESSAGING_HANDOFF.has(host)) {
    findings.push(
      f('url_messaging_handoff', 'contact_channel', 'caution', 'The link opens a chat with an unknown account',
        'Links like this move the conversation into a private chat with whoever set them up. That is where the actual request usually arrives.',
        host),
    );
  }

  const folded = skeleton(host);
  const domainLabels = registrableDomain.split('.');
  const nameLabel = domainLabels[0] ?? '';
  for (const brand of BRAND_TOKENS) {
    if (!folded.includes(brand)) continue;
    const inRegistered = skeleton(nameLabel) === brand;
    if (inRegistered) break;
    if (skeleton(host).includes(brand) && !skeleton(registrableDomain).includes(brand)) {
      findings.push(
        f('url_brand_in_subdomain', 'link', 'high', `"${brand}" appears in the address but is not the registered domain`,
          `The part that decides where you actually go is "${registrableDomain}". The familiar name sits in front of it, where anyone can put any word they like.`,
          host),
      );
    } else if (skeleton(nameLabel) !== brand && skeleton(nameLabel).includes(brand)) {
      findings.push(
        f('url_brand_lookalike_domain', 'link', 'caution', `The domain is "${registrableDomain}", not "${brand}" on its own`,
          `A familiar name has been combined with other words to register a different domain. Compare it character by character with the address you normally use.`,
          registrableDomain),
      );
    }
    break;
  }

  if (folded !== host.toLowerCase()) {
    findings.push(
      f('url_confusable_chars', 'link', 'high', 'The domain contains look-alike characters',
        `Read as plain Latin letters this would be "${folded}". The actual characters are different, which is how a fake domain passes a quick glance.`,
        host),
    );
  }

  const subLabels = host.split('.').length - registrableDomain.split('.').length;
  if (subLabels >= 3) {
    findings.push(
      f('url_deep_subdomain', 'link', 'caution', 'The address is padded with extra names',
        `There are ${subLabels} labels in front of "${registrableDomain}". Stacking names like this pushes the real domain off the end of a phone screen.`,
        host),
    );
  }

  if (CHEAP_TLDS.has(url.tld)) {
    findings.push(
      f('url_cheap_tld', 'link', 'info', `The domain ends in ".${url.tld}"`,
        'This is not suspicious on its own — plenty of legitimate sites use it. It is worth noting only because these endings are cheap and quick to register, so disposable sites cluster here.',
        registrableDomain),
    );
  }

  if (/%[0-9a-f]{2}/i.test(host) || (raw.match(/%[0-9a-f]{2}/gi)?.length ?? 0) >= 4) {
    findings.push(
      f('url_encoded', 'link', 'caution', 'Parts of the link are written in escape codes',
        'Characters have been replaced with "%" codes. Sometimes that is normal; a long run of them usually means the readable version was deliberately obscured.',
        raw),
    );
  }

  if (/\.(apk|exe|msi|scr|bat|cmd|jar|dmg|pkg|sh|vbs|ps1)(\?|$)/i.test(path)) {
    findings.push(
      f('url_installer_download', 'link', 'high', 'The link downloads an installable file',
        'This is not a web page — it is an app or program file. Installing one from a message is how remote-control and banking-overlay apps get onto a phone.',
        path),
    );
  }

  if (/\b(kyc|otp|verify|verification|re-?activat|unblock|netbank|login|signin|secure-?login|update-?bank|refund-?claim)\b/i.test(hay)) {
    findings.push(
      f('url_credential_path', 'link', 'info', 'The address advertises an account action',
        'Words like "kyc", "verify" or "login" in the address tell you what the page will ask for. Reach pages like that through your own app, never through a link you were sent.',
        `${host}${path}`),
    );
  }

  return { url, findings };
}

/** `[text](url)`, `<a href=...>text</a>` and `text <url>` — the visible/actual mismatch. */
export function visibleVsActual(text: string): Finding[] {
  seq = 1000;
  const out: Finding[] = [];
  const pairs: Array<{ label: string; target: string }> = [];

  for (const m of text.matchAll(/\[([^\]]{1,120})\]\(([^)\s]{1,400})\)/g)) {
    pairs.push({ label: m[1] ?? '', target: m[2] ?? '' });
  }
  for (const m of text.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']{1,400})["'][^>]*>(.*?)<\/a>/gis)) {
    pairs.push({ label: (m[2] ?? '').replace(/<[^>]*>/g, ''), target: m[1] ?? '' });
  }

  for (const { label, target } of pairs) {
    const labelUrls = extractUrls(label);
    const labelLooksLikeUrl = labelUrls.length > 0 || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(label.trim());
    if (!labelLooksLikeUrl) continue;
    const shownHost = parseUrl(labelUrls[0] ?? label.trim()).registrableDomain;
    const realHost = parseUrl(target).registrableDomain;
    if (shownHost && realHost && shownHost !== realHost) {
      out.push(
        f('url_visible_mismatch', 'link', 'high', 'The link text and the real destination disagree',
          `It is displayed as "${shownHost}" but it opens "${realHost}". The visible text of a link is free text — only the destination matters.`,
          `${label} → ${target}`),
      );
    }
  }
  return out;
}
