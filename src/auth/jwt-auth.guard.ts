import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { AUTH_CONFIG, type AuthConfig } from './auth.config.js';
import type { AuthenticatedRequest } from './auth-context.js';
import { InvalidTokenError, verifyToken } from './jwt-verifier.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

const BEARER_PATTERN = /^Bearer +(\S+)$/i;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (!this.config.enabled) {
      // Local development only: no verification, the user comes from the body.
      const requesterId = (request.body as { requesterId?: unknown } | undefined)
        ?.requesterId;
      request.auth = {
        userId:
          typeof requesterId === 'string' && requesterId.trim() !== ''
            ? requesterId
            : undefined,
        authorization: header,
      };
      return true;
    }

    const token = header ? BEARER_PATTERN.exec(header)?.[1] : undefined;
    if (!token) {
      throw this.unauthorized(http.getResponse<Response>(), 'Missing bearer token');
    }

    try {
      const userId = await verifyToken(token, this.config.secret);
      request.auth = { userId, authorization: `Bearer ${token}` };
      return true;
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw this.unauthorized(http.getResponse<Response>(), error.message);
      }
      throw error;
    }
  }

  private unauthorized(response: Response, message: string) {
    response.setHeader('WWW-Authenticate', 'Bearer');
    return new UnauthorizedException(message);
  }
}
