import { loadAuthConfig } from './auth.config.js';

const read = (env: Record<string, string>) => (key: string) => env[key];

describe('loadAuthConfig', () => {
  it('uses the secret as raw text by default', () => {
    const config = loadAuthConfig(read({ JWT_SECRET: 'abc+/=' }));

    expect(config).toEqual({
      enabled: true,
      secret: new TextEncoder().encode('abc+/='),
    });
  });

  it('Base64-decodes the secret when JWT_SECRET_BASE64=true', () => {
    const encoded = Buffer.from('shared-secret').toString('base64');

    const config = loadAuthConfig(
      read({ JWT_SECRET: encoded, JWT_SECRET_BASE64: 'true' }),
    );

    expect(config).toEqual({
      enabled: true,
      secret: new TextEncoder().encode('shared-secret'),
    });
  });

  it('rejects a secret that is not Base64 when JWT_SECRET_BASE64=true', () => {
    expect(() =>
      loadAuthConfig(
        read({ JWT_SECRET: 'not base64!', JWT_SECRET_BASE64: 'true' }),
      ),
    ).toThrow(/Base64/);
  });

  it.each([undefined, '', '   '])(
    'refuses to start with JWT_SECRET=%j',
    (secret) => {
      const env: Record<string, string> =
        secret === undefined ? {} : { JWT_SECRET: secret };

      expect(() => loadAuthConfig(read(env))).toThrow(/JWT_SECRET is required/);
    },
  );

  it('allows a missing secret only with AUTH_DISABLED=true', () => {
    expect(loadAuthConfig(read({ AUTH_DISABLED: 'true' }))).toEqual({
      enabled: false,
    });
  });

  it.each(['false', '', '1', 'yes'])(
    'keeps authentication on for AUTH_DISABLED=%j',
    (value) => {
      expect(() => loadAuthConfig(read({ AUTH_DISABLED: value }))).toThrow(
        /JWT_SECRET is required/,
      );
    },
  );
});
