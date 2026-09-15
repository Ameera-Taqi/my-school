import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { TeacherPortalMockService } from '../../services/teacher-portal-mock.service';
import { AssignmentFormDialogComponent } from '../../dialogs/assignment-form-dialog.component';
import { TeacherAssignment } from '../../../core/models';
import { UiIconComponent } from '../../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-assignments-page',
  standalone: true,
  imports: [UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, AppDatePipe],
  templateUrl: './assignments-page.component.html'
})
export class AssignmentsPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(TeacherPortalMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<TeacherAssignment>([]);
  loading = true;
  query = '';
  cols = ['title', 'className', 'subject', 'dueDate', 'status', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (a, filter) =>
      [a.title, a.className, a.subject, a.description ?? '', this.statusLabel(a.status)].join(' ').toLowerCase().includes(filter);
    this.load();
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  load(): void {
    this.loading = true;
    this.service.getAssignments().subscribe({
      next: (data) => { this.dataSource.data = data; this.loading = false; setTimeout(() => this.attachTableControls()); },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  onSearch(query: string): void {
    this.query = query;
    this.dataSource.filter = query.toLowerCase();
    this.paginator?.firstPage();
  }

  statusLabel(status: TeacherAssignment['status']): string {
    return status === 'OPEN' ? 'مفتوح' : 'مغلق';
  }

  chipClass(status: TeacherAssignment['status']): string {
    return status === 'OPEN' ? 'success' : 'neutral';
  }

  openDialog(item?: TeacherAssignment): void {
    const ref = this.dialog.open(AssignmentFormDialogComponent, { width: '560px', maxWidth: '95vw', data: item ?? null });
    ref.afterClosed().subscribe((result: TeacherAssignment | undefined) => {
      if (!result) return;
      this.service.saveAssignment(result).subscribe({
        next: () => { this.toast.success(item?.id ? 'تم تحديث الواجب' : 'تمت إضافة الواجب'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  delete(item: TeacherAssignment): void {
    if (!item.id) return;
    this.confirm.deleteConfirmed(item.title, 'الواجب').subscribe(() => {
      this.service.deleteAssignment(item.id!).subscribe({
        next: () => { this.toast.success('تم حذف الواجب'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
