import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DetailDialogService } from '../../shared/services/detail-dialog.service';
import { InternalRequestMockService } from '../services/internal-request-mock.service';
import { InternalRequestFormDialogComponent } from '../internal-request-form-dialog/internal-request-form-dialog.component';
import { REQUEST_TYPE_LABELS, PRIORITY_LABELS, REQUEST_STATUS_LABELS } from '../../shared/constants/labels';
import { InternalRequest } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-internal-requests-page',
  standalone: true,
  imports: [UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, MatMenuModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe, AppDatePipe],
  templateUrl: './internal-requests-page.component.html'
})
export class InternalRequestsPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(InternalRequestMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly details = inject(DetailDialogService);
  private readonly datePipe = new AppDatePipe();

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly typeLabels = REQUEST_TYPE_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;
  readonly statusLabels = REQUEST_STATUS_LABELS;
  readonly statusOptions = Object.keys(REQUEST_STATUS_LABELS);

  readonly dataSource = new MatTableDataSource<InternalRequest>([]);
  loading = true;
  query = '';
  cols = ['requestType', 'requesterName', 'description', 'priority', 'status', 'requestDate', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (r, filter) =>
      [this.requestTypeLabel(r), r.requesterName, r.description, this.priorityLabels[r.priority], this.statusLabels[r.status]]
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

  openDialog(req?: InternalRequest): void {
    const ref = this.dialog.open(InternalRequestFormDialogComponent, { width: '560px', maxWidth: '95vw', data: req ?? null });
    ref.afterClosed().subscribe((result: InternalRequest | undefined) => {
      if (!result) return;
      const req$ = req?.id ? this.service.update(req.id, result) : this.service.create(result);
      req$.subscribe({
        next: () => { this.toast.success(req?.id ? 'تم تحديث الطلب' : 'تم إرسال الطلب'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  view(req: InternalRequest): void {
    this.details.open({
      title: this.requestTypeLabel(req),
      subtitle: `مقدم الطلب: ${req.requesterName}`,
      icon: 'inbox',
      fields: [
        { label: 'الوصف', value: req.description },
        { label: 'مقدم الطلب', value: req.requesterName },
        { label: 'التاريخ', value: this.datePipe.transform(req.requestDate) },
        { label: 'الأولوية', value: this.priorityLabels[req.priority] ?? req.priority, chip: this.priorityChip(req.priority) },
        { label: 'الحالة', value: this.statusLabels[req.status] ?? req.status, chip: this.statusChip(req.status) }
      ]
    });
  }

  requestTypeLabel(req: InternalRequest): string {
    if (req.requestType === 'OTHER' && req.customRequestType) {
      return req.customRequestType;
    }
    return this.typeLabels[req.requestType] ?? req.requestType;
  }

  changeStatus(req: InternalRequest, status: string): void {
    if (!req.id || req.status === status) return;
    this.service.update(req.id, { ...req, status: status as InternalRequest['status'] }).subscribe({
      next: () => { this.toast.success('تم تحديث حالة الطلب'); this.load(); },
      error: (e) => this.toast.fromError(e)
    });
  }

  delete(req: InternalRequest): void {
    if (!req.id) return;
    this.confirm.deleteConfirmed(this.requestTypeLabel(req), 'الطلب').subscribe(() => {
      this.service.delete(req.id!).subscribe({
        next: () => { this.toast.success('تم حذف الطلب'); this.load(); },
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

  statusChip(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'COMPLETED': return 'success';
      case 'IN_REVIEW': return 'warning';
      case 'REJECTED': return 'danger';
      case 'NEW': return 'info';
      default: return 'neutral';
    }
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
