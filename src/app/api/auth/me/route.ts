import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/lib/auth-config';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const claims = await verifyToken(token);
    return NextResponse.json({
      sub: claims.sub,
      role: claims.role,
      exp: claims.exp,
      iat: claims.iat,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
