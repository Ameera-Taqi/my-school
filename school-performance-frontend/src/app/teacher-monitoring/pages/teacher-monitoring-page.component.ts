import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { TEACHER_MONITORING_STATUS_LABELS } from '../../shared/constants/labels';
import { TeacherMonitoringRecord } from '../../core/models';
import { TeacherMonitoringApiService } from '../services/teacher-monitoring-api.service';
import { TeacherMonitoringDetailDialogComponent } from '../teacher-monitoring-detail-dialog/teacher-monitoring-detail-dialog.component';
import { DepartmentScopeService } from '../../core/services/department-scope.service';
import { AuthService } from '../../core/services/auth.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-teacher-monitoring-page',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatCardModule, MatProgressSpinnerModule, PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent, AppDatePipe],
  templateUrl: './teacher-monitoring-page.component.html'
})
export class TeacherMonitoringPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(TeacherMonitoringApiService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  readonly departmentScope = inject(DepartmentScopeService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly statusLabels = TEACHER_MONITORING_STATUS_LABELS;
  readonly statusOptions = Object.keys(TEACHER_MONITORING_STATUS_LABELS);
  readonly dataSource = new MatTableDataSource<TeacherMonitoringRecord>([]);

  loading = true;

  stats = { total: 0, excellent: 0, needsFollowUp: 0, avgScore: 0 };

  filters = this.fb.group({
    status: [''],
    search: ['']
  });

  cols = ['teacherName', 'departmentName', 'subject', 'attendanceRate', 'lessonPlanRate', 'evaluationScore', 'lastVisitDate', 'status', 'actions'];

  get tableCols(): string[] {
    if (this.departmentScope.isScoped()) {
      return this.cols.filter(c => c !== 'departmentName');
    }
    return this.cols;
  }

  get total(): number { return this.dataSource.data.length; }

  get hasFilters(): boolean {
    const v = this.filters.getRawValue();
    return !!(v.status || v.search);
  }

  ngOnInit(): void {
    this.auth.refreshCurrentUser().subscribe({
      next: () => this.load(),
      error: () => this.load()
    });
  }

  ngAfterViewInit(): void {
    this.attachTableControls();
  }

  load(): void {
    this.loading = true;
    const v = this.filters.getRawValue();
    this.service.getAll({
      status: v.status || undefined,
      search: v.search || undefined
    }).subscribe({
      next: (data) => {
        const scoped = this.departmentScope.isScoped()
          ? data.filter(r => r.departmentName === this.departmentScope.departmentName())
          : data;
        this.dataSource.data = scoped;
        this.updateStats(scoped);
        this.loading = false;
        setTimeout(() => this.attachTableControls());
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  resetFilters(): void {
    this.filters.reset({ status: '', search: '' });
    this.load();
  }

  view(record: TeacherMonitoringRecord): void {
    this.dialog.open(TeacherMonitoringDetailDialogComponent, {
      width: '580px',
      maxWidth: '95vw',

      data: { record }
    });
  }

  statusLabel(status: TeacherMonitoringRecord['status']): string {
    return this.statusLabels[status] ?? status;
  }

  chipClass(status: TeacherMonitoringRecord['status']): string {
    switch (status) {
      case 'EXCELLENT': return 'success';
      case 'GOOD': return 'info';
      case 'NEEDS_FOLLOW_UP': return 'warning';
      case 'CRITICAL': return 'danger';
      default: return 'neutral';
    }
  }

  rateClass(rate: number): string {
    if (rate >= 90) return 'success';
    if (rate >= 75) return 'warning';
    return 'danger';
  }

  private updateStats(data: TeacherMonitoringRecord[]): void {
    const total = data.length;
    const excellent = data.filter(r => r.status === 'EXCELLENT' || r.status === 'GOOD').length;
    const needsFollowUp = data.filter(r => r.status === 'NEEDS_FOLLOW_UP' || r.status === 'CRITICAL').length;
    const avgScore = total
      ? Math.round((data.reduce((sum, r) => sum + r.evaluationScore, 0) / total) * 10) / 10
      : 0;
    this.stats = { total, excellent, needsFollowUp, avgScore };
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
