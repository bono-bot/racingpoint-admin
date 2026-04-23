import { NextRequest, NextResponse } from 'next/server';

const COMING_SOON_GATE = process.env.ADMIN_COMING_SOON_GATE !== '0';

// `/api/rc/` and `/api/admin-gateway/` are part of the spinal-cord gateway contract
// (GATEWAY-CONTRACT.md + doctrine v3 §5). They MUST bypass the COMING_SOON gate so
// PWA / Kiosk / WhatsApp / rc-agent can reach racecontrol via cloud admin (A3 organ).
// Without this, cloud middleware 503s `/api/rc/*` before the proxy code runs and
// the spine is broken for the cloud organ.
const GATE_PUBLIC_PREFIXES = [
  '/coming-soon',
  '/api/health',
  '/api/auth/',
  '/api/rc/',
  '/api/admin-gateway/',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname.endsWith('.ico') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.jpg')) {
    return NextResponse.next();
  }

  if (!COMING_SOON_GATE) {
    return NextResponse.next();
  }

  if (GATE_PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'cloud_admin_gated', detail: 'Cloud admin is temporarily gated. Use venue admin :3201.' },
      { status: 503 },
    );
  }

  const comingSoon = new URL('/coming-soon', req.url);
  return NextResponse.redirect(comingSoon);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
