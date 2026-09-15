import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { AlertMockService } from '../services/alert-mock.service';
import { ALERT_TYPE_LABELS, SEVERITY_LABELS, ALERT_STATUS_LABELS } from '../../shared/constants/labels';
import { AlertItem } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-alerts-page',
  standalone: true,
  imports: [UiIconComponent, NgClass, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, AppDatePipe],
  templateUrl: './alerts-page.component.html'
})
export class AlertsPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(AlertMockService);
  private readonly toast = inject(ToastService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly typeLabels = ALERT_TYPE_LABELS;
  readonly severityLabels = SEVERITY_LABELS;
  readonly statusLabels = ALERT_STATUS_LABELS;
  readonly dataSource = new MatTableDataSource<AlertItem>([]);
  loading = true;
  query = '';
  cols = ['title', 'alertType', 'alertDate', 'severity', 'status', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }
  get newCount(): number { return this.dataSource.data.filter(a => a.status === 'NEW').length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (a, filter) =>
      [a.title, this.typeLabels[a.alertType], this.severityLabels[a.severity], this.statusLabels[a.status]]
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

  markReviewed(alert: AlertItem): void {
    if (!alert.id) return;
    this.service.markReviewed(alert.id).subscribe({
      next: () => { this.toast.success('تمت مراجعة التنبيه'); this.load(); },
      error: (e) => this.toast.fromError(e)
    });
  }

  severityChip(severity: string): 'danger' | 'warning' | 'success' {
    switch (severity) {
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warning';
      default: return 'success';
    }
  }

  statusChip(status: string): 'info' | 'neutral' {
    return status === 'NEW' ? 'info' : 'neutral';
  }

  typeIcon(type: string): string {
    switch (type) {
      case 'ABSENCE': return 'person_off';
      case 'LATE_REQUEST': return 'schedule';
      case 'OVERDUE_TASK': return 'assignment_late';
      case 'LOW_PERFORMANCE': return 'trending_down';
      case 'BEHAVIOR': return 'gavel';
      default: return 'notifications';
    }
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
