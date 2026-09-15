import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { LessonPlanMockService } from '../services/lesson-plan-mock.service';
import { LessonPlanFormDialogComponent } from '../lesson-plan-form-dialog/lesson-plan-form-dialog.component';
import { LESSON_PLAN_STATUS_LABELS } from '../../shared/constants/labels';
import { LessonPlan } from '../../core/models';
import { DepartmentScopeService } from '../../core/services/department-scope.service';
import { AuthService } from '../../core/services/auth.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-lesson-plans-page',
  standalone: true,
  imports: [UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe],
  templateUrl: './lesson-plans-page.component.html',
  styleUrl: './lesson-plans-page.component.scss'
})
export class LessonPlansPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(LessonPlanMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly departmentScope = inject(DepartmentScopeService);
  private readonly authService = inject(AuthService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly statusLabels = LESSON_PLAN_STATUS_LABELS;
  readonly dataSource = new MatTableDataSource<LessonPlan>([]);
  loading = true;
  query = '';
  cols = ['subject', 'teacherName', 'stageName', 'className', 'title', 'weekNumber', 'status', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (p, filter) =>
      [p.subject, p.teacherName, p.stageName, p.className, p.title, String(p.weekNumber), this.statusLabels[p.status]]
        .join(' ').toLowerCase().includes(filter);
    this.authService.refreshCurrentUser().subscribe(() => this.load());
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

  openDialog(p?: LessonPlan): void {
    const ref = this.dialog.open(LessonPlanFormDialogComponent, { width: '640px', maxWidth: '95vw', data: p ?? null });
    ref.afterClosed().subscribe((result: LessonPlan | undefined) => {
      if (!result) return;
      const req$ = p?.id ? this.service.update(p.id, result) : this.service.create(result);
      req$.subscribe({
        next: () => { this.toast.success(p?.id ? 'تم تحديث الخطة' : 'تمت إضافة الخطة'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  delete(p: LessonPlan): void {
    if (!p.id) return;
    this.confirm.deleteConfirmed(p.title, 'خطة الدرس').subscribe(() => {
      this.service.delete(p.id!).subscribe({
        next: () => { this.toast.success('تم حذف الخطة'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  chipClass(status: LessonPlan['status']): string {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'NEEDS_REVISION': return 'warning';
      default: return 'neutral';
    }
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
