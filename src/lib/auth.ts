import { jwtVerify, decodeJwt, errors } from 'jose';

// Phase 0.5d (PACT-20260503-017 Q4 AGREE-A): rotation grace.
// Mirrors racecontrol Rust `jwt_secret_previous` pattern at
// crates/racecontrol/src/auth/middleware.rs:84-95. Operator workflow:
// (1) set RC_JWT_SECRET_PREVIOUS = current value, (2) set RC_JWT_SECRET = new
// value, (3) deploy, (4) after grace window (12h matches admin JWT lifetime),
// unset RC_JWT_SECRET_PREVIOUS. Tokens issued with the previous secret remain
// valid until grace expires; users can re-login to upgrade their token.
function getCurrentSecret(): Uint8Array {
  const secret = process.env.RC_JWT_SECRET;
  if (!secret) throw new Error('RC_JWT_SECRET environment variable is required');
  return new TextEncoder().encode(secret);
}

function getPreviousSecret(): Uint8Array | null {
  const secret = process.env.RC_JWT_SECRET_PREVIOUS;
  if (!secret || secret.length === 0) return null;
  return new TextEncoder().encode(secret);
}

export interface StaffClaims {
  sub: string;
  role: string;
  exp: number;
  iat: number;
}

export async function verifyToken(token: string): Promise<StaffClaims> {
  try {
    const { payload } = await jwtVerify(token, getCurrentSecret(), {
      algorithms: ['HS256'],
    });
    return payload as unknown as StaffClaims;
  } catch (err) {
    // Rotation grace: only retry on signature mismatch (not expired/malformed).
    // JWSSignatureVerificationFailed is the jose error class for HMAC mismatch.
    if (err instanceof errors.JWSSignatureVerificationFailed) {
      const previous = getPreviousSecret();
      if (previous) {
        const { payload } = await jwtVerify(token, previous, {
          algorithms: ['HS256'],
        });
        // Token verified against previous secret — surface deprecation warn so
        // operator can monitor grace-window usage and decide when to unset.
        console.warn(
          '[auth] Token verified with RC_JWT_SECRET_PREVIOUS (rotation grace). ' +
            'User should re-login before grace window expires.',
        );
        return payload as unknown as StaffClaims;
      }
    }
    throw err;
  }
}

export function decodeToken(token: string): StaffClaims {
  const payload = decodeJwt(token);
  return payload as unknown as StaffClaims;
}
