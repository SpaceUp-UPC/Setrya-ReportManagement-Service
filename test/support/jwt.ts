import { SignJWT } from 'jose';

export const TEST_JWT_SECRET = 'e2e-test-secret-with-enough-length-0123456789';

export interface SignOptions {
  secret?: string;
  alg?: 'HS256' | 'HS384' | 'HS512';
  sub?: string | null;
  /** Seconds from now; negative means already expired. Default: 1 hour. */
  expiresInSeconds?: number;
}

/** Signs a token like IAM would, for tests. */
export async function signToken(options: SignOptions = {}): Promise<string> {
  const {
    secret = TEST_JWT_SECRET,
    alg = 'HS256',
    sub = 'user-1',
    expiresInSeconds = 3600,
  } = options;
  const jwt = new SignJWT({}).setProtectedHeader({ alg });
  if (sub !== null) {
    jwt.setSubject(sub);
  }
  return jwt
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(new TextEncoder().encode(secret));
}
