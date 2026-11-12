import type { ReportFormat } from '../../domain/enums/report-format.enum.js';

export class ReportFormatNotSupportedError extends Error {
  constructor(format: ReportFormat) {
    super(`Report generation for format "${format}" is not implemented yet`);
    this.name = 'ReportFormatNotSupportedError';
  }
}
