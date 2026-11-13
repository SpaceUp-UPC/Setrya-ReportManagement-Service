import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

const BASE = '/api/v1/reports';

function payload(overrides: Record<string, unknown> = {}) {
  return {
    type: 'MAINTENANCE',
    spaceId: randomUUID(),
    periodStart: '2026-01-01T00:00:00.000Z',
    periodEnd: '2026-01-04T00:00:00.000Z',
    format: 'CSV',
    ...overrides,
  };
}

describe('Reports with AUTH_DISABLED=true (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const previous = {
    AUTH_DISABLED: process.env.AUTH_DISABLED,
    JWT_SECRET: process.env.JWT_SECRET,
  };

  beforeAll(async () => {
    process.env.AUTH_DISABLED = 'true';
    delete process.env.JWT_SECRET;
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterEach(async () => {
    const rows: { file_url: string | null }[] = await dataSource.query(
      'SELECT file_url FROM reports WHERE file_url IS NOT NULL',
    );
    await Promise.all(rows.map((row) => rm(row.file_url!, { force: true })));
    await dataSource.query('TRUNCATE TABLE reports');
  });

  afterAll(async () => {
    await app.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('creates a report without a token, taking requesterId from the body', async () => {
    const requesterId = randomUUID();

    const res = await request(app.getHttpServer())
      .post(BASE)
      .send(payload({ requesterId }))
      .expect(201);

    expect(res.body.requesterId).toBe(requesterId);
  });

  it('accepts any non-empty string as requesterId, such as an email', async () => {
    const res = await request(app.getHttpServer())
      .post(BASE)
      .send(payload({ requesterId: 'user@example.com' }))
      .expect(201);

    expect(res.body.requesterId).toBe('user@example.com');
  });

  it('returns 400 when the body has no usable requesterId', async () => {
    await request(app.getHttpServer()).post(BASE).send(payload()).expect(400);
    await request(app.getHttpServer())
      .post(BASE)
      .send(payload({ requesterId: '' }))
      .expect(400);
    await request(app.getHttpServer())
      .post(BASE)
      .send(payload({ requesterId: 42 }))
      .expect(400);
  });
});
