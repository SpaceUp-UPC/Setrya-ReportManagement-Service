import { config } from 'dotenv';
import 'reflect-metadata';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { ReportOrmEntity } from './reports/infrastructure/persistence/entities/report.orm-entity.js';

config();

// Resolves relative to this file so the same glob works whether it runs as
// TypeScript via tsx (dev) or as compiled JavaScript from dist/ (prod).
const here = dirname(fileURLToPath(import.meta.url));
const migrationsExt = import.meta.url.endsWith('.ts') ? 'ts' : 'js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [ReportOrmEntity],
  migrations: [
    join(
      here,
      'reports/infrastructure/persistence/migrations',
      `*.${migrationsExt}`,
    ),
  ],
  synchronize: false,
});
