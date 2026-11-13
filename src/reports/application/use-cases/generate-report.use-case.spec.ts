import { Report } from '../../domain/entities/report.entity.js';
import { ReportFormat } from '../../domain/enums/report-format.enum.js';
import { ReportStatus } from '../../domain/enums/report-status.enum.js';
import { ReportType } from '../../domain/enums/report-type.enum.js';
import type { ReportDataProvider } from '../../domain/ports/report-data-provider.port.js';
import type { ReportFileStorage } from '../../domain/ports/report-file-storage.port.js';
import type { ReportRepository } from '../../domain/repositories/report.repository.js';
import { ReportFormatNotSupportedError } from '../errors/report-format-not-supported.error.js';
import { ReportNotFoundError } from '../errors/report-not-found.error.js';
import { GenerateReportUseCase } from './generate-report.use-case.js';

describe('GenerateReportUseCase', () => {
  let reportRepository: ReportRepository;
  let reportDataProvider: ReportDataProvider;
  let reportFileStorage: ReportFileStorage;
  let useCase: GenerateReportUseCase;

  function buildPendingReport(format: ReportFormat = ReportFormat.CSV): Report {
    return Report.createPending({
      type: ReportType.HOME_HISTORY,
      requesterId: 'requester-1',
      spaceId: 'space-1',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-03'),
      format,
    });
  }

  beforeEach(() => {
    reportRepository = {
      save: vi.fn(async (report: Report) => report),
      findById: vi.fn(),
      findAll: vi.fn(),
    };
    reportDataProvider = {
      getRows: vi.fn(async () => [
        { timestamp: new Date('2026-01-01'), temperature: 21, humidity: 45 },
      ]),
    };
    reportFileStorage = {
      save: vi.fn(async () => '/storage/reports/report.csv'),
      read: vi.fn(),
    };
    useCase = new GenerateReportUseCase(
      reportRepository,
      reportDataProvider,
      reportFileStorage,
    );
  });

  it('generates the CSV file and marks the report READY', async () => {
    const pending = buildPendingReport();
    vi.mocked(reportRepository.findById).mockResolvedValue(pending);

    const result = await useCase.execute(pending.id);

    expect(reportDataProvider.getRows).toHaveBeenCalledWith({
      type: pending.type,
      spaceId: pending.spaceId,
      periodStart: pending.periodStart,
      periodEnd: pending.periodEnd,
    });
    expect(reportFileStorage.save).toHaveBeenCalledWith(
      pending.id,
      expect.any(Buffer),
      ReportFormat.CSV,
    );
    expect(result.status).toBe(ReportStatus.READY);
    expect(result.fileUrl).toBe('/storage/reports/report.csv');
  });

  it('passes the caller authorization to the data provider', async () => {
    const pending = buildPendingReport();
    vi.mocked(reportRepository.findById).mockResolvedValue(pending);

    await useCase.execute(pending.id, { authorization: 'Bearer caller-token' });

    expect(reportDataProvider.getRows).toHaveBeenCalledWith(
      expect.objectContaining({ authorization: 'Bearer caller-token' }),
    );
    const saved = vi.mocked(reportRepository.save).mock.calls[0][0];
    expect(JSON.stringify(saved)).not.toContain('caller-token');
  });

  it('throws when the report does not exist', async () => {
    vi.mocked(reportRepository.findById).mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toThrow(
      ReportNotFoundError,
    );
  });

  it('generates a PDF file and marks the report READY', async () => {
    const pending = buildPendingReport(ReportFormat.PDF);
    vi.mocked(reportRepository.findById).mockResolvedValue(pending);
    vi.mocked(reportFileStorage.save).mockResolvedValue(
      '/storage/reports/report.pdf',
    );

    const result = await useCase.execute(pending.id);

    const [, buffer, format] = vi.mocked(reportFileStorage.save).mock.calls[0];
    expect(format).toBe(ReportFormat.PDF);
    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
    expect(result.status).toBe(ReportStatus.READY);
    expect(result.fileUrl).toBe('/storage/reports/report.pdf');
  });

  it('throws when the report format does not exist', async () => {
    const pending = buildPendingReport();
    const unknown = Object.assign(Object.create(Object.getPrototypeOf(pending)), pending, {
      format: 'DOCX',
    }) as Report;
    vi.mocked(reportRepository.findById).mockResolvedValue(unknown);

    await expect(useCase.execute(pending.id)).rejects.toThrow(
      ReportFormatNotSupportedError,
    );
  });

  it('marks the report FAILED when PDF generation fails', async () => {
    const pending = buildPendingReport(ReportFormat.PDF);
    vi.mocked(reportRepository.findById).mockResolvedValue(pending);
    vi.mocked(reportFileStorage.save).mockRejectedValue(new Error('disk full'));

    await expect(useCase.execute(pending.id)).rejects.toThrow('disk full');

    expect(reportRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: ReportStatus.FAILED }),
    );
  });

  it('marks the report FAILED when the data provider throws', async () => {
    const pending = buildPendingReport();
    vi.mocked(reportRepository.findById).mockResolvedValue(pending);
    vi.mocked(reportDataProvider.getRows).mockRejectedValue(
      new Error('upstream unavailable'),
    );

    await expect(useCase.execute(pending.id)).rejects.toThrow(
      'upstream unavailable',
    );

    expect(reportRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: ReportStatus.FAILED }),
    );
  });
});
