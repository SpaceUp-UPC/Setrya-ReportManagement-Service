import type { Report } from '../entities/report.entity.js';

export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');

export interface ReportRepository {
  save(report: Report): Promise<Report>;
  findById(id: string): Promise<Report | null>;
}
