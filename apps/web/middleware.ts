import { NextResponse, type NextRequest } from 'next/server';

import { getServerEnv } from '@luxematch/config';
import {
  MANUFACTURER_COOKIE_NAME,
  PIN_COOKIE_NAME,
  STORE_COOKIE_NAME,
  getShopJewellerIdOptional,
  verifyManufacturerCookie,
  verifyPinCookie,
  verifyStoreCookie,
} from '@luxematch/tenant';

// Use the Node.js runtime so node:crypto (HMAC) is available to verify the
// signed PIN cookie. Edge runtime would force us to reimplement signing
// against Web Crypto — not worth the duplication.
export const runtime = 'nodejs';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const env = getServerEnv();

  if (pathname === '/manufacturer/login' || pathname.startsWith('/manufacturer/login/')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/manufacturer')) {
    const secret = env.MANUFACTURER_COOKIE_SECRET;
    if (!secret) {
      const url = req.nextUrl.clone();
      url.pathname = '/manufacturer/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    const cookie = req.cookies.get(MANUFACTURER_COOKIE_NAME)?.value;
    const result = await verifyManufacturerCookie(cookie, {
      secret,
      ttlSeconds: env.LM_MANUFACTURER_COOKIE_TTL_SECONDS,
    });

    if (!result.valid) {
      const url = req.nextUrl.clone();
      url.pathname = '/manufacturer/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // /jeweller/unlock is the only public jeweller route.
  if (pathname === '/jeweller/unlock' || pathname.startsWith('/jeweller/unlock/')) {
    return NextResponse.next();
  }

  const storeCookie = req.cookies.get(STORE_COOKIE_NAME)?.value;
  const storeResult = await verifyStoreCookie(storeCookie, {
    secret: env.LM_PIN_COOKIE_SECRET,
    ttlSeconds: env.LM_STORE_COOKIE_TTL_SECONDS,
  });
  if (storeResult.valid) {
    return NextResponse.next();
  }

  const pinCookie = req.cookies.get(PIN_COOKIE_NAME)?.value;
  const pinResult = await verifyPinCookie(pinCookie, {
    secret: env.LM_PIN_COOKIE_SECRET,
    ttlSeconds: env.LM_PIN_COOKIE_TTL_SECONDS,
  });

  if (!pinResult.valid) {
    const url = req.nextUrl.clone();
    url.pathname = getShopJewellerIdOptional() ? '/jeweller/unlock' : '/store/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/jeweller/:path*', '/manufacturer/:path*'],
};
