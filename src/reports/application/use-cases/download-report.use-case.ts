import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';
import { ReportStatus } from '../../domain/enums/report-status.enum.js';
import {
  REPORT_FILE_STORAGE,
  type ReportFileStorage,
} from '../../domain/ports/report-file-storage.port.js';
import {
  REPORT_REPOSITORY,
  type ReportRepository,
} from '../../domain/repositories/report.repository.js';
import { ReportNotFoundError } from '../errors/report-not-found.error.js';
import { ReportNotReadyError } from '../errors/report-not-ready.error.js';

const CONTENT_TYPE_BY_FORMAT: Record<string, string> = {
  CSV: 'text/csv',
  PDF: 'application/pdf',
};

export interface DownloadReportResult {
  stream: Readable;
  filename: string;
  contentType: string;
}

@Injectable()
export class DownloadReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: ReportRepository,
    @Inject(REPORT_FILE_STORAGE)
    private readonly reportFileStorage: ReportFileStorage,
  ) {}

  async execute(id: string): Promise<DownloadReportResult> {
    const report = await this.reportRepository.findById(id);
    if (!report) {
      throw new ReportNotFoundError(id);
    }

    if (report.status !== ReportStatus.READY || !report.fileUrl) {
      throw new ReportNotReadyError(id, report.status);
    }

    const buffer = await this.reportFileStorage.read(report.fileUrl);

    return {
      stream: Readable.from(buffer),
      filename: `${report.type.toLowerCase()}-report-${report.id}.${report.format.toLowerCase()}`,
      contentType: CONTENT_TYPE_BY_FORMAT[report.format] ?? 'application/octet-stream',
    };
  }
}
