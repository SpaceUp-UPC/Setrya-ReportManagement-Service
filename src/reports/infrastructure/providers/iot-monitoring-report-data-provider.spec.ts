import type { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { MockInstance } from 'vitest';
import { of, throwError } from 'rxjs';
import { ReportType } from '../../domain/enums/report-type.enum.js';
import type { ReportDataRequest } from '../../domain/ports/report-data-provider.port.js';
import type { IotMonitoringReadingDto } from '../clients/iot-monitoring/iot-monitoring-reading.dto.js';
import { IotMonitoringUnavailableError } from '../errors/iot-monitoring-unavailable.error.js';
import { IotMonitoringReportDataProvider } from './iot-monitoring-report-data-provider.js';
import { MockReportDataProvider } from './mock-report-data-provider.js';

describe('IotMonitoringReportDataProvider', () => {
  let httpService: HttpService;
  let configService: ConfigService;
  let mockReportDataProvider: MockReportDataProvider;
  let provider: IotMonitoringReportDataProvider;

  beforeEach(() => {
    // Keep expected failure logs out of the test output.
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    httpService = { get: vi.fn() } as unknown as HttpService;
    configService = {
      get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
    } as unknown as ConfigService;
    mockReportDataProvider = new MockReportDataProvider();
    provider = new IotMonitoringReportDataProvider(
      httpService,
      configService,
      mockReportDataProvider,
    );
  });

  function buildRequest(
    overrides: Partial<ReportDataRequest> = {},
  ): ReportDataRequest {
    return {
      type: ReportType.HOME_HISTORY,
      spaceId: 'space-1',
      periodStart: new Date('2026-01-01T00:00:00.000Z'),
      periodEnd: new Date('2026-01-02T00:00:00.000Z'),
      ...overrides,
    };
  }

  it('delegates to the mock provider for non HOME_HISTORY reports', async () => {
    const request = buildRequest({ type: ReportType.INSTALLATION });
    const spy = vi.spyOn(mockReportDataProvider, 'getRows');

    await provider.getRows(request);

    expect(spy).toHaveBeenCalledWith(request);
    expect(httpService.get).not.toHaveBeenCalled();
  });

  it('maps temperature and humidity readings into rows, filtered by period', async () => {
    const readings: IotMonitoringReadingDto[] = [
      {
        id: '1',
        deviceId: 'device-1',
        metricType: 'temperature',
        value: 22,
        unit: 'C',
        receivedAt: '2026-01-01T10:00:05.000Z',
        measuredAt: '2026-01-01T10:00:00.000Z',
        status: 'received',
      },
      {
        id: '2',
        deviceId: 'device-2',
        metricType: 'humidity',
        value: 55,
        unit: '%',
        receivedAt: '2026-01-01T10:00:05.000Z',
        measuredAt: '2026-01-01T10:00:00.000Z',
        status: 'received',
      },
      {
        id: '3',
        deviceId: 'device-1',
        metricType: 'temperature',
        value: 19,
        unit: 'C',
        receivedAt: '2026-05-01T10:00:00.000Z',
        measuredAt: '2026-05-01T10:00:00.000Z',
        status: 'received',
      },
    ];
    vi.mocked(httpService.get).mockReturnValue(of({ data: readings } as any));

    const rows = await provider.getRows(buildRequest());

    expect(rows).toEqual([
      {
        timestamp: new Date('2026-01-01T10:00:00.000Z'),
        temperature: 22,
        humidity: 55,
      },
    ]);
  });

  it('leaves humidity empty when there is no matching humidity reading', async () => {
    const readings: IotMonitoringReadingDto[] = [
      {
        id: '1',
        deviceId: 'device-1',
        metricType: 'temperature',
        value: 22,
        unit: 'C',
        receivedAt: '2026-01-01T10:00:00.000Z',
        status: 'received',
      },
    ];
    vi.mocked(httpService.get).mockReturnValue(of({ data: readings } as any));

    const rows = await provider.getRows(buildRequest());

    expect(rows).toEqual([
      {
        timestamp: new Date('2026-01-01T10:00:00.000Z'),
        temperature: 22,
        humidity: null,
      },
    ]);
  });

  it('forwards the caller Authorization header to IoT Monitoring', async () => {
    vi.mocked(httpService.get).mockReturnValue(of({ data: [] } as any));

    await provider.getRows(buildRequest({ authorization: 'Bearer caller-token' }));

    expect(httpService.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/spaces/space-1/readings'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer caller-token' },
      }),
    );
  });

  it('sends no Authorization header when the caller has none', async () => {
    vi.mocked(httpService.get).mockReturnValue(of({ data: [] } as any));

    await provider.getRows(buildRequest());

    const [, options] = vi.mocked(httpService.get).mock.calls[0];
    expect(options?.headers).toBeUndefined();
  });

  it('throws IotMonitoringUnavailableError when the HTTP call fails', async () => {
    vi.mocked(httpService.get).mockReturnValue(
      throwError(() => new Error('network error')),
    );

    await expect(provider.getRows(buildRequest())).rejects.toThrow(
      IotMonitoringUnavailableError,
    );
  });

  describe('timeout', () => {
    function mockTimeout(value: unknown) {
      vi.mocked(configService.get).mockImplementation(
        (key: string, defaultValue?: unknown) =>
          key === 'IOT_MONITORING_TIMEOUT_MS' ? value : defaultValue,
      );
      vi.mocked(httpService.get).mockReturnValue(of({ data: [] } as any));
    }

    async function usedTimeout(): Promise<unknown> {
      await provider.getRows(buildRequest());
      const [, options] = vi.mocked(httpService.get).mock.calls[0];
      return options?.timeout;
    }

    it('defaults to 30000 ms when IOT_MONITORING_TIMEOUT_MS is not set', async () => {
      vi.mocked(httpService.get).mockReturnValue(of({ data: [] } as any));

      expect(await usedTimeout()).toBe(30000);
    });

    it('uses IOT_MONITORING_TIMEOUT_MS when set (env values are strings)', async () => {
      mockTimeout('12000');

      expect(await usedTimeout()).toBe(12000);
    });

    it.each(['abc', '0', '-5', ''])(
      'falls back to the default for invalid value %j',
      async (value) => {
        mockTimeout(value);

        expect(await usedTimeout()).toBe(30000);
      },
    );
  });

  describe('upstream failures', () => {
    let logError: MockInstance;

    beforeEach(() => {
      logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      logError.mockClear();
    });

    afterEach(() => {
      logError.mockRestore();
    });

    // Shaped like an AxiosError: the request config (with the caller's
    // Authorization header) is attached and must never be logged.
    function axiosLikeError(
      message: string,
      extra: { code?: string; status?: number; data?: unknown } = {},
    ): Error {
      return Object.assign(new Error(message), {
        isAxiosError: true,
        code: extra.code,
        config: { headers: { Authorization: 'Bearer secret-token' } },
        response:
          extra.status === undefined
            ? undefined
            : { status: extra.status, data: extra.data },
      });
    }

    function loggedText(): string {
      return logError.mock.calls.map((call) => String(call[0])).join('\n');
    }

    it('logs and reports the upstream status when IoT Monitoring rejects the token (401)', async () => {
      vi.mocked(httpService.get).mockReturnValue(
        throwError(() =>
          axiosLikeError('Request failed with status code 401', {
            code: 'ERR_BAD_REQUEST',
            status: 401,
            data: { message: 'Invalid token' },
          }),
        ),
      );

      const error = await provider
        .getRows(buildRequest({ authorization: 'Bearer secret-token' }))
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(IotMonitoringUnavailableError);
      expect((error as IotMonitoringUnavailableError).upstreamStatus).toBe(401);
      expect(logError).toHaveBeenCalledOnce();
      const text = loggedText();
      expect(text).toContain('spaceId=space-1');
      expect(text).toContain('status=401');
      expect(text).toContain('code=ERR_BAD_REQUEST');
      expect(text).toContain('upstreamMessage=Invalid token');
    });

    it('logs the error code and has no upstream status on a timeout', async () => {
      vi.mocked(httpService.get).mockReturnValue(
        throwError(() =>
          axiosLikeError('timeout of 30000ms exceeded', { code: 'ECONNABORTED' }),
        ),
      );

      const error = await provider
        .getRows(buildRequest())
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(IotMonitoringUnavailableError);
      expect((error as IotMonitoringUnavailableError).upstreamStatus).toBeUndefined();
      const text = loggedText();
      expect(text).toContain('status=none');
      expect(text).toContain('code=ECONNABORTED');
      expect(text).toContain('timeout of 30000ms exceeded');
    });

    it('logs the error code and has no upstream status on a network error', async () => {
      vi.mocked(httpService.get).mockReturnValue(
        throwError(() =>
          axiosLikeError('getaddrinfo ENOTFOUND iot.example.test', {
            code: 'ENOTFOUND',
          }),
        ),
      );

      const error = await provider
        .getRows(buildRequest())
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(IotMonitoringUnavailableError);
      expect((error as IotMonitoringUnavailableError).upstreamStatus).toBeUndefined();
      expect(loggedText()).toContain('code=ENOTFOUND');
    });

    it('never logs the Authorization header or token', async () => {
      vi.mocked(httpService.get).mockReturnValue(
        throwError(() =>
          axiosLikeError('Request failed with status code 401', { status: 401 }),
        ),
      );

      await provider
        .getRows(buildRequest({ authorization: 'Bearer secret-token' }))
        .catch(() => undefined);

      expect(loggedText()).not.toContain('secret-token');
      expect(loggedText()).not.toContain('Bearer');
    });
  });
});
