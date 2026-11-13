import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CreateReportUseCase } from '../../application/use-cases/create-report.use-case.js';
import { DownloadReportUseCase } from '../../application/use-cases/download-report.use-case.js';
import { GenerateReportUseCase } from '../../application/use-cases/generate-report.use-case.js';
import { GetReportByIdUseCase } from '../../application/use-cases/get-report-by-id.use-case.js';
import { ListReportsUseCase } from '../../application/use-cases/list-reports.use-case.js';
import { ReportFormatNotSupportedError } from '../../application/errors/report-format-not-supported.error.js';
import { ReportNotFoundError } from '../../application/errors/report-not-found.error.js';
import { ReportNotReadyError } from '../../application/errors/report-not-ready.error.js';
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
    private readonly generateReportUseCase: GenerateReportUseCase,
    private readonly downloadReportUseCase: DownloadReportUseCase,
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

  @Post(':id/generate')
  @ApiResponse({ status: 200, type: ReportResponseDto })
  @ApiResponse({ status: 400, description: 'Report format not supported' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async generate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReportResponseDto> {
    try {
      const report = await this.generateReportUseCase.execute(id);
      return ReportResponseDto.fromDomain(report);
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof ReportFormatNotSupportedError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get(':id/download')
  @ApiResponse({
    status: 200,
    description: 'Report file (text/csv or application/pdf)',
  })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @ApiResponse({ status: 409, description: 'Report is not ready for download' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    try {
      const { stream, filename, contentType } =
        await this.downloadReportUseCase.execute(id);
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      return new StreamableFile(stream);
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof ReportNotReadyError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
