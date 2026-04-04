export const COOKIE_NAME = 'rp-admin-token';

export const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,       // LAN-only dashboard, no HTTPS
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 43200,       // 12 hours (matches RC token expiry)
};

// RC JWT role mapping: RC sends {sub: "admin", role: "staff"}
// Dashboard treats this combination as admin access
export function isAdmin(sub: string, role: string): boolean {
  return sub === 'admin' && (role === 'superadmin' || role === 'staff');
}
