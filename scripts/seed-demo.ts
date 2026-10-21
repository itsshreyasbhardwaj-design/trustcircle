/**
 * Reproducible demo seeding.
 *
 * Creates two accounts in one circle, imports the fictional cases into the first, and
 * opens one shared second-opinion request so every screen has something real on it.
 *
 * Everything it writes is clearly marked as demo data. It refuses to touch an
 * existing account, so it can never drop fictional cases into a real user's history.
 *
 *   npm run db:seed-demo
 *   TRUSTCIRCLE_DB=data/demo.db npm run db:seed-demo
 */
import { getDb, one } from '../lib/db.ts';
import { registerUser } from '../lib/auth.ts';
import { createScan } from '../lib/scans.ts';
import { acceptInvitation, createCircle, createInvitation } from '../lib/family.ts';
import { createReview, sendReview, addComment } from '../lib/reviews.ts';
import { createChecklist, getChecklist, toggleStep } from '../lib/verification.ts';
import { createRecoveryCase, addEvidence } from '../lib/recovery.ts';
import { recordAnswers } from '../lib/academy.ts';
import { demoCases } from '../lib/data/demo.ts';

const ACCOUNTS = [
  { email: 'asha.demo@example.com', name: 'Asha (demo)', password: 'trustcircle demo account 2026' },
  { email: 'ravi.demo@example.com', name: 'Ravi (demo)', password: 'trustcircle demo account 2026' },
] as const;

getDb();

for (const account of ACCOUNTS) {
  if (one('SELECT id FROM user WHERE email_lower = ?', account.email)) {
    console.error(`Refusing to seed: ${account.email} already exists. Delete it first, or use a separate TRUSTCIRCLE_DB.`);
    process.exit(1);
  }
}

const [ashaSpec, raviSpec] = ACCOUNTS;
const asha = registerUser({ email: ashaSpec.email, displayName: ashaSpec.name, password: ashaSpec.password });
const ravi = registerUser({ email: raviSpec.email, displayName: raviSpec.name, password: raviSpec.password });
if (!asha.ok || !ravi.ok) throw new Error('could not create demo accounts');

const circleId = createCircle(asha.userId, 'Verma family (demo)');
const invite = createInvitation(asha.userId, circleId, 'Ravi');
acceptInvitation(ravi.userId, invite.token);

const scanIds: string[] = [];
for (const demo of demoCases) {
  const { scanId } = createScan(
    asha.userId,
    { kind: demo.kind, content: demo.content, payment: demo.payment },
    { isDemo: true },
  );
  scanIds.push(scanId);
}

// One shared review, answered, so the reviewer view has real content.
const reviewId = createReview(asha.userId, {
  scanId: scanIds[0]!,
  question: 'Papa forwarded this just now. The link looks wrong to me — what do you think?',
  reviewerIds: [ravi.userId],
  shareContent: true,
  circleId,
});
sendReview(asha.userId, reviewId);
addComment(
  ravi.userId,
  reviewId,
  'The domain is not the bank — read it from the right and it ends in example.net. Do not call the number in the message. I will ring Papa and tell him to check the app instead.',
  'see_warning_signs',
);

// A part-finished checklist, so the in-progress state is visible.
const checklistId = createChecklist(asha.userId, 'bank', scanIds[0]!);
const steps = getChecklist(asha.userId, checklistId)!.steps;
toggleStep(asha.userId, steps[0]!.id, true, 'Closed the message without tapping anything.');
toggleStep(asha.userId, steps[1]!.id, true, 'Opened the bank app directly — no alerts, no KYC request.');

const recoveryId = createRecoveryCase(asha.userId, {
  title: 'Demo: unexpected UPI debit after a courier call',
  lostRupees: '2499',
  notes: 'Fictional example. A caller claiming to be from a courier company asked for a redelivery fee.',
});
addEvidence(asha.userId, recoveryId, { kind: 'transaction_ref', label: 'UPI debit 14:32', value: 'UTR 000000000000 (fictional)' });
addEvidence(asha.userId, recoveryId, { kind: 'contact', label: 'Number that called', value: '+91 00000 00000 (fictional)' });
addEvidence(asha.userId, recoveryId, { kind: 'report_ack', label: 'Bank complaint reference', value: 'DEMO-REF-0001' });

recordAnswers(asha.userId, 'secrets-nobody-should-ask', { q1: 'b', q2: 'c' });
recordAnswers(asha.userId, 'reading-a-link', { q1: 'b', q2: 'c' });

console.log('Seeded demo data:');
console.log(`  accounts   ${ACCOUNTS.map((a) => a.email).join(', ')}`);
console.log(`  password   ${ashaSpec.password}`);
console.log(`  circle     Verma family (demo)  [${circleId}]`);
console.log(`  cases      ${scanIds.length} fictional, all flagged is_demo = 1`);
console.log(`  review     ${reviewId} (answered by Ravi)`);
console.log(`  checklist  ${checklistId} (2 of ${steps.length} steps done)`);
console.log(`  recovery   ${recoveryId} (3 evidence items)`);
console.log('\nEvery case above is fictional and uses reserved example domains.');
