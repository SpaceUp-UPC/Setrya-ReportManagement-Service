import type { ReportFormat } from '../../domain/enums/report-format.enum.js';

export class ReportFormatNotSupportedError extends Error {
  constructor(format: ReportFormat) {
    super(`Report format "${format}" is not supported`);
    this.name = 'ReportFormatNotSupportedError';
  }
}
