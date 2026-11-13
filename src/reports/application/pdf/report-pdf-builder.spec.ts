import { ReportType } from '../../domain/enums/report-type.enum.js';
import type { ReportRow } from '../../domain/ports/report-data-provider.port.js';
import { buildReportPdf } from './report-pdf-builder.js';

function input(rows: ReportRow[], type = ReportType.HOME_HISTORY) {
  return {
    type,
    spaceId: 'space-ñandú-1',
    periodStart: new Date('2026-01-01T00:00:00Z'),
    periodEnd: new Date('2026-01-31T00:00:00Z'),
    generatedAt: new Date('2026-02-01T10:00:00Z'),
    rows,
  };
}

function pageCount(buffer: Buffer): number {
  return (buffer.toString('latin1').match(/\/Type \/Page\b(?!s)/g) ?? []).length;
}

describe('buildReportPdf', () => {
  it('returns a non-empty buffer that starts with %PDF', async () => {
    const buffer = await buildReportPdf(
      input([
        { timestamp: new Date('2026-01-01T00:00:00Z'), temperature: 21.5, humidity: 45 },
        { timestamp: new Date('2026-01-01T01:00:00Z'), temperature: 22, humidity: null },
      ]),
    );

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
    expect(pageCount(buffer)).toBe(1);
  });

  it('handles empty rows without failing', async () => {
    const buffer = await buildReportPdf(input([]));

    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
    expect(pageCount(buffer)).toBe(1);
  });

  it('spreads many rows across several pages', async () => {
    const rows: ReportRow[] = Array.from({ length: 300 }, (_, i) => ({
      timestamp: new Date(Date.UTC(2026, 0, 1, 0, i)),
      temperature: 20 + (i % 10),
      humidity: i % 3 === 0 ? null : 40 + (i % 20),
    }));

    const buffer = await buildReportPdf(input(rows));

    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
    expect(pageCount(buffer)).toBeGreaterThan(2);
  });

  it('supports device service reports', async () => {
    const buffer = await buildReportPdf(
      input([{ id: 'd-1', name: 'Sensor sala', status: 'ONLINE' }], ReportType.MAINTENANCE),
    );

    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });
});
