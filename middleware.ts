import { NextResponse, type NextRequest } from 'next/server';

/**
 * Normalises an unparseable `Origin: null` header — in development only.
 *
 * Next's Server Action handler calls `new URL(origin)` before it consults
 * `allowedOrigins`, so a literal `Origin: null` — which sandboxed iframes, some
 * preview panes and certain cross-origin redirects send — throws and the request
 * fails with an opaque 500 rather than a clean rejection.
 *
 * In development the header is dropped, which makes Next fall back to its
 * no-origin path (the same one `curl` takes) so local tooling works. In production
 * it is left exactly as it is: a null origin is unverifiable, and the CSRF check
 * that Server Actions rely on must stay strict where it actually matters.
 */
export function middleware(request: NextRequest): NextResponse {
  if (process.env.NODE_ENV === 'production' || request.headers.get('origin') !== 'null') {
    return NextResponse.next();
  }
  const headers = new Headers(request.headers);
  headers.delete('origin');
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // `_not-found` is excluded deliberately: including it makes the Next build fail with
  // "Invariant: no direct app page entry found for /_not-found". Static assets and
  // `_next` are excluded because the middleware has nothing to do for them.
  matcher: ['/((?!_next|_not-found|ocr|icon.svg|manifest.webmanifest|robots.txt).*)'],
};
