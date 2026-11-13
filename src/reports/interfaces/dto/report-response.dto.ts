import { ApiProperty } from '@nestjs/swagger';
import type { Report } from '../../domain/entities/report.entity.js';
import { ReportFormat } from '../../domain/enums/report-format.enum.js';
import { ReportStatus } from '../../domain/enums/report-status.enum.js';
import { ReportType } from '../../domain/enums/report-type.enum.js';

export class ReportResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: ReportType })
  type: ReportType;

  @ApiProperty({
    description:
      "The authenticated user's id (the token's `sub`, e.g. an email); not necessarily a UUID",
    example: 'user@example.com',
  })
  requesterId: string;

  @ApiProperty({ format: 'uuid' })
  spaceId: string;

  @ApiProperty({ format: 'date-time' })
  periodStart: Date;

  @ApiProperty({ format: 'date-time' })
  periodEnd: Date;

  @ApiProperty({ enum: ReportFormat })
  format: ReportFormat;

  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus;

  @ApiProperty({ nullable: true, type: String })
  fileUrl: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  static fromDomain(report: Report): ReportResponseDto {
    const dto = new ReportResponseDto();
    dto.id = report.id;
    dto.type = report.type;
    dto.requesterId = report.requesterId;
    dto.spaceId = report.spaceId;
    dto.periodStart = report.periodStart;
    dto.periodEnd = report.periodEnd;
    dto.format = report.format;
    dto.status = report.status;
    dto.fileUrl = report.fileUrl;
    dto.createdAt = report.createdAt;
    return dto;
  }
}
