import { Inject, Injectable } from '@nestjs/common';
import { Report } from '../../domain/entities/report.entity.js';
import { ReportFormat } from '../../domain/enums/report-format.enum.js';
import { ReportType } from '../../domain/enums/report-type.enum.js';
import {
  REPORT_REPOSITORY,
  type ReportRepository,
} from '../../domain/repositories/report.repository.js';

export interface CreateReportInput {
  type: ReportType;
  requesterId: string;
  spaceId: string;
  periodStart: Date;
  periodEnd: Date;
  format: ReportFormat;
}

@Injectable()
export class CreateReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: ReportRepository,
  ) {}

  async execute(input: CreateReportInput): Promise<Report> {
    const report = Report.createPending(input);
    return this.reportRepository.save(report);
  }
}
