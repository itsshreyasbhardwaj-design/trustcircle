import { NextResponse } from 'next/server';
import { audit } from '@/lib/auth';
import { currentUser } from '@/lib/session';
import { exportUserData } from '@/lib/export';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const user = await currentUser();
  if (!user) return new NextResponse('Sign in first.', { status: 401 });

  const data = exportUserData(user.id);
  audit(user.id, 'account.exported');

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="trustcircle-export-${stamp}.json"`,
      'Cache-Control': 'no-store, private',
    },
  });
}
