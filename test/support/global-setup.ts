import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { E2E_DB_NAME } from './e2e-env.js';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsGlob = join(
  here,
  '../../src/reports/infrastructure/persistence/migrations/*.ts',
);

function connectionOptions(database: string) {
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
  };
}

async function ensureDatabaseExists(): Promise<void> {
  // Connect to the maintenance database to create the test one if missing.
  const admin = new Client(connectionOptions('postgres'));
  await admin.connect();
  try {
    const { rowCount } = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [E2E_DB_NAME],
    );
    if (!rowCount) {
      // Identifiers cannot be parameterized; the name is quoted and escaped.
      await admin.query(`CREATE DATABASE "${E2E_DB_NAME.replace(/"/g, '""')}"`);
    }
  } finally {
    await admin.end();
  }
}

async function runMigrations(): Promise<void> {
  const { user, ...rest } = connectionOptions(E2E_DB_NAME);
  const dataSource = new DataSource({
    type: 'postgres',
    ...rest,
    username: user,
    migrations: [migrationsGlob],
  });
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}

export default async function setup(): Promise<void> {
  try {
    await ensureDatabaseExists();
    await runMigrations();
  } catch (error) {
    throw new Error(
      `Could not prepare the e2e database "${E2E_DB_NAME}". ` +
        'Is PostgreSQL running? Start it with: docker compose up -d postgres\n' +
        String(error),
      { cause: error },
    );
  }
}
