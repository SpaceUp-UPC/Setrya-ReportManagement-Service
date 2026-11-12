import { Inject, Injectable } from '@nestjs/common';
import type { Report } from '../../domain/entities/report.entity.js';
import type { ReportStatus } from '../../domain/enums/report-status.enum.js';
import type { ReportType } from '../../domain/enums/report-type.enum.js';
import {
  REPORT_REPOSITORY,
  type ReportRepository,
} from '../../domain/repositories/report.repository.js';

export interface ListReportsParams {
  spaceId?: string;
  type?: ReportType;
  status?: ReportStatus;
  page?: number;
  limit?: number;
}

export interface ListReportsResult {
  items: Report[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ListReportsUseCase {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MAX_LIMIT = 100;

  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: ReportRepository,
  ) {}

  async execute(params: ListReportsParams): Promise<ListReportsResult> {
    const page =
      params.page && params.page > 0
        ? params.page
        : ListReportsUseCase.DEFAULT_PAGE;
    const requestedLimit =
      params.limit && params.limit > 0
        ? params.limit
        : ListReportsUseCase.DEFAULT_LIMIT;
    const limit = Math.min(requestedLimit, ListReportsUseCase.MAX_LIMIT);

    const { items, total } = await this.reportRepository.findAll(
      {
        spaceId: params.spaceId,
        type: params.type,
        status: params.status,
      },
      { page, limit },
    );

    return { items, total, page, limit };
  }
}
