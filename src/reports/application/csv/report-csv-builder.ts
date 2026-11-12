import { ReportType } from '../../domain/enums/report-type.enum.js';
import type {
  DeviceServiceEntryRow,
  ReportRow,
} from '../../domain/ports/report-data-provider.port.js';

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvLine(values: string[]): string {
  return values.map(escapeCsvValue).join(',');
}

export function buildReportCsv(type: ReportType, rows: ReportRow[]): Buffer {
  const lines =
    type === ReportType.HOME_HISTORY
      ? buildHomeHistoryLines(rows)
      : buildDeviceServiceLines(rows as DeviceServiceEntryRow[]);

  return Buffer.from(lines.join('\n'), 'utf-8');
}

function buildHomeHistoryLines(rows: ReportRow[]): string[] {
  const header = toCsvLine(['timestamp', 'temperature', 'humidity']);
  const body = rows.map((row) => {
    const { timestamp, temperature, humidity } = row as {
      timestamp: Date;
      temperature: number;
      humidity: number;
    };
    return toCsvLine([
      timestamp.toISOString(),
      String(temperature),
      String(humidity),
    ]);
  });
  return [header, ...body];
}

function buildDeviceServiceLines(rows: DeviceServiceEntryRow[]): string[] {
  const header = toCsvLine(['id', 'name', 'status']);
  const body = rows.map((row) => toCsvLine([row.id, row.name, row.status]));
  return [header, ...body];
}
