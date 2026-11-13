import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AUTH_CONFIG, loadAuthConfig } from './auth.config.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Module({
  providers: [
    {
      provide: AUTH_CONFIG,
      useFactory: (configService: ConfigService) => {
        const config = loadAuthConfig((key) => configService.get<string>(key));
        if (!config.enabled) {
          new Logger('Auth').warn(
            'AUTH_DISABLED=true: requests are NOT authenticated. ' +
              'Never use this outside local development.',
          );
        }
        return config;
      },
      inject: [ConfigService],
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AUTH_CONFIG],
})
export class AuthModule {}
