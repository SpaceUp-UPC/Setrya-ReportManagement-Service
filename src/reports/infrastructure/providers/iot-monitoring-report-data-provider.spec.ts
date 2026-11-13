import type { HttpService } from '@nestjs/axios';
import type { ConfigService } from '@nestjs/config';
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
});
