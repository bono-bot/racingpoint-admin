import { jwtVerify, decodeJwt } from 'jose';

const getSecret = () => {
  const secret = process.env.RC_JWT_SECRET;
  if (!secret) throw new Error('RC_JWT_SECRET environment variable is required');
  return new TextEncoder().encode(secret);
};

export interface StaffClaims {
  sub: string;
  role: string;
  exp: number;
  iat: number;
}

export async function verifyToken(token: string): Promise<StaffClaims> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ['HS256'],
  });
  return payload as unknown as StaffClaims;
}

export function decodeToken(token: string): StaffClaims {
  const payload = decodeJwt(token);
  return payload as unknown as StaffClaims;
}
