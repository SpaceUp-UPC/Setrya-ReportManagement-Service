import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ReportType } from '../../domain/enums/report-type.enum.js';
import type {
  HomeHistoryRow,
  ReportDataProvider,
  ReportDataRequest,
  ReportRow,
} from '../../domain/ports/report-data-provider.port.js';
import type { IotMonitoringReadingDto } from '../clients/iot-monitoring/iot-monitoring-reading.dto.js';
import { IotMonitoringUnavailableError } from '../errors/iot-monitoring-unavailable.error.js';
import { MockReportDataProvider } from './mock-report-data-provider.js';

const REQUEST_TIMEOUT_MS = 5000;
const READINGS_LIMIT = 1000;
const TEMPERATURE_METRIC = 'temperature';
const HUMIDITY_METRIC = 'humidity';

@Injectable()
export class IotMonitoringReportDataProvider implements ReportDataProvider {
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
    const readings = await this.fetchReadings(request.spaceId);

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
  ): Promise<IotMonitoringReadingDto[]> {
    const baseUrl = this.configService.get<string>('IOT_MONITORING_URL', '');
    try {
      const response = await firstValueFrom(
        this.httpService.get<IotMonitoringReadingDto[]>(
          `${baseUrl}/api/v1/spaces/${spaceId}/readings`,
          { params: { limit: READINGS_LIMIT }, timeout: REQUEST_TIMEOUT_MS },
        ),
      );
      return response.data;
    } catch (error) {
      throw new IotMonitoringUnavailableError(spaceId, error);
    }
  }
}
