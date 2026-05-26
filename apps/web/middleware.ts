import { NextResponse, type NextRequest } from 'next/server';

import { getServerEnv } from '@luxematch/config';
import { PIN_COOKIE_NAME, verifyPinCookie } from '@luxematch/tenant';

// Use the Node.js runtime so node:crypto (HMAC) is available to verify the
// signed PIN cookie. Edge runtime would force us to reimplement signing
// against Web Crypto — not worth the duplication.
export const runtime = 'nodejs';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /jeweller/unlock is the only public jeweller route.
  if (pathname === '/jeweller/unlock' || pathname.startsWith('/jeweller/unlock/')) {
    return NextResponse.next();
  }

  const env = getServerEnv();
  const cookie = req.cookies.get(PIN_COOKIE_NAME)?.value;
  const result = await verifyPinCookie(cookie, {
    secret: env.LM_PIN_COOKIE_SECRET,
    ttlSeconds: env.LM_PIN_COOKIE_TTL_SECONDS,
  });

  if (!result.valid) {
    const url = req.nextUrl.clone();
    url.pathname = '/jeweller/unlock';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/jeweller/:path*'],
};
