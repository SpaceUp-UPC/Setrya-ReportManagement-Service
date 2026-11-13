import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ReportType } from '../../domain/enums/report-type.enum.js';
import type {
  HomeHistoryRow,
  ReportDataProvider,
  ReportDataRequest,
  ReportRow,
} from '../../domain/ports/report-data-provider.port.js';
import { describeIotMonitoringFailure } from '../clients/iot-monitoring/iot-monitoring-failure.js';
import type { IotMonitoringReadingDto } from '../clients/iot-monitoring/iot-monitoring-reading.dto.js';
import { IotMonitoringUnavailableError } from '../errors/iot-monitoring-unavailable.error.js';
import { MockReportDataProvider } from './mock-report-data-provider.js';

const DEFAULT_TIMEOUT_MS = 30_000;
const READINGS_LIMIT = 1000;
const TEMPERATURE_METRIC = 'temperature';
const HUMIDITY_METRIC = 'humidity';

@Injectable()
export class IotMonitoringReportDataProvider implements ReportDataProvider {
  private readonly logger = new Logger(IotMonitoringReportDataProvider.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly mockReportDataProvider: MockReportDataProvider,
  ) {}

  async getRows(request: ReportDataRequest): Promise<ReportRow[]> {
    if (request.type !== ReportType.HOME_HISTORY) {
      return this.mockReportDataProvider.getRows(request);
    }
    return this.getHomeHistoryRows(request);
  }

  private async getHomeHistoryRows(
    request: ReportDataRequest,
  ): Promise<HomeHistoryRow[]> {
    const readings = await this.fetchReadings(
      request.spaceId,
      request.authorization,
    );

    const isWithinPeriod = (reading: IotMonitoringReadingDto): boolean => {
      const measuredAt = new Date(reading.measuredAt ?? reading.receivedAt);
      return (
        measuredAt >= request.periodStart && measuredAt <= request.periodEnd
      );
    };

    const humidityByTimestamp = new Map<string, number>();
    for (const reading of readings) {
      if (reading.metricType !== HUMIDITY_METRIC || !isWithinPeriod(reading)) {
        continue;
      }
      const timestamp = new Date(
        reading.measuredAt ?? reading.receivedAt,
      ).toISOString();
      humidityByTimestamp.set(timestamp, reading.value);
    }

    return readings
      .filter(
        (reading) =>
          reading.metricType === TEMPERATURE_METRIC && isWithinPeriod(reading),
      )
      .map((reading) => {
        const timestamp = new Date(reading.measuredAt ?? reading.receivedAt);
        return {
          timestamp,
          temperature: reading.value,
          humidity: humidityByTimestamp.get(timestamp.toISOString()) ?? null,
        };
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private async fetchReadings(
    spaceId: string,
    authorization?: string,
  ): Promise<IotMonitoringReadingDto[]> {
    const baseUrl = this.configService.get<string>('IOT_MONITORING_URL', '');
    try {
      const response = await firstValueFrom(
        this.httpService.get<IotMonitoringReadingDto[]>(
          `${baseUrl}/api/v1/spaces/${spaceId}/readings`,
          {
            params: { limit: READINGS_LIMIT },
            timeout: this.getTimeoutMs(),
            headers: authorization ? { Authorization: authorization } : undefined,
          },
        ),
      );
      return response.data;
    } catch (error) {
      // Never log the request config or headers: they carry the caller's token.
      const { status, code, upstreamMessage, reason } =
        describeIotMonitoringFailure(error);
      this.logger.error(
        `IoT Monitoring request failed: spaceId=${spaceId} status=${status ?? 'none'} ` +
          `code=${code ?? 'none'} upstreamMessage=${upstreamMessage ?? 'none'} reason=${reason}`,
      );
      throw new IotMonitoringUnavailableError(spaceId, error);
    }
  }

  /** IOT_MONITORING_TIMEOUT_MS, falling back to the default when unset or invalid. */
  private getTimeoutMs(): number {
    const value = Number(
      this.configService.get<string | number>(
        'IOT_MONITORING_TIMEOUT_MS',
        DEFAULT_TIMEOUT_MS,
      ),
    );
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
  }
}
