import PDFDocument from 'pdfkit';
import { ReportType } from '../../domain/enums/report-type.enum.js';
import type {
  DeviceServiceEntryRow,
  HomeHistoryRow,
  ReportRow,
} from '../../domain/ports/report-data-provider.port.js';

export interface ReportPdfInput {
  type: ReportType;
  spaceId: string;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  rows: ReportRow[];
}

interface TableColumn {
  header: string;
  width: number;
  align: 'left' | 'right';
}

const MARGIN = 50;
const FOOTER_HEIGHT = 30;
const ROW_HEIGHT = 20;
const CELL_PADDING = 6;
const FONT_REGULAR = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';

const TITLE_BY_TYPE: Record<ReportType, string> = {
  [ReportType.INSTALLATION]: 'Installation Report',
  [ReportType.MAINTENANCE]: 'Maintenance Report',
  [ReportType.HOME_HISTORY]: 'Home History Report',
};

export function buildReportPdf(input: ReportPdfInput): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: MARGIN,
        bufferPages: true,
        info: { Title: TITLE_BY_TYPE[input.type] ?? 'Report' },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      renderHeader(doc, input);
      const { columns, tableRows } = buildTable(input, contentWidth(doc));
      if (tableRows.length === 0) {
        renderEmptyMessage(doc);
      } else {
        renderTable(doc, columns, tableRows);
      }
      renderPageNumbers(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function contentWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width - MARGIN * 2;
}

function bottomLimit(doc: PDFKit.PDFDocument): number {
  return doc.page.height - MARGIN - FOOTER_HEIGHT;
}

function renderHeader(doc: PDFKit.PDFDocument, input: ReportPdfInput): void {
  doc.font(FONT_BOLD).fontSize(20).text(TITLE_BY_TYPE[input.type] ?? 'Report');
  doc.moveDown(0.5);

  const details: Array<[string, string]> = [
    ['Report type', input.type],
    ['Space ID', input.spaceId],
    ['Period start', input.periodStart.toISOString()],
    ['Period end', input.periodEnd.toISOString()],
    ['Generated at', input.generatedAt.toISOString()],
  ];
  for (const [label, value] of details) {
    doc
      .font(FONT_BOLD)
      .fontSize(10)
      .text(`${label}: `, { continued: true })
      .font(FONT_REGULAR)
      .text(value);
  }
  doc.moveDown(1);
}

function renderEmptyMessage(doc: PDFKit.PDFDocument): void {
  doc
    .font(FONT_REGULAR)
    .fontSize(12)
    .fillColor('#555555')
    .text('No data for the selected period', { align: 'center' })
    .fillColor('#000000');
}

function buildTable(
  input: ReportPdfInput,
  width: number,
): { columns: TableColumn[]; tableRows: string[][] } {
  if (input.type === ReportType.HOME_HISTORY) {
    const columns: TableColumn[] = [
      { header: 'Timestamp', width: width * 0.5, align: 'left' },
      { header: 'Temperature (°C)', width: width * 0.3, align: 'right' },
      { header: 'Humidity (%)', width: width * 0.2, align: 'right' },
    ];
    const tableRows = input.rows.map((row) => {
      const { timestamp, temperature, humidity } = row as HomeHistoryRow;
      return [
        timestamp.toISOString(),
        String(temperature),
        humidity === null || humidity === undefined ? '-' : String(humidity),
      ];
    });
    return { columns, tableRows };
  }

  const columns: TableColumn[] = [
    { header: 'ID', width: width * 0.4, align: 'left' },
    { header: 'Name', width: width * 0.4, align: 'left' },
    { header: 'Status', width: width * 0.2, align: 'left' },
  ];
  const tableRows = input.rows.map((row) => {
    const { id, name, status } = row as DeviceServiceEntryRow;
    return [id, name, status];
  });
  return { columns, tableRows };
}

function renderRow(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  cells: string[],
  y: number,
  bold: boolean,
): void {
  doc.font(bold ? FONT_BOLD : FONT_REGULAR).fontSize(10);
  let x = MARGIN;
  columns.forEach((column, index) => {
    doc.text(cells[index], x + CELL_PADDING, y + 5, {
      width: column.width - CELL_PADDING * 2,
      height: ROW_HEIGHT - 5,
      align: column.align,
      lineBreak: false,
      ellipsis: true,
    });
    x += column.width;
  });
}

function renderTableHeader(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  y: number,
): number {
  doc.rect(MARGIN, y, contentWidth(doc), ROW_HEIGHT).fill('#e8e8e8');
  doc.fillColor('#000000');
  renderRow(
    doc,
    columns,
    columns.map((column) => column.header),
    y,
    true,
  );
  return y + ROW_HEIGHT;
}

function renderTable(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  tableRows: string[][],
): void {
  let y = renderTableHeader(doc, columns, doc.y);

  for (const cells of tableRows) {
    if (y + ROW_HEIGHT > bottomLimit(doc)) {
      doc.addPage();
      y = renderTableHeader(doc, columns, MARGIN);
    }
    renderRow(doc, columns, cells, y, false);
    doc
      .moveTo(MARGIN, y + ROW_HEIGHT)
      .lineTo(MARGIN + contentWidth(doc), y + ROW_HEIGHT)
      .lineWidth(0.5)
      .strokeColor('#cccccc')
      .stroke();
    y += ROW_HEIGHT;
  }
}

function renderPageNumbers(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Writing inside the bottom margin would trigger an automatic page break.
    const originalBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font(FONT_REGULAR)
      .fontSize(9)
      .fillColor('#555555')
      .text(
        `Page ${i + 1} of ${range.count}`,
        MARGIN,
        doc.page.height - MARGIN,
        { width: contentWidth(doc), align: 'center', lineBreak: false },
      );
    doc.page.margins.bottom = originalBottom;
  }
}
