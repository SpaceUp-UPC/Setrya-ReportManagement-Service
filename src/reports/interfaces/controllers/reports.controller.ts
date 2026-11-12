import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateReportUseCase } from '../../application/use-cases/create-report.use-case.js';
import { GetReportByIdUseCase } from '../../application/use-cases/get-report-by-id.use-case.js';
import { ReportNotFoundError } from '../../application/errors/report-not-found.error.js';
import { CreateReportRequestDto } from '../dto/create-report-request.dto.js';
import { ReportResponseDto } from '../dto/report-response.dto.js';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly createReportUseCase: CreateReportUseCase,
    private readonly getReportByIdUseCase: GetReportByIdUseCase,
  ) {}

  @Post()
  @ApiResponse({ status: 201, type: ReportResponseDto })
  async create(
    @Body() body: CreateReportRequestDto,
  ): Promise<ReportResponseDto> {
    const report = await this.createReportUseCase.execute({
      type: body.type,
      requesterId: body.requesterId,
      spaceId: body.spaceId,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      format: body.format,
    });
    return ReportResponseDto.fromDomain(report);
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: ReportResponseDto })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReportResponseDto> {
    try {
      const report = await this.getReportByIdUseCase.execute(id);
      return ReportResponseDto.fromDomain(report);
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
