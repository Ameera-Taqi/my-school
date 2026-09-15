import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DetailDialogService } from '../../shared/services/detail-dialog.service';
import { DepartmentApiService } from '../../departments/services/department-api.service';
import { DepartmentFormDialogComponent } from '../../departments/department-form-dialog/department-form-dialog.component';
import { Department } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-academic-departments-page',
  standalone: true,
  imports: [
    UiIconComponent, FormsModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatButtonModule, MatTooltipModule, MatDialogModule,
    PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe
  ],
  templateUrl: './academic-departments-page.component.html'
})
export class AcademicDepartmentsPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(DepartmentApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly details = inject(DetailDialogService);

  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<Department>([]);
  loading = true;
  filtersOpen = true;

  draftQuery = '';
  draftStatus: 'all' | 'active' | 'inactive' = 'all';
  query = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  cols = ['name', 'headName', 'teacherCount', 'subjects', 'active', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  get activeFilterCount(): number {
    let n = 0;
    if (this.query.trim()) n++;
    if (this.statusFilter !== 'all') n++;
    return n;
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (d, filter) => {
      const parsed = this.parseFilter(filter);
      if (parsed.status === 'active' && d.active === false) return false;
      if (parsed.status === 'inactive' && d.active !== false) return false;
      if (!parsed.text) return true;
      return [d.name, d.code, d.headName ?? '', d.description ?? '', (d.subjects ?? []).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(parsed.text);
    };
    this.load();
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.loading = false;
        this.commitFilter();
        setTimeout(() => this.attachTableControls());
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  applyFilters(): void {
    this.query = this.draftQuery;
    this.statusFilter = this.draftStatus;
    this.commitFilter();
  }

  resetFilters(): void {
    this.draftQuery = '';
    this.draftStatus = 'all';
    this.query = '';
    this.statusFilter = 'all';
    this.commitFilter();
  }

  subjectList(d: Department): string[] {
    return d.subjects ?? [];
  }

  openDialog(d?: Department): void {
    const ref = this.dialog.open(DepartmentFormDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      panelClass: 'sp-form-dialog',
      data: d ?? null
    });
    ref.afterClosed().subscribe((result: Department | undefined) => {
      if (!result) return;
      const req$ = d?.id ? this.service.update(d.id, result) : this.service.create(result);
      req$.subscribe({
        next: () => { this.toast.success(d?.id ? 'تم تحديث الشعبة' : 'تمت إضافة الشعبة'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  view(d: Department): void {
    this.details.open({
      title: d.name,
      subtitle: 'شعبة دراسية · ' + d.code,
      icon: 'account_tree',
      fields: [
        { label: 'رئيس الشعبة', value: d.headName || 'لا يوجد رئيس شعبة' },
        { label: 'عدد المعلمين', value: d.teacherCount ?? 0, chip: 'info' },
        { label: 'المواد التابعة', value: (d.subjects ?? []).join('، ') || '—' },
        { label: 'الحالة', value: d.active === false ? 'غير نشط' : 'نشط', chip: d.active === false ? 'danger' : 'success' },
        { label: 'الوصف', value: d.description || '—' }
      ]
    });
  }

  delete(d: Department): void {
    if (!d.id) return;
    this.confirm.deleteConfirmed(d.name, 'الشعبة').subscribe(() => {
      this.service.delete(d.id!).subscribe({
        next: () => { this.toast.success('تم حذف الشعبة'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  private commitFilter(): void {
    this.dataSource.filter = JSON.stringify({
      text: this.query.trim().toLowerCase(),
      status: this.statusFilter
    });
    this.paginator?.firstPage();
  }

  private parseFilter(filter: string): { text: string; status: 'all' | 'active' | 'inactive' } {
    try {
      const parsed = JSON.parse(filter) as { text?: string; status?: 'all' | 'active' | 'inactive' };
      return { text: parsed.text ?? '', status: parsed.status ?? 'all' };
    } catch {
      return { text: filter.toLowerCase(), status: 'all' };
    }
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
