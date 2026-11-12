import type { ReportStatus } from '../../domain/enums/report-status.enum.js';

export class ReportNotReadyError extends Error {
  constructor(id: string, status: ReportStatus) {
    super(`Report with id "${id}" is not ready for download (status: ${status})`);
    this.name = 'ReportNotReadyError';
  }
}
