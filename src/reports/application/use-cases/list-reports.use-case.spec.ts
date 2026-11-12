import { Report } from '../../domain/entities/report.entity.js';
import { ReportFormat } from '../../domain/enums/report-format.enum.js';
import { ReportStatus } from '../../domain/enums/report-status.enum.js';
import { ReportType } from '../../domain/enums/report-type.enum.js';
import type { ReportRepository } from '../../domain/repositories/report.repository.js';
import { ListReportsUseCase } from './list-reports.use-case.js';

describe('ListReportsUseCase', () => {
  let reportRepository: ReportRepository;
  let useCase: ListReportsUseCase;

  const buildReport = (id: string): Report =>
    new Report({
      id,
      type: ReportType.MAINTENANCE,
      requesterId: 'requester-1',
      spaceId: 'space-1',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      format: ReportFormat.CSV,
      status: ReportStatus.READY,
      fileUrl: null,
      createdAt: new Date('2026-01-01'),
    });

  beforeEach(() => {
    reportRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
    };
    useCase = new ListReportsUseCase(reportRepository);
  });

  it('applies default pagination when none is provided', async () => {
    const items = [buildReport('report-1')];
    vi.mocked(reportRepository.findAll).mockResolvedValue({
      items,
      total: 1,
    });

    const result = await useCase.execute({});

    expect(reportRepository.findAll).toHaveBeenCalledWith(
      { spaceId: undefined, type: undefined, status: undefined },
      { page: 1, limit: 20 },
    );
    expect(result).toEqual({ items, total: 1, page: 1, limit: 20 });
  });

  it('forwards filters and the requested pagination', async () => {
    vi.mocked(reportRepository.findAll).mockResolvedValue({
      items: [],
      total: 0,
    });

    await useCase.execute({
      spaceId: 'space-1',
      type: ReportType.INSTALLATION,
      status: ReportStatus.PENDING,
      page: 2,
      limit: 10,
    });

    expect(reportRepository.findAll).toHaveBeenCalledWith(
      {
        spaceId: 'space-1',
        type: ReportType.INSTALLATION,
        status: ReportStatus.PENDING,
      },
      { page: 2, limit: 10 },
    );
  });

  it('clamps the limit to the maximum of 100', async () => {
    vi.mocked(reportRepository.findAll).mockResolvedValue({
      items: [],
      total: 0,
    });

    const result = await useCase.execute({ limit: 500 });

    expect(reportRepository.findAll).toHaveBeenCalledWith(
      { spaceId: undefined, type: undefined, status: undefined },
      { page: 1, limit: 100 },
    );
    expect(result.limit).toBe(100);
  });

  it('falls back to defaults for invalid page and limit values', async () => {
    vi.mocked(reportRepository.findAll).mockResolvedValue({
      items: [],
      total: 0,
    });

    await useCase.execute({ page: 0, limit: -5 });

    expect(reportRepository.findAll).toHaveBeenCalledWith(
      { spaceId: undefined, type: undefined, status: undefined },
      { page: 1, limit: 20 },
    );
  });
});
