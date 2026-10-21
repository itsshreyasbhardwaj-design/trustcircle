export type Category =
  | 'urgency'
  | 'threat'
  | 'credential_request'
  | 'payment_request'
  | 'authority_claim'
  | 'identity_claim'
  | 'link'
  | 'contact_channel'
  | 'process_bypass'
  | 'reward_bait'
  | 'remote_access'
  | 'sensitive_data';

export type Severity = 'info' | 'caution' | 'high';

export type Finding = {
  code: string;
  category: Category;
  severity: Severity;
  title: string;
  explanation: string;
  /** Verbatim slice of the submitted (already redacted) content that triggered this. */
  excerpt?: string;
  position: number;
};

export type Outcome =
  | 'warning_signs'
  | 'verification_recommended'
  | 'insufficient_information'
  | 'no_known_warning_signs';

export type ClaimType =
  | 'bank'
  | 'delivery'
  | 'payment'
  | 'support'
  | 'job'
  | 'shopping'
  | 'utility'
  | 'acquaintance'
  | 'institution'
  | 'unknown';

export const CATEGORY_LABEL: Record<Category, string> = {
  urgency: 'Pressure to act fast',
  threat: 'Threat to an account or service',
  credential_request: 'Asking for a secret',
  payment_request: 'Asking for money',
  authority_claim: 'Claiming to be an authority',
  identity_claim: 'Claiming to be someone you know',
  link: 'Link structure',
  contact_channel: 'Contact route supplied in the message',
  process_bypass: 'Asking you to skip normal checks',
  reward_bait: 'Offering a reward',
  remote_access: 'Asking for control of your device',
  sensitive_data: 'Sensitive data in the content',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  info: 'Worth noting',
  caution: 'Warning sign',
  high: 'Strong warning sign',
};

export const OUTCOME_COPY: Record<Outcome, { headline: string; summary: string }> = {
  warning_signs: {
    headline: 'Warning signs detected',
    summary:
      'This content contains patterns commonly used to pressure people into acting. Do not act on it directly. Verify it yourself through a channel you already trust.',
  },
  verification_recommended: {
    headline: 'Additional verification recommended',
    summary:
      'Nothing here is conclusive, but the content asks you to do something and TrustCircle cannot confirm who sent it. Check it independently before acting.',
  },
  insufficient_information: {
    headline: 'Not enough to assess',
    summary:
      'There is too little content to look for warning signs. Paste the full message, or add the link or screenshot, and check again.',
  },
  no_known_warning_signs: {
    headline: 'No known warning signs identified',
    summary:
      'TrustCircle did not match any of the patterns it checks for. That is not the same as safe — it only means this particular set of checks found nothing. Anything that asks for money, codes or personal details still needs independent verification.',
  },
};

/** The product never claims safety. This line ships with every result. */
export const NEVER_A_GUARANTEE =
  'TrustCircle checks for known patterns. It cannot verify who sent a message, who owns an account, or whether a website is honest. A result here is never proof that something is safe.';
