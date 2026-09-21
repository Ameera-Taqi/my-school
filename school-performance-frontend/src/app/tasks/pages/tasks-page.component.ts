import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DetailDialogService } from '../../shared/services/detail-dialog.service';
import { TaskApiService } from '../services/task-api.service';
import { TaskFormDialogComponent } from '../task-form-dialog/task-form-dialog.component';
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../shared/constants/labels';
import { SchoolTask } from '../../core/models';
import { ReportPdfService } from '../../reports/services/report-pdf.service';
import { ReportResult } from '../../reports/services/report-mock.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, MatProgressSpinnerModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe, AppDatePipe],
  templateUrl: './tasks-page.component.html'
})
export class TasksPageComponent implements OnInit, AfterViewInit {
  @ViewChild('pdfExportRoot') pdfExportRoot?: ElementRef<HTMLElement>;

  private readonly service = inject(TaskApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly details = inject(DetailDialogService);
  private readonly pdfService = inject(ReportPdfService);
  private readonly datePipe = new AppDatePipe();

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly priorityLabels = PRIORITY_LABELS;
  readonly statusLabels = TASK_STATUS_LABELS;
  readonly dataSource = new MatTableDataSource<SchoolTask>([]);
  loading = true;
  exportingPdf = false;
  query = '';
  cols = ['title', 'assignee', 'dueDate', 'priority', 'status', 'meetingTitle', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (t, filter) =>
      [t.title, t.description, t.assignee, t.meetingTitle, this.priorityLabels[t.priority], this.statusLabels[t.status]]
        .join(' ').toLowerCase().includes(filter);
    this.load();
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => { this.dataSource.data = data; this.loading = false; setTimeout(() => this.attachTableControls()); },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  onSearch(query: string): void {
    this.query = query;
    this.dataSource.filter = query.toLowerCase();
    this.paginator?.firstPage();
  }

  openDialog(t?: SchoolTask): void {
    const ref = this.dialog.open(TaskFormDialogComponent, { width: '560px', maxWidth: '95vw', data: t ?? null });
    ref.afterClosed().subscribe((result: SchoolTask | undefined) => {
      if (!result) return;
      const req$ = t?.id ? this.service.update(t.id, result) : this.service.create(result);
      req$.subscribe({
        next: () => { this.toast.success(t?.id ? 'تم تحديث المهمة' : 'تمت إضافة المهمة'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  view(t: SchoolTask): void {
    this.details.open({
      title: t.title,
      subtitle: t.meetingTitle ? `مرتبطة باجتماع: ${t.meetingTitle}` : undefined,
      icon: 'task',
      fields: [
        { label: 'الوصف', value: t.description },
        { label: 'المسؤول', value: t.assignee },
        { label: 'تاريخ الاستحقاق', value: this.datePipe.transform(t.dueDate) },
        { label: 'الأولوية', value: this.priorityLabels[t.priority] ?? t.priority, chip: this.priorityChip(t.priority) },
        { label: 'الحالة', value: this.statusLabels[t.status] ?? t.status, chip: this.statusChip(t.status) }
      ]
    });
  }

  exportPdf(): void {
    const rows = this.dataSource.filteredData;
    if (!rows.length) {
      this.toast.info('لا توجد مهام لتصديرها');
      return;
    }
    const root = this.pdfExportRoot?.nativeElement;
    if (!root) {
      this.toast.error('فشل تجهيز التقرير للتصدير');
      return;
    }
    const report = this.buildPdfReport(rows);
    this.exportingPdf = true;
    const widthPx = this.pdfService.getContentWidthPx(report);
    root.style.width = `${widthPx}px`;
    root.style.maxWidth = `${widthPx}px`;
    root.innerHTML = this.pdfService.buildExportHtml(report);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.pdfService.export(root, report)
          .then(() => this.toast.success('تم تنزيل تقرير المهام PDF'))
          .catch((err: Error) => {
            console.error('PDF export failed:', err);
            try {
              this.pdfService.exportViaPrint(report);
              this.toast.info('تم فتح نافذة الطباعة — اختر «حفظ كـ PDF»');
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

  delete(t: SchoolTask): void {
    if (!t.id) return;
    this.confirm.deleteConfirmed(t.title, 'المهمة').subscribe(() => {
      this.service.delete(t.id!).subscribe({
        next: () => { this.toast.success('تم حذف المهمة'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  priorityChip(priority: string): 'danger' | 'warning' | 'neutral' {
    switch (priority) {
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warning';
      default: return 'neutral';
    }
  }

  statusChip(status: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'warning';
      case 'OVERDUE': return 'danger';
      default: return 'info';
    }
  }

  private buildPdfReport(tasks: SchoolTask[]): ReportResult {
    const count = (status: SchoolTask['status']) => tasks.filter(t => t.status === status).length;
    return {
      title: 'تقرير متابعة المهام',
      generatedAt: this.datePipe.transform(new Date(), 'withTime'),
      summary: [
        { label: 'إجمالي المهام', value: tasks.length },
        { label: this.statusLabels['NEW'] ?? 'جديدة', value: count('NEW') },
        { label: this.statusLabels['IN_PROGRESS'] ?? 'قيد التنفيذ', value: count('IN_PROGRESS') },
        { label: this.statusLabels['COMPLETED'] ?? 'مكتملة', value: count('COMPLETED') },
        { label: this.statusLabels['OVERDUE'] ?? 'متأخرة', value: count('OVERDUE') }
      ],
      columns: ['title', 'assignee', 'dueDate', 'priority', 'status', 'meetingTitle'],
      columnLabels: {
        title: 'العنوان',
        assignee: 'المسؤول',
        dueDate: 'الاستحقاق',
        priority: 'الأولوية',
        status: 'الحالة',
        meetingTitle: 'الاجتماع'
      },
      rows: tasks.map(t => ({
        title: t.description ? `${t.title} — ${t.description}` : t.title,
        assignee: t.assignee || '—',
        dueDate: this.datePipe.transform(t.dueDate),
        priority: this.priorityLabels[t.priority] ?? t.priority,
        status: this.statusLabels[t.status] ?? t.status,
        meetingTitle: t.meetingTitle || '—'
      }))
    };
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
