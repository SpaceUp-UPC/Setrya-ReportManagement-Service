import { ReportType } from '../../domain/enums/report-type.enum.js';
import type {
  DeviceServiceEntryRow,
  HomeHistoryRow,
} from '../../domain/ports/report-data-provider.port.js';
import { buildReportCsv } from './report-csv-builder.js';

const UTF8_BOM = '﻿';

describe('buildReportCsv', () => {
  const originalCsvDelimiter = process.env.CSV_DELIMITER;

  afterEach(() => {
    if (originalCsvDelimiter === undefined) {
      delete process.env.CSV_DELIMITER;
    } else {
      process.env.CSV_DELIMITER = originalCsvDelimiter;
    }
  });

  it('builds HOME_HISTORY rows, leaving humidity empty when null', () => {
    delete process.env.CSV_DELIMITER;
    const rows: HomeHistoryRow[] = [
      { timestamp: new Date('2026-01-01T10:00:00.000Z'), temperature: 22, humidity: 55 },
      { timestamp: new Date('2026-01-02T10:00:00.000Z'), temperature: 19, humidity: null },
    ];

    const csv = buildReportCsv(ReportType.HOME_HISTORY, rows).toString('utf-8');

    expect(csv).toBe(
      UTF8_BOM +
        [
          'timestamp;temperature;humidity',
          '2026-01-01T10:00:00.000Z;22;55',
          '2026-01-02T10:00:00.000Z;19;',
        ].join('\n'),
    );
  });

  it('prefixes the output with a UTF-8 BOM', () => {
    delete process.env.CSV_DELIMITER;
    const rows: HomeHistoryRow[] = [
      { timestamp: new Date('2026-01-01T10:00:00.000Z'), temperature: 22, humidity: 55 },
    ];

    const csv = buildReportCsv(ReportType.HOME_HISTORY, rows).toString('utf-8');

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
  });

  it('uses the default ";" delimiter when CSV_DELIMITER is not set', () => {
    delete process.env.CSV_DELIMITER;
    const rows: DeviceServiceEntryRow[] = [{ id: '1', name: 'Device A', status: 'ACTIVE' }];

    const csv = buildReportCsv(ReportType.INSTALLATION, rows).toString('utf-8');

    expect(csv).toBe(UTF8_BOM + ['id;name;status', '1;Device A;ACTIVE'].join('\n'));
  });

  it('respects a custom CSV_DELIMITER from the environment', () => {
    process.env.CSV_DELIMITER = ',';
    const rows: DeviceServiceEntryRow[] = [{ id: '1', name: 'Device A', status: 'ACTIVE' }];

    const csv = buildReportCsv(ReportType.INSTALLATION, rows).toString('utf-8');

    expect(csv).toBe(UTF8_BOM + ['id,name,status', '1,Device A,ACTIVE'].join('\n'));
  });

  it('quotes values containing the delimiter', () => {
    process.env.CSV_DELIMITER = ';';
    const rows: DeviceServiceEntryRow[] = [{ id: '1', name: 'Device; A', status: 'ACTIVE' }];

    const csv = buildReportCsv(ReportType.INSTALLATION, rows).toString('utf-8');

    expect(csv).toBe(UTF8_BOM + ['id;name;status', '1;"Device; A";ACTIVE'].join('\n'));
  });

  it('quotes and escapes values containing double quotes', () => {
    delete process.env.CSV_DELIMITER;
    const rows: DeviceServiceEntryRow[] = [{ id: '1', name: 'Device "A"', status: 'ACTIVE' }];

    const csv = buildReportCsv(ReportType.INSTALLATION, rows).toString('utf-8');

    expect(csv).toBe(UTF8_BOM + ['id;name;status', '1;"Device ""A""";ACTIVE'].join('\n'));
  });

  it('quotes values containing line breaks', () => {
    delete process.env.CSV_DELIMITER;
    const rows: DeviceServiceEntryRow[] = [{ id: '1', name: 'Device\nA', status: 'ACTIVE' }];

    const csv = buildReportCsv(ReportType.INSTALLATION, rows).toString('utf-8');

    expect(csv).toBe(UTF8_BOM + ['id;name;status', '1;"Device\nA";ACTIVE'].join('\n'));
  });
});
