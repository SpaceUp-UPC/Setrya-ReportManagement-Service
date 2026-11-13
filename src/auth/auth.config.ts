export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

export type AuthConfig =
  | { enabled: true; secret: Uint8Array }
  | { enabled: false };

const BASE64_PATTERN = /^[A-Za-z0-9+/_-]+={0,2}$/;

function isTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

/**
 * Builds the authentication settings from the environment and throws when they
 * are unusable, so the application refuses to start instead of running open.
 * Only an explicit AUTH_DISABLED=true turns authentication off.
 */
export function loadAuthConfig(
  read: (key: string) => string | undefined,
): AuthConfig {
  if (isTrue(read('AUTH_DISABLED'))) {
    return { enabled: false };
  }

  const rawSecret = read('JWT_SECRET');
  if (rawSecret === undefined || rawSecret.trim() === '') {
    throw new Error(
      'JWT_SECRET is required. Set it to the secret shared with the IAM service, ' +
        'or set AUTH_DISABLED=true for local development only.',
    );
  }

  if (!isTrue(read('JWT_SECRET_BASE64'))) {
    return { enabled: true, secret: new TextEncoder().encode(rawSecret) };
  }

  const encoded = rawSecret.trim();
  if (!BASE64_PATTERN.test(encoded)) {
    throw new Error(
      'JWT_SECRET_BASE64 is true but JWT_SECRET is not valid Base64.',
    );
  }
  const secret = new Uint8Array(Buffer.from(encoded, 'base64'));
  if (secret.length === 0) {
    throw new Error('JWT_SECRET decodes to an empty secret.');
  }
  return { enabled: true, secret };
}
