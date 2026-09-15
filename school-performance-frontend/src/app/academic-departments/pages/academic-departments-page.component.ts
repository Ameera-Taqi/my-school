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
import { DetailDialogService } from '../../shared/services/detail-dialog.service';
import { RouterModule } from '@angular/router';
import { DepartmentApiService } from '../../departments/services/department-api.service';
import { DepartmentFormDialogComponent } from '../../departments/department-form-dialog/department-form-dialog.component';
import { Department } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-academic-departments-page',
  standalone: true,
  imports: [UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe, RouterModule],
  templateUrl: './academic-departments-page.component.html',
  styleUrl: './academic-departments-page.component.scss'
})
export class AcademicDepartmentsPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(DepartmentApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly details = inject(DetailDialogService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<Department>([]);
  loading = true;
  query = '';
  cols = ['name', 'headName', 'teacherCount', 'subjects', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (d, filter) =>
      [d.name, d.code, d.headName ?? '', (d.subjects ?? []).join(' ')].join(' ').toLowerCase().includes(filter);
    this.load();
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.loading = false;
        setTimeout(() => this.attachTableControls());
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  onSearch(query: string): void {
    this.query = query;
    this.dataSource.filter = query.toLowerCase();
    this.paginator?.firstPage();
  }

  subjectList(d: Department): string[] {
    return d.subjects ?? [];
  }

  openDialog(d?: Department): void {
    const ref = this.dialog.open(DepartmentFormDialogComponent, { width: '480px', maxWidth: '95vw', data: d ?? null });
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

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
