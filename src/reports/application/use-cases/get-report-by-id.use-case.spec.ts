import { Report } from '../../domain/entities/report.entity.js';
import { ReportFormat } from '../../domain/enums/report-format.enum.js';
import { ReportStatus } from '../../domain/enums/report-status.enum.js';
import { ReportType } from '../../domain/enums/report-type.enum.js';
import type { ReportRepository } from '../../domain/repositories/report.repository.js';
import { ReportNotFoundError } from '../errors/report-not-found.error.js';
import { GetReportByIdUseCase } from './get-report-by-id.use-case.js';

describe('GetReportByIdUseCase', () => {
  let reportRepository: ReportRepository;
  let useCase: GetReportByIdUseCase;

  beforeEach(() => {
    reportRepository = {
      save: vi.fn(),
      findById: vi.fn(),
    };
    useCase = new GetReportByIdUseCase(reportRepository);
  });

  it('returns the report when it exists', async () => {
    const report = new Report({
      id: 'report-1',
      type: ReportType.MAINTENANCE,
      requesterId: 'requester-1',
      spaceId: 'space-1',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      format: ReportFormat.CSV,
      status: ReportStatus.READY,
      fileUrl: 'https://example.com/report.csv',
      createdAt: new Date('2026-01-01'),
    });
    vi.mocked(reportRepository.findById).mockResolvedValue(report);

    const result = await useCase.execute('report-1');

    expect(result).toBe(report);
    expect(vi.mocked(reportRepository.findById)).toHaveBeenCalledWith(
      'report-1',
    );
  });

  it('throws ReportNotFoundError when the report does not exist', async () => {
    vi.mocked(reportRepository.findById).mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toThrow(
      ReportNotFoundError,
    );
  });
});
