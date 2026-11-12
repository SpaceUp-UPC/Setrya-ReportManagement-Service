import type { Report } from '../entities/report.entity.js';
import type { ReportStatus } from '../enums/report-status.enum.js';
import type { ReportType } from '../enums/report-type.enum.js';

export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');

export interface ReportListFilters {
  spaceId?: string;
  type?: ReportType;
  status?: ReportStatus;
}

export interface ReportListPagination {
  page: number;
  limit: number;
}

export interface ReportListResult {
  items: Report[];
  total: number;
}

export interface ReportRepository {
  save(report: Report): Promise<Report>;
  findById(id: string): Promise<Report | null>;
  findAll(
    filters: ReportListFilters,
    pagination: ReportListPagination,
  ): Promise<ReportListResult>;
}
