import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateReportUseCase } from './application/use-cases/create-report.use-case.js';
import { DownloadReportUseCase } from './application/use-cases/download-report.use-case.js';
import { GenerateReportUseCase } from './application/use-cases/generate-report.use-case.js';
import { GetReportByIdUseCase } from './application/use-cases/get-report-by-id.use-case.js';
import { ListReportsUseCase } from './application/use-cases/list-reports.use-case.js';
import { REPORT_DATA_PROVIDER } from './domain/ports/report-data-provider.port.js';
import { REPORT_FILE_STORAGE } from './domain/ports/report-file-storage.port.js';
import { REPORT_REPOSITORY } from './domain/repositories/report.repository.js';
import { ReportOrmEntity } from './infrastructure/persistence/entities/report.orm-entity.js';
import { ReportRepositoryImpl } from './infrastructure/persistence/repositories/report.repository.impl.js';
import { MockReportDataProvider } from './infrastructure/providers/mock-report-data-provider.js';
import { LocalFileReportStorage } from './infrastructure/storage/local-file-report-storage.js';
import { ReportsController } from './interfaces/controllers/reports.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([ReportOrmEntity])],
  controllers: [ReportsController],
  providers: [
    CreateReportUseCase,
    GetReportByIdUseCase,
    ListReportsUseCase,
    GenerateReportUseCase,
    DownloadReportUseCase,
    { provide: REPORT_REPOSITORY, useClass: ReportRepositoryImpl },
    { provide: REPORT_DATA_PROVIDER, useClass: MockReportDataProvider },
    { provide: REPORT_FILE_STORAGE, useClass: LocalFileReportStorage },
  ],
})
export class ReportsModule {}
