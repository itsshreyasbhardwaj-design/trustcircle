import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Paperclip } from 'lucide-react';
import { requireUser } from '@/lib/session';
import { getRecoveryCase, EVIDENCE_CHECKLIST } from '@/lib/recovery';
import { possibleReviewers } from '@/lib/family';
import {
  addEvidenceAction, attachFileAction, deleteRecoveryCaseAction, removeEvidenceAction,
  shareRecoveryCaseAction, updateRecoveryCaseAction,
} from '@/app/actions/recovery';
import { ActionButton, ActionForm } from '@/components/forms';
import { Alert, Badge, Card, Field, Input, Notice, SectionTitle, Select, Textarea } from '@/components/ui';

export const metadata: Metadata = { title: 'Recovery case' };

export default async function RecoveryCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const data = getRecoveryCase(user.id, id);
  if (!data) notFound();

  const { case: kase, evidence, isOwner } = data;
  const contacts = isOwner ? possibleReviewers(user.id) : [];

  return (
    <div className="space-y-6">
      <Link href="/recovery" className="tc-tap inline-flex items-center gap-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Recovery guide
      </Link>

      <SectionTitle
        eyebrow={isOwner ? 'Your case' : 'Shared with you'}
        title={kase.title}
        lead={`Opened ${new Date(kase.created_at).toLocaleString('en-IN')}`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={kase.status === 'open' ? 'caution' : 'accent'}>{kase.status}</Badge>
        {kase.lost_amount_paise ? <Badge>₹{(kase.lost_amount_paise / 100).toLocaleString('en-IN')} lost</Badge> : null}
        {kase.happened_at ? <Badge>Happened {new Date(kase.happened_at).toLocaleString('en-IN')}</Badge> : null}
      </div>

      {!isOwner && (
        <Alert tone="info" title="You are helping with someone else's case">
          You can see what they recorded. You cannot change it, and this gives you no access to anything else
          of theirs.
        </Alert>
      )}

      {kase.notes && (
        <Card>
          <h2 className="font-semibold">What happened</h2>
          <p className="tc-content mt-2 text-sm text-[var(--fg-muted)]">{kase.notes}</p>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold">Case timeline</h2>
        {evidence.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--fg-muted)]">Nothing recorded yet.</p>
        ) : (
          <ol className="mt-4 space-y-2.5">
            {evidence.map((e) => (
              <li key={e.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{e.kind.replace(/_/g, ' ')}</Badge>
                  <span className="text-sm font-medium">{e.label}</span>
                  <span className="ml-auto text-xs text-[var(--fg-subtle)]">{new Date(e.created_at).toLocaleString('en-IN')}</span>
                </div>
                {e.value && <p className="tc-content mt-1.5 text-sm text-[var(--fg-muted)]">{e.value}</p>}
                {e.attachment_id && (
                  <p className="mt-1.5 text-sm">
                    <a href={`/api/attachment/${e.attachment_id}`} className="inline-flex items-center gap-1.5 text-[var(--accent)] underline">
                      <Paperclip className="h-3.5 w-3.5" aria-hidden />
                      {e.attachment_name} ({Math.round((e.attachment_size ?? 0) / 1024)} KB)
                    </a>
                  </p>
                )}
                {isOwner && (
                  <div className="mt-2">
                    <ActionButton
                      action={removeEvidenceAction}
                      label="Remove"
                      tone="ghost"
                      fields={{ caseId: id, evidenceId: e.id }}
                      confirm="Remove this item? Any attached file is deleted with it."
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>

      {isOwner && (
        <>
          <Card>
            <h2 className="font-semibold">Add to the case</h2>
            <div className="mt-4">
              <ActionForm action={addEvidenceAction} submitLabel="Add item" pendingLabel="Adding…" resetOnSuccess>
                <input type="hidden" name="caseId" value={id} />
                <Field label="Type" htmlFor="kind" required>
                  <Select id="kind" name="kind" defaultValue="transaction_ref" required>
                    <option value="transaction_ref">Transaction reference / UTR</option>
                    <option value="contact">Number, email or handle that contacted me</option>
                    <option value="report_ack">Complaint or acknowledgement number</option>
                    <option value="note">Note</option>
                  </Select>
                </Field>
                <Field label="Label" htmlFor="label" required>
                  <Input id="label" name="label" required maxLength={200} placeholder="e.g. UPI debit 14:32" />
                </Field>
                <Field label="Details" htmlFor="value" hint="Reference numbers, amounts, what was said.">
                  <Input id="value" name="value" maxLength={1000} />
                </Field>
              </ActionForm>
            </div>

            <div className="mt-6 border-t border-[var(--border)] pt-5">
              <h3 className="text-sm font-semibold">Attach a file</h3>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">
                PNG, JPEG, WebP, PDF or plain text, up to 4 MB. Files are checked by their actual contents, not
                their name, stored privately, and served only to you or someone you share this case with.
              </p>
              <div className="mt-3">
                <ActionForm action={attachFileAction} submitLabel="Attach" submitTone="secondary" pendingLabel="Uploading…">
                  <input type="hidden" name="caseId" value={id} />
                  <input
                    type="file"
                    name="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf,text/plain"
                    required
                    className="block w-full cursor-pointer rounded-xl border border-[var(--border-strong)] bg-[var(--bg-raised)] p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--accent-fg)]"
                  />
                </ActionForm>
              </div>
            </div>

            <Notice>
              Checklist of what is worth collecting: {EVIDENCE_CHECKLIST.map((e) => e.label).join('; ')}.
            </Notice>
          </Card>

          <Card>
            <h2 className="font-semibold">Case status and notes</h2>
            <div className="mt-4">
              <ActionForm action={updateRecoveryCaseAction} submitLabel="Save" submitTone="secondary">
                <input type="hidden" name="caseId" value={id} />
                <Field label="Status" htmlFor="status">
                  <Select id="status" name="status" defaultValue={kase.status}>
                    <option value="open">Open — still dealing with it</option>
                    <option value="reported">Reported to bank / authorities</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </Select>
                </Field>
                <Field label="Notes" htmlFor="notes">
                  <Textarea id="notes" name="notes" defaultValue={kase.notes ?? ''} maxLength={5000} className="min-h-28" />
                </Field>
              </ActionForm>
            </div>
          </Card>

          {contacts.length > 0 && (
            <Card>
              <h2 className="font-semibold">Ask someone in your circle to help</h2>
              <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
                They will see this case and its attachments. You can withdraw access at any time from privacy
                settings.
              </p>
              <div className="mt-4">
                <ActionForm action={shareRecoveryCaseAction} submitLabel="Share this case" submitTone="secondary">
                  <input type="hidden" name="caseId" value={id} />
                  <Field label="Who?" htmlFor="granteeId" required>
                    <Select id="granteeId" name="granteeId" defaultValue="" required>
                      <option value="">Choose someone…</option>
                      {contacts.map((c) => (
                        <option key={c.user_id} value={c.user_id}>{c.display_name} — {c.circle_name}</option>
                      ))}
                    </Select>
                  </Field>
                </ActionForm>
              </div>
            </Card>
          )}

          <Card tone="sunken">
            <h2 className="font-semibold">Delete this case</h2>
            <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
              Removes the case, every item on its timeline, and every attached file. This cannot be undone,
              and you may still need this evidence for a bank dispute.
            </p>
            <div className="mt-4">
              <ActionButton
                action={deleteRecoveryCaseAction}
                label="Delete case and attachments"
                tone="danger"
                fields={{ caseId: id }}
                confirm="Delete this case and all attachments permanently? You may still need this for a bank dispute."
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
