import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateReportUseCase } from '../../application/use-cases/create-report.use-case.js';
import { GetReportByIdUseCase } from '../../application/use-cases/get-report-by-id.use-case.js';
import { ListReportsUseCase } from '../../application/use-cases/list-reports.use-case.js';
import { ReportNotFoundError } from '../../application/errors/report-not-found.error.js';
import { CreateReportRequestDto } from '../dto/create-report-request.dto.js';
import { ListReportsQueryDto } from '../dto/list-reports-query.dto.js';
import { PaginatedReportsResponseDto } from '../dto/paginated-reports-response.dto.js';
import { ReportResponseDto } from '../dto/report-response.dto.js';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly createReportUseCase: CreateReportUseCase,
    private readonly getReportByIdUseCase: GetReportByIdUseCase,
    private readonly listReportsUseCase: ListReportsUseCase,
  ) {}

  @Get()
  @ApiResponse({ status: 200, type: PaginatedReportsResponseDto })
  async list(
    @Query() query: ListReportsQueryDto,
  ): Promise<PaginatedReportsResponseDto> {
    const result = await this.listReportsUseCase.execute({
      spaceId: query.spaceId,
      type: query.type,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
    return PaginatedReportsResponseDto.fromResult(result);
  }

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
