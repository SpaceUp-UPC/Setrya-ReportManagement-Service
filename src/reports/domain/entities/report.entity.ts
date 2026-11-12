import { randomUUID } from 'node:crypto';
import { ReportFormat } from '../enums/report-format.enum.js';
import { ReportStatus } from '../enums/report-status.enum.js';
import { ReportType } from '../enums/report-type.enum.js';

export interface ReportProps {
  id: string;
  type: ReportType;
  requesterId: string;
  spaceId: string;
  periodStart: Date;
  periodEnd: Date;
  format: ReportFormat;
  status: ReportStatus;
  fileUrl: string | null;
  createdAt: Date;
}

export class Report {
  readonly id: string;
  readonly type: ReportType;
  readonly requesterId: string;
  readonly spaceId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly format: ReportFormat;
  readonly status: ReportStatus;
  readonly fileUrl: string | null;
  readonly createdAt: Date;

  constructor(props: ReportProps) {
    this.id = props.id;
    this.type = props.type;
    this.requesterId = props.requesterId;
    this.spaceId = props.spaceId;
    this.periodStart = props.periodStart;
    this.periodEnd = props.periodEnd;
    this.format = props.format;
    this.status = props.status;
    this.fileUrl = props.fileUrl;
    this.createdAt = props.createdAt;
  }

  static createPending(params: {
    type: ReportType;
    requesterId: string;
    spaceId: string;
    periodStart: Date;
    periodEnd: Date;
    format: ReportFormat;
  }): Report {
    return new Report({
      id: randomUUID(),
      type: params.type,
      requesterId: params.requesterId,
      spaceId: params.spaceId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      format: params.format,
      status: ReportStatus.PENDING,
      fileUrl: null,
      createdAt: new Date(),
    });
  }

  markReady(fileUrl: string): Report {
    return new Report({ ...this, status: ReportStatus.READY, fileUrl });
  }

  markFailed(): Report {
    return new Report({ ...this, status: ReportStatus.FAILED, fileUrl: null });
  }
}
