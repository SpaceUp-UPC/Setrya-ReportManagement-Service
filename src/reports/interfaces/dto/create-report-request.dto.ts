import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsUUID } from 'class-validator';
import { ReportFormat } from '../../domain/enums/report-format.enum.js';
import { ReportType } from '../../domain/enums/report-type.enum.js';

export class CreateReportRequestDto {
  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  spaceId: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({ enum: ReportFormat })
  @IsEnum(ReportFormat)
  format: ReportFormat;
}
