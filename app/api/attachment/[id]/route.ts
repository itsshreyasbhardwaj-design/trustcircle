import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { attachmentAccess } from '@/lib/authz';
import { getAttachment } from '@/lib/recovery';

export const dynamic = 'force-dynamic';

/**
 * Private attachment serving.
 *
 * Authorisation is checked here on every request — ownership, or an unrevoked grant
 * on the recovery case the file belongs to. The id is opaque and unguessable, but the
 * id is never the authorisation.
 *
 * Everything is sent as an attachment with `nosniff` and a locked-down CSP, so a file
 * a user uploaded can never execute in this origin.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await currentUser();
  if (!user) return new NextResponse('Sign in first.', { status: 401 });

  const { id } = await params;
  if (!attachmentAccess(user.id, id)) {
    // Same answer for "does not exist" and "not yours".
    return new NextResponse('Not found.', { status: 404 });
  }

  const file = getAttachment(id);
  if (!file) return new NextResponse('Not found.', { status: 404 });

  return new NextResponse(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      'Content-Type': file.mime,
      'Content-Length': String(file.bytes.byteLength),
      'Content-Disposition': `attachment; filename="${file.filename.replace(/["\\]/g, '_')}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'no-store, private',
    },
  });
}
