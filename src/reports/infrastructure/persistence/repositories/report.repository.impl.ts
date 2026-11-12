import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Report } from '../../../domain/entities/report.entity.js';
import type {
  ReportListFilters,
  ReportListPagination,
  ReportListResult,
  ReportRepository,
} from '../../../domain/repositories/report.repository.js';
import { ReportOrmEntity } from '../entities/report.orm-entity.js';

@Injectable()
export class ReportRepositoryImpl implements ReportRepository {
  constructor(
    @InjectRepository(ReportOrmEntity)
    private readonly ormRepository: Repository<ReportOrmEntity>,
  ) {}

  async save(report: Report): Promise<Report> {
    const ormEntity = this.toOrmEntity(report);
    const saved = await this.ormRepository.save(ormEntity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Report | null> {
    const ormEntity = await this.ormRepository.findOne({ where: { id } });
    return ormEntity ? this.toDomain(ormEntity) : null;
  }

  async findAll(
    filters: ReportListFilters,
    pagination: ReportListPagination,
  ): Promise<ReportListResult> {
    const queryBuilder = this.ormRepository.createQueryBuilder('report');

    if (filters.spaceId) {
      queryBuilder.andWhere('report.spaceId = :spaceId', {
        spaceId: filters.spaceId,
      });
    }
    if (filters.type) {
      queryBuilder.andWhere('report.type = :type', { type: filters.type });
    }
    if (filters.status) {
      queryBuilder.andWhere('report.status = :status', {
        status: filters.status,
      });
    }

    queryBuilder
      .orderBy('report.createdAt', 'DESC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit);

    const [ormEntities, total] = await queryBuilder.getManyAndCount();
    return { items: ormEntities.map((entity) => this.toDomain(entity)), total };
  }

  private toOrmEntity(report: Report): ReportOrmEntity {
    const ormEntity = new ReportOrmEntity();
    ormEntity.id = report.id;
    ormEntity.type = report.type;
    ormEntity.requesterId = report.requesterId;
    ormEntity.spaceId = report.spaceId;
    ormEntity.periodStart = report.periodStart;
    ormEntity.periodEnd = report.periodEnd;
    ormEntity.format = report.format;
    ormEntity.status = report.status;
    ormEntity.fileUrl = report.fileUrl;
    ormEntity.createdAt = report.createdAt;
    return ormEntity;
  }

  private toDomain(ormEntity: ReportOrmEntity): Report {
    return new Report({
      id: ormEntity.id,
      type: ormEntity.type,
      requesterId: ormEntity.requesterId,
      spaceId: ormEntity.spaceId,
      periodStart: ormEntity.periodStart,
      periodEnd: ormEntity.periodEnd,
      format: ormEntity.format,
      status: ormEntity.status,
      fileUrl: ormEntity.fileUrl,
      createdAt: ormEntity.createdAt,
    });
  }
}
