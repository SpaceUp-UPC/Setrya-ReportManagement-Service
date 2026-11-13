import { ReportType } from '../../domain/enums/report-type.enum.js';
import type {
  DeviceServiceEntryRow,
  HomeHistoryRow,
  ReportRow,
} from '../../domain/ports/report-data-provider.port.js';

const UTF8_BOM = '﻿';
const DEFAULT_CSV_DELIMITER = ';';

function getCsvDelimiter(): string {
  return process.env.CSV_DELIMITER || DEFAULT_CSV_DELIMITER;
}

function escapeCsvValue(value: string, delimiter: string): string {
  if (value.includes(delimiter) || /["\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvLine(values: string[], delimiter: string): string {
  return values.map((value) => escapeCsvValue(value, delimiter)).join(delimiter);
}

export function buildReportCsv(type: ReportType, rows: ReportRow[]): Buffer {
  const delimiter = getCsvDelimiter();
  const lines =
    type === ReportType.HOME_HISTORY
      ? buildHomeHistoryLines(rows, delimiter)
      : buildDeviceServiceLines(rows as DeviceServiceEntryRow[], delimiter);

  return Buffer.from(UTF8_BOM + lines.join('\n'), 'utf-8');
}

function buildHomeHistoryLines(rows: ReportRow[], delimiter: string): string[] {
  const header = toCsvLine(['timestamp', 'temperature', 'humidity'], delimiter);
  const body = rows.map((row) => {
    const { timestamp, temperature, humidity } = row as HomeHistoryRow;
    return toCsvLine(
      [timestamp.toISOString(), String(temperature), humidity === null ? '' : String(humidity)],
      delimiter,
    );
  });
  return [header, ...body];
}

function buildDeviceServiceLines(
  rows: DeviceServiceEntryRow[],
  delimiter: string,
): string[] {
  const header = toCsvLine(['id', 'name', 'status'], delimiter);
  const body = rows.map((row) => toCsvLine([row.id, row.name, row.status], delimiter));
  return [header, ...body];
}
