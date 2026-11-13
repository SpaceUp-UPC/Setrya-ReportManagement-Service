import { ApiProperty } from '@nestjs/swagger';
import type { ListReportsResult } from '../../application/use-cases/list-reports.use-case.js';
import { ReportResponseDto } from './report-response.dto.js';

export class PaginatedReportsResponseDto {
  @ApiProperty({ type: [ReportResponseDto] })
  items: ReportResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  static fromResult(result: ListReportsResult): PaginatedReportsResponseDto {
    const dto = new PaginatedReportsResponseDto();
    dto.items = result.items.map((item) => ReportResponseDto.fromDomain(item));
    dto.total = result.total;
    dto.page = result.page;
    dto.limit = result.limit;
    return dto;
  }
}
