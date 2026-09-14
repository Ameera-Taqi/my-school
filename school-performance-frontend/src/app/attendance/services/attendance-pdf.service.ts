import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const A4_PORTRAIT_WIDTH_PX = 794;

export interface AttendancePdfData {
  title: string;
  date: string;
  subtitle?: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
  summary: { label: string; value: string }[];
}

@Injectable({ providedIn: 'root' })
export class AttendancePdfService {
  buildExportHtml(data: AttendancePdfData): string {
    const summaryHtml = data.summary.length
      ? `<div class="summary-grid">
          ${data.summary.map(s => `
            <div class="summary-card">
              <span class="summary-value">${this.escape(s.value)}</span>
              <span class="summary-label">${this.escape(s.label)}</span>
            </div>`).join('')}
        </div>`
      : '';

    const headerCells = data.columns.map(c => `<th>${this.escape(c.label)}</th>`).join('');
    const bodyRows = data.rows.map(row => `
      <tr>${data.columns.map(c => `<td>${this.escape(row[c.key] ?? '—')}</td>`).join('')}</tr>
    `).join('');

    return `
      <div class="pdf-report">
        <div class="results-header">
          <h3>${this.escape(data.title)}</h3>
          <p class="meta">التاريخ: ${this.escape(data.date)}</p>
          ${data.subtitle ? `<p class="subtitle">${this.escape(data.subtitle)}</p>` : ''}
          <p class="subtitle">نظام مؤشر الأداء المدرسي الذكي</p>
        </div>
        ${summaryHtml}
        <div class="table-container">
          <table>
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${bodyRows || `<tr><td colspan="${data.columns.length}" class="empty">لا توجد بيانات.</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <style>${this.exportStyles()}</style>
    `;
  }

  async export(element: HTMLElement, data: AttendancePdfData): Promise<void> {
    element.style.width = `${A4_PORTRAIT_WIDTH_PX}px`;
    element.style.maxWidth = `${A4_PORTRAIT_WIDTH_PX}px`;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 10;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: A4_PORTRAIT_WIDTH_PX,
      windowWidth: A4_PORTRAIT_WIDTH_PX
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('فشل إنشاء صورة التقرير');
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;
    const imgProps = pdf.getImageProperties(imgData);
    const imgPdfHeight = (imgProps.height * printableWidth) / imgProps.width;

    let heightLeft = imgPdfHeight;
    let position = margin;

    pdf.addImage(imgData, 'JPEG', margin, position, printableWidth, imgPdfHeight);
    heightLeft -= printableHeight;

    while (heightLeft > 0) {
      position = margin - (imgPdfHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, printableWidth, imgPdfHeight);
      heightLeft -= printableHeight;
    }

    const filename = `${data.title.replace(/\s+/g, '_')}_${data.date}.pdf`;
    pdf.save(filename);
  }

  exportViaPrint(data: AttendancePdfData): void {
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <meta charset="utf-8"><title>${this.escape(data.title)}</title>
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        body { font-family: Tahoma, Arial, sans-serif; padding: 0; margin: 0; color: #222; width: ${A4_PORTRAIT_WIDTH_PX}px; }
        ${this.exportStyles()}
      </style>
    </head><body>
      ${this.buildExportHtml(data)}
      <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) {
      throw new Error('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة.');
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  private exportStyles(): string {
    return `
      .pdf-report { padding: 20px; box-sizing: border-box; background: #fff; }
      .results-header h3 { margin: 0 0 8px; color: #1a237e; font-size: 22px; font-weight: 700; }
      .meta { margin: 0 0 8px; color: #888; font-size: 12px; }
      .subtitle { margin: 0 0 8px; color: #555; font-size: 13px; }
      .summary-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
      .summary-card { background: #f5f7ff; border-radius: 8px; padding: 12px 16px; min-width: 100px; flex: 1; text-align: center; }
      .summary-value { display: block; font-size: 18px; font-weight: 700; color: #1a237e; }
      .summary-label { font-size: 12px; color: #666; }
      .table-container { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
      table { width: 100%; border-collapse: collapse; }
      th { padding: 8px; text-align: right; font-weight: 600; font-size: 11px; color: #fff; background: #1a237e; border: 1px solid #999; }
      td { padding: 8px; text-align: right; font-size: 11px; color: #222; border: 1px solid #ddd; }
      .empty { text-align: center; padding: 32px; color: #888; border: 1px solid #ddd; }
    `;
  }

  private escape(value: string | number): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
