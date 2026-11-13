import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Parses CORS_ALLOWED_ORIGINS (comma-separated, "*" allowed). Returns null when
 * nothing is configured, which leaves CORS disabled.
 */
export function parseAllowedOrigins(
  value: string | undefined,
): true | string[] | null {
  const origins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin !== '');
  if (origins.length === 0) {
    return null;
  }
  return origins.includes('*') ? true : origins;
}

/**
 * Applies the HTTP configuration shared by the real server and the e2e tests,
 * so both behave identically (validation, the versioned prefix and CORS).
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');

  const origin = parseAllowedOrigins(
    app.get(ConfigService).get<string>('CORS_ALLOWED_ORIGINS'),
  );
  if (origin !== null) {
    app.enableCors({
      origin,
      allowedHeaders: ['Authorization', 'Content-Type'],
    });
  }
}
