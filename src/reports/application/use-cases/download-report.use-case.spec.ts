import { Report } from '../../domain/entities/report.entity.js';
import { ReportFormat } from '../../domain/enums/report-format.enum.js';
import { ReportType } from '../../domain/enums/report-type.enum.js';
import type { ReportFileStorage } from '../../domain/ports/report-file-storage.port.js';
import type { ReportRepository } from '../../domain/repositories/report.repository.js';
import { ReportNotFoundError } from '../errors/report-not-found.error.js';
import { ReportNotReadyError } from '../errors/report-not-ready.error.js';
import { DownloadReportUseCase } from './download-report.use-case.js';

describe('DownloadReportUseCase', () => {
  let reportRepository: ReportRepository;
  let reportFileStorage: ReportFileStorage;
  let useCase: DownloadReportUseCase;

  function buildPendingReport(): Report {
    return Report.createPending({
      type: ReportType.HOME_HISTORY,
      requesterId: 'requester-1',
      spaceId: 'space-1',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-03'),
      format: ReportFormat.CSV,
    });
  }

  beforeEach(() => {
    reportRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
    };
    reportFileStorage = {
      save: vi.fn(),
      read: vi.fn(async () => Buffer.from('timestamp,temperature,humidity')),
    };
    useCase = new DownloadReportUseCase(reportRepository, reportFileStorage);
  });

  it('returns the file stream, filename and content type for a READY report', async () => {
    const ready = buildPendingReport().markReady('/storage/reports/report.csv');
    vi.mocked(reportRepository.findById).mockResolvedValue(ready);

    const result = await useCase.execute(ready.id);

    expect(reportFileStorage.read).toHaveBeenCalledWith(ready.fileUrl);
    expect(result.filename).toBe(
      `home_history-report-${ready.id}.csv`,
    );
    expect(result.contentType).toBe('text/csv');
  });

  it('throws when the report does not exist', async () => {
    vi.mocked(reportRepository.findById).mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toThrow(
      ReportNotFoundError,
    );
  });

  it('throws when the report is not READY', async () => {
    const pending = buildPendingReport();
    vi.mocked(reportRepository.findById).mockResolvedValue(pending);

    await expect(useCase.execute(pending.id)).rejects.toThrow(
      ReportNotReadyError,
    );
  });
});
