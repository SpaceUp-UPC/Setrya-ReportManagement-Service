import { Report } from '../../domain/entities/report.entity.js';
import { ReportFormat } from '../../domain/enums/report-format.enum.js';
import { ReportStatus } from '../../domain/enums/report-status.enum.js';
import { ReportType } from '../../domain/enums/report-type.enum.js';
import type { ReportRepository } from '../../domain/repositories/report.repository.js';
import { CreateReportUseCase } from './create-report.use-case.js';

describe('CreateReportUseCase', () => {
  let reportRepository: ReportRepository;
  let useCase: CreateReportUseCase;

  beforeEach(() => {
    reportRepository = {
      save: vi.fn(async (report: Report) => report),
      findById: vi.fn(),
    };
    useCase = new CreateReportUseCase(reportRepository);
  });

  it('creates a report with status PENDING and persists it', async () => {
    const input = {
      type: ReportType.INSTALLATION,
      requesterId: 'requester-1',
      spaceId: 'space-1',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      format: ReportFormat.PDF,
    };

    const result = await useCase.execute(input);

    expect(result.status).toBe(ReportStatus.PENDING);
    expect(result.fileUrl).toBeNull();
    expect(result.type).toBe(input.type);
    expect(result.requesterId).toBe(input.requesterId);
    expect(result.spaceId).toBe(input.spaceId);
    expect(result.format).toBe(input.format);
    expect(vi.mocked(reportRepository.save)).toHaveBeenCalledWith(result);
  });
});
