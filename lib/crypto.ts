import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * At-rest encryption for submitted message content.
 *
 * Threat covered: someone walks off with `data/trustcircle.db`. The key lives in
 * TRUSTCIRCLE_SECRET (an env var, not the database), so the file alone yields no
 * message text. It does NOT protect against host compromise, where both are readable.
 */
function key(): Buffer {
  const secret = process.env.TRUSTCIRCLE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'TRUSTCIRCLE_SECRET is missing or shorter than 32 chars. Run `npm run setup:secret`.',
    );
  }
  return createHash('sha256').update(secret).digest();
}

/** AES-256-GCM. Returns `v1.<iv>.<tag>.<ciphertext>`, all base64url. */
export function seal(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
}

export function open(sealed: string): string {
  const [v, iv, tag, body] = sealed.split('.');
  if (v !== 'v1' || !iv || !tag || !body) throw new Error('malformed ciphertext');
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(body, 'base64url')), d.final()]).toString('utf8');
}

export const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

export const token = (bytes = 32): string => randomBytes(bytes).toString('base64url');

/**
 * Password hashing. Argon2id is the stated target; it needs a native module, so the
 * stdlib scrypt profile below is what ships. Parameters follow the OWASP scrypt
 * recommendation (N=2^17, r=8, p=1), which is an accepted alternative to Argon2id.
 * `verifyPassword` dispatches on the stored algo tag, so adding argon2id later
 * does not invalidate existing hashes.
 */
const SCRYPT = { N: 1 << 17, r: 8, p: 1, keylen: 32 } as const;

/**
 * Cost override, for the test suite only. The production profile above is
 * deliberately expensive (~0.3s per hash), which makes a suite that registers
 * hundreds of accounts unusable. Tests set TRUSTCIRCLE_SCRYPT_N=16384; nothing in the
 * application reads it, and the stored hash records the cost it was created with, so
 * a hash made at a lower cost still verifies and is still identifiable as such.
 */
const costN = (): number => {
  const override = Number(process.env.TRUSTCIRCLE_SCRYPT_N);
  return Number.isInteger(override) && override >= 1024 ? override : SCRYPT.N;
};

export function hashPassword(password: string): { hash: string; algo: string } {
  const salt = randomBytes(16);
  const N = costN();
  const dk = scryptSync(password.normalize('NFKC'), salt, SCRYPT.keylen, {
    N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: 256 * 1024 * 1024,
  });
  return {
    hash: `scrypt$${N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64url')}$${dk.toString('base64url')}`,
    algo: 'scrypt',
  };
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts[0] !== 'scrypt' || parts.length !== 6) return false;
  const [, N, r, p, salt, expected] = parts as [string, string, string, string, string, string];
  const want = Buffer.from(expected, 'base64url');
  const got = scryptSync(password.normalize('NFKC'), Buffer.from(salt, 'base64url'), want.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: 256 * 1024 * 1024,
  });
  return want.length === got.length && timingSafeEqual(want, got);
}
