import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';
import { ReportFormat } from '../../../domain/enums/report-format.enum.js';
import { ReportStatus } from '../../../domain/enums/report-status.enum.js';
import { ReportType } from '../../../domain/enums/report-type.enum.js';

@Entity({ name: 'reports' })
export class ReportOrmEntity {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id: string;

  @Column({ name: 'type', type: 'enum', enum: ReportType })
  type: ReportType;

  @Column({ name: 'requester_id', type: 'varchar' })
  requesterId: string;

  @Column({ name: 'space_id', type: 'uuid' })
  spaceId: string;

  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd: Date;

  @Column({ name: 'format', type: 'enum', enum: ReportFormat })
  format: ReportFormat;

  @Column({ name: 'status', type: 'enum', enum: ReportStatus })
  status: ReportStatus;

  @Column({ name: 'file_url', type: 'varchar', nullable: true })
  fileUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
