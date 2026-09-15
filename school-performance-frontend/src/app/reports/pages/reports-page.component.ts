import { NgClass } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { REPORT_TYPE_LABELS } from '../../shared/constants/labels';
import { ReportType } from '../../core/models';
import { ReportMockService, ReportResult } from '../services/report-mock.service';
import { ReportPdfService } from '../services/report-pdf.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [NgClass, UiIconComponent, ReactiveFormsModule, MatButtonModule, MatTooltipModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatDatepickerModule, MatTableModule, MatProgressSpinnerModule, PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent, AppDatePipe],
  templateUrl: './reports-page.component.html'
})
export class ReportsPageComponent {
  @ViewChild('pdfExportRoot') pdfExportRoot?: ElementRef<HTMLElement>;

  private readonly fb = inject(FormBuilder);
  private readonly reportService = inject(ReportMockService);
  private readonly pdfService = inject(ReportPdfService);
  private readonly toast = inject(ToastService);

  readonly reportCards: { type: ReportType; icon: string; color: string; bg: string }[] = [
    { type: 'ATTENDANCE', icon: 'event_available', color: '#1976d2', bg: '#e3f2fd' },
    { type: 'STUDENTS', icon: 'school', color: '#388e3c', bg: '#e8f5e9' },
    { type: 'TEACHERS', icon: 'person', color: '#0288d1', bg: '#e1f5fe' },
    { type: 'BEHAVIOR', icon: 'gavel', color: '#f57c00', bg: '#fff3e0' },
    { type: 'REQUESTS', icon: 'inbox', color: '#7b1fa2', bg: '#f3e5f5' },
    { type: 'TASKS', icon: 'task', color: '#c62828', bg: '#ffebee' }
  ];

  readonly reportLabels = REPORT_TYPE_LABELS;
  selectedReport: ReportType | null = null;
  reportResult: ReportResult | null = null;
  displayedColumns: string[] = [];
  loading = false;
  exportingPdf = false;

  filters = this.fb.group({
    dateFrom: [null as Date | null],
    dateTo: [null as Date | null],
    stage: [''],
    className: [''],
    status: ['']
  });

  selectReport(type: ReportType): void {
    this.selectedReport = type;
    this.reportResult = null;
  }

  resetFilters(): void {
    this.filters.reset({
      dateFrom: null,
      dateTo: null,
      stage: '',
      className: '',
      status: ''
    });
    this.reportResult = null;
    this.displayedColumns = [];
  }

  generateReport(): void {
    if (!this.selectedReport) return;

    this.loading = true;
    this.reportResult = null;

    const v = this.filters.getRawValue();
    this.reportService.generate(this.selectedReport, {
      dateFrom: this.toDateString(v.dateFrom),
      dateTo: this.toDateString(v.dateTo),
      stage: v.stage || undefined,
      className: v.className || undefined,
      status: v.status || undefined
    }).subscribe({
      next: (result) => {
        this.reportResult = result;
        this.displayedColumns = result.columns;
        this.loading = false;
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  cellValue(row: Record<string, string | number>, col: string): string {
    const val = row[col];
    return val !== undefined && val !== null ? String(val) : '—';
  }

  /** Maps common status-like cell values to a chip class so they render consistently. */
  cellChip(row: Record<string, string | number>, col: string): string | null {
    if (col !== 'status') return null;
    const val = String(row[col] ?? '').trim();
    if (!val) return null;
    const success = ['نشط', 'مكتمل', 'مكتملة', 'معتمد', 'حاضر', 'إيجابية', 'ممتاز'];
    const warning = ['قيد التنفيذ', 'قيد المراجعة', 'متأخر', 'إنذار', 'جيد', 'منقول'];
    const danger = ['متأخرة', 'مرفوض', 'غائب', 'سلبية', 'حرج', 'غير نشط', 'موقوف'];
    if (success.includes(val)) return 'success';
    if (warning.includes(val)) return 'warning';
    if (danger.includes(val)) return 'danger';
    return 'neutral';
  }

  exportPdf(): void {
    if (!this.reportResult) {
      this.toast.info('اعرض التقرير أولاً قبل التصدير');
      return;
    }

    const root = this.pdfExportRoot?.nativeElement;
    if (!root) {
      this.toast.error('فشل تجهيز التقرير للتصدير');
      return;
    }

    this.exportingPdf = true;
    const widthPx = this.pdfService.getContentWidthPx(this.reportResult);
    root.style.width = `${widthPx}px`;
    root.style.maxWidth = `${widthPx}px`;
    root.innerHTML = this.pdfService.buildExportHtml(this.reportResult);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.pdfService.export(root, this.reportResult!)
          .then(() => this.toast.success('تم تصدير PDF'))
          .catch((err: Error) => {
            console.error('PDF export failed:', err);
            try {
              this.pdfService.exportViaPrint(this.reportResult!);
              this.toast.info('تم فتح نافذة الطباعة — اختر "حفظ كـ PDF"');
            } catch (printErr) {
              this.toast.error(printErr instanceof Error ? printErr.message : 'فشل تصدير PDF');
            }
          })
          .finally(() => {
            root.innerHTML = '';
            root.style.width = '';
            root.style.maxWidth = '';
            this.exportingPdf = false;
          });
      });
    });
  }

  private toDateString(value: Date | null): string | undefined {
    if (!value) return undefined;
    const d = value instanceof Date ? value : new Date(value);
    return d.toISOString().slice(0, 10);
  }
}
