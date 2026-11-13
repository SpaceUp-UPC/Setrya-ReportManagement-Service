import { randomUUID } from 'node:crypto';
import { HttpService } from '@nestjs/axios';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { throwError } from 'rxjs';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { signToken } from './support/jwt.js';

const BASE = '/api/v1/reports';

describe('Generate with IoT Monitoring unavailable (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let token: string;
  let previousProvider: string | undefined;

  const http = () =>
    request.agent(app.getHttpServer()).set('Authorization', `Bearer ${token}`);

  // Shaped like an AxiosError, as thrown by the real HttpService.
  function axiosLikeError(code: string | undefined, status?: number): Error {
    return Object.assign(new Error('upstream failure'), {
      isAxiosError: true,
      code,
      response: status === undefined ? undefined : { status },
    });
  }

  async function bootWithUpstreamFailure(error: Error) {
    // Real IoT provider and real use case; only the HTTP transport fails.
    previousProvider = process.env.DATA_PROVIDER;
    process.env.DATA_PROVIDER = 'http';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(HttpService)
      .useValue({ get: () => throwError(() => error) })
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);
  }

  async function createHomeHistoryReport(): Promise<string> {
    const res = await http()
      .post(BASE)
      .send({
        type: 'HOME_HISTORY',
        spaceId: randomUUID(),
        periodStart: '2026-01-01T00:00:00.000Z',
        periodEnd: '2026-01-04T00:00:00.000Z',
        format: 'CSV',
      })
      .expect(201);
    return res.body.id as string;
  }

  beforeAll(async () => {
    token = await signToken({ sub: randomUUID() });
  });

  afterEach(async () => {
    await app.close();
    if (previousProvider === undefined) {
      delete process.env.DATA_PROVIDER;
    } else {
      process.env.DATA_PROVIDER = previousProvider;
    }
  });

  it('returns 502 with the upstream status and marks the report FAILED when IoT Monitoring rejects the token', async () => {
    await bootWithUpstreamFailure(axiosLikeError('ERR_BAD_REQUEST', 401));
    const id = await createHomeHistoryReport();

    const res = await http().post(`${BASE}/${id}/generate`).expect(502);

    expect(res.body).toEqual({
      statusCode: 502,
      message:
        'IoT Monitoring service is unavailable or rejected the request (upstream status 401)',
      error: 'Bad Gateway',
      upstreamStatus: 401,
    });
    const report = await http().get(`${BASE}/${id}`).expect(200);
    expect(report.body.status).toBe('FAILED');
  });

  it('returns 502 without an upstream status when IoT Monitoring times out', async () => {
    await bootWithUpstreamFailure(axiosLikeError('ECONNABORTED'));
    const id = await createHomeHistoryReport();

    const res = await http().post(`${BASE}/${id}/generate`).expect(502);

    expect(res.body).toEqual({
      statusCode: 502,
      message: 'IoT Monitoring service is unavailable or rejected the request',
      error: 'Bad Gateway',
    });
  });
});
