import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * What the guard knows about the caller. It lives only on the request object
 * and is never persisted.
 */
export interface AuthContext {
  /** The token's `sub` claim (or the body's requesterId when auth is disabled). */
  userId?: string;
  /** The caller's Authorization header, to forward to other services. */
  authorization?: string;
}

export type AuthenticatedRequest = Request & { auth?: AuthContext };

export const Auth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth ?? {},
);
