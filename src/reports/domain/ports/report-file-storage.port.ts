import type { ReportFormat } from '../enums/report-format.enum.js';

export const REPORT_FILE_STORAGE = Symbol('REPORT_FILE_STORAGE');

export interface ReportFileStorage {
  save(reportId: string, buffer: Buffer, format: ReportFormat): Promise<string>;
  read(path: string): Promise<Buffer>;
}
