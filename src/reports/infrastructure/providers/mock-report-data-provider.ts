import { Injectable } from '@nestjs/common';
import { ReportType } from '../../domain/enums/report-type.enum.js';
import type {
  ReportDataProvider,
  ReportDataRequest,
  ReportRow,
} from '../../domain/ports/report-data-provider.port.js';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class MockReportDataProvider implements ReportDataProvider {
  async getRows(request: ReportDataRequest): Promise<ReportRow[]> {
    if (request.type === ReportType.HOME_HISTORY) {
      return this.buildHomeHistoryRows(request);
    }
    return this.buildDeviceServiceRows(request);
  }

  private buildHomeHistoryRows(request: ReportDataRequest): ReportRow[] {
    const days = Math.max(
      1,
      Math.round(
        (request.periodEnd.getTime() - request.periodStart.getTime()) /
          MILLISECONDS_PER_DAY,
      ),
    );

    return Array.from({ length: days }, (_, index) => {
      const timestamp = new Date(
        request.periodStart.getTime() + index * MILLISECONDS_PER_DAY,
      );
      return {
        timestamp,
        temperature: 20 + (index % 5),
        humidity: 40 + (index % 10),
      };
    });
  }

  private buildDeviceServiceRows(request: ReportDataRequest): ReportRow[] {
    return [
      {
        id: `${request.spaceId}-device-1`,
        name: 'Temperature sensor',
        status: 'OK',
      },
      {
        id: `${request.spaceId}-device-2`,
        name: 'Humidity sensor',
        status: 'OK',
      },
      {
        id: `${request.spaceId}-service-1`,
        name: 'Gateway connectivity check',
        status: 'OK',
      },
    ];
  }
}
