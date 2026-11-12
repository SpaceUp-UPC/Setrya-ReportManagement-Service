import { Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ReportFormat } from '../../domain/enums/report-format.enum.js';
import type { ReportFileStorage } from '../../domain/ports/report-file-storage.port.js';

const STORAGE_DIR = join(process.cwd(), 'storage', 'reports');

@Injectable()
export class LocalFileReportStorage implements ReportFileStorage {
  async save(
    reportId: string,
    buffer: Buffer,
    format: ReportFormat,
  ): Promise<string> {
    await mkdir(STORAGE_DIR, { recursive: true });
    const path = join(STORAGE_DIR, `${reportId}.${format.toLowerCase()}`);
    await writeFile(path, buffer);
    return path;
  }

  async read(path: string): Promise<Buffer> {
    return readFile(path);
  }
}
