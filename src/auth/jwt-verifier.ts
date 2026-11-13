import { jwtVerify } from 'jose';

// HMAC only: asymmetric algorithms and "none" must never be accepted here.
const ALLOWED_ALGORITHMS = ['HS256', 'HS384', 'HS512'];

export class InvalidTokenError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InvalidTokenError';
  }
}

/**
 * Verifies the signature, the algorithm, `exp` (required) and `nbf` (when
 * present), and requires a non-empty `sub`. Returns the `sub` claim.
 */
export async function verifyToken(
  token: string,
  secret: Uint8Array,
): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ALLOWED_ALGORITHMS,
      requiredClaims: ['exp'],
    });
    if (typeof payload.sub !== 'string' || payload.sub.trim() === '') {
      throw new InvalidTokenError('Token has no subject');
    }
    return payload.sub;
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      throw error;
    }
    throw new InvalidTokenError('Invalid or expired token', { cause: error });
  }
}
