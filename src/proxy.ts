// Next.js 16 proxy (formerly middleware): an optimistic, cookie-only check
// that sends signed-out visitors to sign-in before a protected page renders.
// The real authorization still happens server-side in each page and route.

import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const PROTECTED = ['/dashboard', '/progress', '/saved', '/settings', '/onboarding', '/attempt', '/admin', '/teams', '/interviews/'];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`))) return NextResponse.next();
  if (getSessionCookie(request)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = '/sign-in';
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/dashboard/:path*', '/progress/:path*', '/saved/:path*', '/settings/:path*', '/onboarding/:path*', '/attempt/:path*', '/admin/:path*', '/teams/:path*', '/interviews/:path+'],
};
