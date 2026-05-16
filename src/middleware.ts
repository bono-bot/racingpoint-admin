import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Inline constants to avoid import issues in Edge Runtime
const COOKIE_NAME = 'rp-admin-token';
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout', '/api/auth/me', '/api/health'];

function getSecret() {
  const secret = process.env.RC_JWT_SECRET;
  if (!secret) throw new Error('RC_JWT_SECRET environment variable is required');
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname.endsWith('.ico') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.jpg')) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
    });
    // Pass user info downstream via headers
    const res = NextResponse.next();
    res.headers.set('x-user-role', (payload.role as string) || 'unknown');
    res.headers.set('x-user-sub', (payload.sub as string) || 'unknown');
    return res;
  } catch {
    // Token expired or invalid -- clear cookie and redirect to login
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete(COOKIE_NAME);
    return res;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
