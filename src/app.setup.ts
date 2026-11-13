import { ValidationPipe, type INestApplication } from '@nestjs/common';

/**
 * Applies the HTTP configuration shared by the real server and the e2e tests,
 * so both behave identically (validation and the versioned prefix).
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');
}
