// Next.js 16 proxy (formerly middleware). It runs before every page renders and does two things:
// 1. Sends signed-out visitors to sign-in before a protected page renders. This is an optimistic,
//    cookie-only check; the real authorization still happens server-side in each page and route.
// 2. Sets the Content Security Policy with a fresh nonce. Next reads the policy from the request
//    headers and adds the nonce to its own scripts (see src/lib/csp.ts for the policy itself).

import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { contentSecurityPolicy, cspHeaderName, CSP_REPORT_PATH } from '@/lib/csp';

const PROTECTED = ['/dashboard', '/progress', '/saved', '/settings', '/onboarding', '/attempt', '/admin', '/teams', '/interviews/'];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));
  if (isProtected && !getSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const policy = contentSecurityPolicy(nonce, { dev: process.env.NODE_ENV === 'development' });
  const header = cspHeaderName();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set(header, policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(header, policy);
  response.headers.set('Reporting-Endpoints', `csp="${request.nextUrl.origin}${CSP_REPORT_PATH}"`);
  return response;
}

export const config = {
  matcher: [{
    // Pages only: not API routes, build assets, icons, share images or crawler files, and not
    // link prefetches (the page they prefetch gets its own policy when it is actually opened).
    source: '/((?!api/|_next/static|_next/image|favicon.ico|icon|apple-icon|.*opengraph-image|robots.txt|sitemap.xml|llms.txt).*)',
    missing: [
      { type: 'header', key: 'next-router-prefetch' },
      { type: 'header', key: 'purpose', value: 'prefetch' },
    ],
  }],
};
