import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SignJWT } from 'jose';
import { signToken, TEST_JWT_SECRET } from '../../test/support/jwt.js';
import { HealthController } from '../health/health.controller.js';
import { ReportsController } from '../reports/interfaces/controllers/reports.controller.js';
import type { AuthConfig } from './auth.config.js';
import type { AuthenticatedRequest } from './auth-context.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const SECRET = new TextEncoder().encode(TEST_JWT_SECRET);
const ENABLED: AuthConfig = { enabled: true, secret: SECRET };
const REQUESTER_ID = '3b241101-e2bb-4255-8caf-4136c566a962';

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function buildContext(
  options: {
    headers?: Record<string, string>;
    body?: unknown;
    handler?: () => void;
    controller?: new (...args: never[]) => unknown;
  } = {},
) {
  const request = {
    headers: options.headers ?? {},
    body: options.body,
  } as unknown as AuthenticatedRequest;
  const response = { setHeader: vi.fn() };
  const context = {
    getHandler: () => options.handler ?? (() => undefined),
    getClass: () => options.controller ?? class Anonymous {},
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
  return { context, request, response };
}

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard(new Reflector(), ENABLED);
  const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

  it('accepts a valid HS256 token and exposes sub and the forwarded header', async () => {
    const token = await signToken({ sub: 'user-42' });
    const { context, request } = buildContext({ headers: bearer(token) });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.auth).toEqual({
      userId: 'user-42',
      authorization: `Bearer ${token}`,
    });
  });

  it.each(['HS384', 'HS512'] as const)(
    'accepts a valid %s token',
    async (alg) => {
      const token = await signToken({ alg });
      const { context } = buildContext({ headers: bearer(token) });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    },
  );

  it('rejects an expired token', async () => {
    const token = await signToken({ expiresInSeconds: -60 });
    const { context } = buildContext({ headers: bearer(token) });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token that is not valid yet (nbf in the future)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setNotBefore(now + 600)
      .setExpirationTime(now + 3600)
      .sign(SECRET);
    const { context } = buildContext({ headers: bearer(token) });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token without exp', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .sign(SECRET);
    const { context } = buildContext({ headers: bearer(token) });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with the wrong secret', async () => {
    const token = await signToken({
      secret: 'another-secret-another-secret-123456',
    });
    const { context } = buildContext({ headers: bearer(token) });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it.each([null, '', '   '])('rejects a token with sub=%j', async (sub) => {
    const token = await signToken({ sub });
    const { context } = buildContext({ headers: bearer(token) });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects the "none" algorithm', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const header = base64url({ alg: 'none', typ: 'JWT' });
    const payload = base64url({ sub: 'user-1', exp });
    const { context } = buildContext({
      headers: bearer(`${header}.${payload}.`),
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a non-HMAC algorithm', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const header = base64url({ alg: 'RS256', typ: 'JWT' });
    const payload = base64url({ sub: 'user-1', exp });
    const { context } = buildContext({
      headers: bearer(`${header}.${payload}.c2ln`),
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a missing Authorization header and sets WWW-Authenticate', async () => {
    const { context, response } = buildContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Bearer',
    );
  });

  it.each(['Basic dXNlcjpwYXNz', 'Bearer', 'Bearer a b', 'token-only'])(
    'rejects the malformed header %j',
    async (authorization) => {
      const { context } = buildContext({ headers: { authorization } });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    },
  );

  it('keeps GET /health public without any token', async () => {
    const { context } = buildContext({
      handler: HealthController.prototype.check,
      controller: HealthController,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('keeps the reports routes protected', async () => {
    const { context } = buildContext({
      handler: ReportsController.prototype.list,
      controller: ReportsController,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  describe('when authentication is disabled', () => {
    const disabledGuard = new JwtAuthGuard(new Reflector(), {
      enabled: false,
    });

    it('allows a request without a token and reads the user from the body', async () => {
      const { context, request } = buildContext({
        body: { requesterId: REQUESTER_ID },
      });

      await expect(disabledGuard.canActivate(context)).resolves.toBe(true);

      expect(request.auth).toEqual({
        userId: REQUESTER_ID,
        authorization: undefined,
      });
    });

    it('accepts a body requesterId that is not a UUID', async () => {
      const { context, request } = buildContext({
        body: { requesterId: 'user@example.com' },
      });

      await disabledGuard.canActivate(context);

      expect(request.auth?.userId).toBe('user@example.com');
    });

    it.each(['', '   ', 42, null])(
      'ignores an empty or non-string body requesterId (%p)',
      async (requesterId) => {
        const { context, request } = buildContext({ body: { requesterId } });

        await disabledGuard.canActivate(context);

        expect(request.auth?.userId).toBeUndefined();
      },
    );
  });
});
