import { Inject, Injectable } from '@nestjs/common';
import { Report } from '../../domain/entities/report.entity.js';
import { ReportFormat } from '../../domain/enums/report-format.enum.js';
import {
  REPORT_DATA_PROVIDER,
  type ReportDataProvider,
} from '../../domain/ports/report-data-provider.port.js';
import {
  REPORT_FILE_STORAGE,
  type ReportFileStorage,
} from '../../domain/ports/report-file-storage.port.js';
import {
  REPORT_REPOSITORY,
  type ReportRepository,
} from '../../domain/repositories/report.repository.js';
import { buildReportCsv } from '../csv/report-csv-builder.js';
import { buildReportPdf } from '../pdf/report-pdf-builder.js';
import { ReportFormatNotSupportedError } from '../errors/report-format-not-supported.error.js';
import { ReportNotFoundError } from '../errors/report-not-found.error.js';

@Injectable()
export class GenerateReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: ReportRepository,
    @Inject(REPORT_DATA_PROVIDER)
    private readonly reportDataProvider: ReportDataProvider,
    @Inject(REPORT_FILE_STORAGE)
    private readonly reportFileStorage: ReportFileStorage,
  ) {}

  async execute(id: string): Promise<Report> {
    const report = await this.reportRepository.findById(id);
    if (!report) {
      throw new ReportNotFoundError(id);
    }

    if (report.format !== ReportFormat.CSV && report.format !== ReportFormat.PDF) {
      throw new ReportFormatNotSupportedError(report.format);
    }

    try {
      const rows = await this.reportDataProvider.getRows({
        type: report.type,
        spaceId: report.spaceId,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
      });
      const buffer =
        report.format === ReportFormat.PDF
          ? await buildReportPdf({
              type: report.type,
              spaceId: report.spaceId,
              periodStart: report.periodStart,
              periodEnd: report.periodEnd,
              generatedAt: new Date(),
              rows,
            })
          : buildReportCsv(report.type, rows);
      const fileUrl = await this.reportFileStorage.save(
        report.id,
        buffer,
        report.format,
      );

      return this.reportRepository.save(report.markReady(fileUrl));
    } catch (error) {
      await this.reportRepository.save(report.markFailed());
      throw error;
    }
  }
}
