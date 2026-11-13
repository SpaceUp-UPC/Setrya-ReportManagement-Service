import type { ReportType } from '../enums/report-type.enum.js';

export interface HomeHistoryRow {
  timestamp: Date;
  temperature: number;
  humidity: number | null;
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
  /**
   * The caller's Authorization header, forwarded to upstream services that
   * require a token. It is only passed through, never stored.
   */
  authorization?: string;
}

export const REPORT_DATA_PROVIDER = Symbol('REPORT_DATA_PROVIDER');

export interface ReportDataProvider {
  getRows(request: ReportDataRequest): Promise<ReportRow[]>;
}
