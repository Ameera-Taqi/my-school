import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
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
import { AuthService } from '../../core/services/auth.service';
import { TaskApiService } from '../services/task-api.service';
import { TaskFormDialogComponent } from '../task-form-dialog/task-form-dialog.component';
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../shared/constants/labels';
import { SchoolTask, TaskListResponse } from '../../core/models';
import { ReportPdfService } from '../../reports/services/report-pdf.service';
import { ReportResult } from '../../reports/services/report-mock.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

type ViewId = 'mine' | 'assigned' | 'completed' | 'all';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [
    FormsModule, UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule,
    MatDialogModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule, PageHeaderComponent, SearchFieldComponent,
    EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe, AppDatePipe
  ],
  templateUrl: './tasks-page.component.html',
  styles: `
    .task-summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.75rem; margin-bottom: 0.85rem; }
    @media (max-width: 900px) { .task-summary { grid-template-columns: 1fr 1fr; } }
    .task-summary article { background: #fff; border: 1px solid #f1f5f9; border-radius: 0.9rem; padding: 0.75rem 0.9rem; }
    .task-summary span { display: block; color: #64748b; font-size: 0.78rem; }
    .task-summary strong { font-size: 1.25rem; }
    .task-filters { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.85rem; }
    .task-filters button { border: 1px solid var(--color-border); background: #fff; border-radius: 999px; padding: 0.35rem 0.8rem; cursor: pointer; font-weight: 700; }
    .task-filters button.is-on { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
  `
})
export class TasksPageComponent implements OnInit, AfterViewInit {
  @ViewChild('pdfExportRoot') pdfExportRoot?: ElementRef<HTMLElement>;
  private readonly service = inject(TaskApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly details = inject(DetailDialogService);
  private readonly pdfService = inject(ReportPdfService);
  private readonly auth = inject(AuthService);
  private readonly datePipe = new AppDatePipe();

  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly priorityLabels = PRIORITY_LABELS;
  readonly statusLabels = TASK_STATUS_LABELS;
  readonly dataSource = new MatTableDataSource<SchoolTask>([]);
  readonly canAssign = this.auth.hasPermission('tasks.create');
  readonly filters: { id: ViewId; label: string }[] = this.canAssign
    ? [
        { id: 'mine', label: 'مهامي' },
        { id: 'assigned', label: 'المهام التي أسندتها' },
        { id: 'completed', label: 'المكتملة' },
        { id: 'all', label: 'الكل' }
      ]
    : [
        { id: 'mine', label: 'مهامي' },
        { id: 'completed', label: 'المكتملة' }
      ];

  viewId: ViewId = 'mine';
  loading = true;
  exportingPdf = false;
  query = '';
  status = '';
  readonly statusOptions: { value: string; label: string }[] = [
    { value: '', label: 'الكل' },
    { value: 'NEW', label: 'جديدة' },
    { value: 'IN_PROGRESS', label: 'قيد التنفيذ' },
    { value: 'COMPLETED', label: 'مكتملة' },
    { value: 'OVERDUE', label: 'متأخرة' },
    { value: 'CANCELLED', label: 'ملغاة' }
  ];
  summary: TaskListResponse['summary'] | null = null;
  cols = ['title', 'people', 'dueDate', 'priority', 'status', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void { this.load(); }
  ngAfterViewInit(): void { this.attachTableControls(); }

  select(view: ViewId): void { this.viewId = view; this.load(); }

  load(): void {
    this.loading = true;
    this.service.list(this.viewId, this.query, this.status).subscribe({
      next: data => {
        this.summary = data.summary;
        this.dataSource.data = data.items;
        this.loading = false;
        setTimeout(() => this.attachTableControls());
      },
      error: e => { this.loading = false; this.toast.fromError(e); }
    });
  }

  onSearch(query: string): void { this.query = query; this.load(); }

  openDialog(t?: SchoolTask): void {
    this.dialog.open(TaskFormDialogComponent, { width: '560px', maxWidth: '95vw', data: { task: t ?? null } })
      .afterClosed().subscribe((result: SchoolTask | undefined) => {
        if (!result) return;
        const req$ = t?.id ? this.service.update(t.id, result) : this.service.create(result);
        req$.subscribe({
          next: () => { this.toast.success(t?.id ? 'تم تحديث المهمة' : 'تم إسناد المهمة'); this.load(); },
          error: e => this.toast.fromError(e)
        });
      });
  }

  openDetail(t: SchoolTask): void {
    if (!t.id) return;
    this.service.detail(t.id).subscribe({
      next: detail => {
        const activities = (detail.activities ?? []).slice(-6);
        this.details.open({
          title: detail.title,
          subtitle: detail.assignedByName ? `مسندة من: ${detail.assignedByName}` : undefined,
          icon: 'task',
          badges: [
            { label: this.priorityLabels[detail.priority] ?? detail.priority, chip: this.priorityChip(detail.priority) },
            { label: this.statusLabels[detail.status] ?? detail.status, chip: this.statusChip(detail.status) }
          ],
          fields: [
            { label: 'الوصف', value: detail.description, wide: true, icon: 'description' },
            { label: 'المكلف', value: detail.assignee, icon: 'person' },
            { label: 'تاريخ الاستحقاق', value: this.datePipe.transform(detail.dueDate), icon: 'event' },
            { label: 'ملاحظات', value: detail.notes, wide: true, icon: 'comment' },
            ...activities.map(a => ({
              label: a.actionLabel,
              value: `${a.userName} · ${a.roleLabel}${a.comment ? ' — ' + a.comment : ''}`,
              wide: true,
              icon: 'schedule'
            }))
          ]
        });
      },
      error: e => this.toast.fromError(e)
    });
  }

  start(t: SchoolTask): void {
    if (!t.id) return;
    this.service.start(t.id).subscribe({
      next: () => { this.toast.success('بدأت تنفيذ المهمة'); this.load(); },
      error: e => this.toast.fromError(e)
    });
  }

  complete(t: SchoolTask): void {
    if (!t.id) return;
    this.confirm.open({ title: 'إكمال المهمة', message: 'هل أكملت هذه المهمة؟', confirmText: 'إكمال' }).subscribe(ok => {
      if (!ok || !t.id) return;
      this.service.complete(t.id).subscribe({
        next: () => { this.toast.success('تم إكمال المهمة'); this.load(); },
        error: e => this.toast.fromError(e)
      });
    });
  }

  cancel(t: SchoolTask): void {
    if (!t.id) return;
    this.confirm.open({ title: 'إلغاء المهمة', message: 'سيتم إلغاء المهمة وإشعار المكلفين.', confirmText: 'إلغاء المهمة', danger: true }).subscribe(ok => {
      if (!ok || !t.id) return;
      this.service.cancel(t.id).subscribe({
        next: () => { this.toast.success('أُلغيت المهمة'); this.load(); },
        error: e => this.toast.fromError(e)
      });
    });
  }

  delete(t: SchoolTask): void {
    if (!t.id) return;
    this.confirm.deleteConfirmed(t.title, 'المهمة').subscribe(() => {
      this.service.delete(t.id!).subscribe({
        next: () => { this.toast.success('تم حذف المهمة'); this.load(); },
        error: e => this.toast.fromError(e)
      });
    });
  }

  exportPdf(): void {
    const rows = this.dataSource.filteredData;
    if (!rows.length) { this.toast.info('لا توجد مهام لتصديرها'); return; }
    const root = this.pdfExportRoot?.nativeElement;
    if (!root) { this.toast.error('فشل تجهيز التقرير للتصدير'); return; }
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
          .catch(() => {
            try { this.pdfService.exportViaPrint(report); this.toast.info('تم فتح نافذة الطباعة — اختر «حفظ كـ PDF»'); }
            catch { this.toast.error('فشل تصدير PDF'); }
          })
          .finally(() => { root.innerHTML = ''; root.style.width = ''; root.style.maxWidth = ''; this.exportingPdf = false; });
      });
    });
  }

  priorityChip(priority: string): 'danger' | 'warning' | 'neutral' {
    if (priority === 'HIGH' || priority === 'URGENT') return 'danger';
    if (priority === 'MEDIUM') return 'warning';
    return 'neutral';
  }

  statusChip(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    if (status === 'COMPLETED') return 'success';
    if (status === 'IN_PROGRESS') return 'warning';
    if (status === 'OVERDUE') return 'danger';
    if (status === 'CANCELLED') return 'neutral';
    return 'info';
  }

  private buildPdfReport(tasks: SchoolTask[]): ReportResult {
    const count = (status: SchoolTask['status']) => tasks.filter(t => t.status === status).length;
    return {
      title: 'تقرير توزيع المهام',
      generatedAt: this.datePipe.transform(new Date(), 'withTime'),
      summary: [
        { label: 'إجمالي المهام', value: tasks.length },
        { label: 'جديدة', value: count('NEW') },
        { label: 'قيد التنفيذ', value: count('IN_PROGRESS') },
        { label: 'مكتملة', value: count('COMPLETED') },
        { label: 'متأخرة', value: count('OVERDUE') }
      ],
      columns: ['title', 'assignee', 'dueDate', 'priority', 'status'],
      columnLabels: { title: 'العنوان', assignee: 'المكلف', dueDate: 'الاستحقاق', priority: 'الأولوية', status: 'الحالة' },
      rows: tasks.map(t => ({
        title: t.description ? `${t.title} — ${t.description}` : t.title,
        assignee: t.assignee || '—',
        dueDate: this.datePipe.transform(t.dueDate),
        priority: this.priorityLabels[t.priority] ?? t.priority,
        status: this.statusLabels[t.status] ?? t.status
      }))
    };
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
