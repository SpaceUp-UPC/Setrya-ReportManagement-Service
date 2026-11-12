import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateReportUseCase } from './application/use-cases/create-report.use-case.js';
import { GetReportByIdUseCase } from './application/use-cases/get-report-by-id.use-case.js';
import { ListReportsUseCase } from './application/use-cases/list-reports.use-case.js';
import { REPORT_REPOSITORY } from './domain/repositories/report.repository.js';
import { ReportOrmEntity } from './infrastructure/persistence/entities/report.orm-entity.js';
import { ReportRepositoryImpl } from './infrastructure/persistence/repositories/report.repository.impl.js';
import { ReportsController } from './interfaces/controllers/reports.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([ReportOrmEntity])],
  controllers: [ReportsController],
  providers: [
    CreateReportUseCase,
    GetReportByIdUseCase,
    ListReportsUseCase,
    { provide: REPORT_REPOSITORY, useClass: ReportRepositoryImpl },
  ],
})
export class ReportsModule {}
