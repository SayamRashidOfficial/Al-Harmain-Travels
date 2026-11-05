import crypto from 'crypto';

interface VerificationPayload {
  userId: string;
  email: string;
  exp: number;
}

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'alharmain-travels-auth-secret-key-2026';

/**
 * Creates a signed verification token valid for 24 hours.
 */
export function createVerificationToken(userId: string, email: string): string {
  const payload: VerificationPayload = {
    userId,
    email: email.trim().toLowerCase(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies a signed verification token and returns the payload if valid.
 */
export function verifyVerificationToken(token: string): VerificationPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', SECRET)
      .update(payloadB64)
      .digest('base64url');

    // Constant-time comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload: VerificationPayload = JSON.parse(payloadJson);

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
