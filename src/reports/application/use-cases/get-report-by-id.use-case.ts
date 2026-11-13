import { Inject, Injectable } from '@nestjs/common';
import { Report } from '../../domain/entities/report.entity.js';
import {
  REPORT_REPOSITORY,
  type ReportRepository,
} from '../../domain/repositories/report.repository.js';
import { ReportNotFoundError } from '../errors/report-not-found.error.js';

@Injectable()
export class GetReportByIdUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: ReportRepository,
  ) {}

  async execute(id: string): Promise<Report> {
    const report = await this.reportRepository.findById(id);
    if (!report) {
      throw new ReportNotFoundError(id);
    }
    return report;
  }
}
