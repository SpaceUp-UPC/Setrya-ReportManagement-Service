import type { ReportType } from '../enums/report-type.enum.js';

export interface HomeHistoryRow {
  timestamp: Date;
  temperature: number;
  humidity: number;
}

export interface DeviceServiceEntryRow {
  id: string;
  name: string;
  status: string;
}

export type ReportRow = HomeHistoryRow | DeviceServiceEntryRow;

export interface ReportDataRequest {
  type: ReportType;
  spaceId: string;
  periodStart: Date;
  periodEnd: Date;
}

export const REPORT_DATA_PROVIDER = Symbol('REPORT_DATA_PROVIDER');

export interface ReportDataProvider {
  getRows(request: ReportDataRequest): Promise<ReportRow[]>;
}
