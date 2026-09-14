import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
import { AcademicDepartmentMockService } from '../services/academic-department-mock.service';
import { AcademicDepartmentFormDialogComponent } from '../academic-department-form-dialog/academic-department-form-dialog.component';
import { AcademicDepartment } from '../../core/models';

@Component({
  selector: 'app-academic-departments-page',
  standalone: true,
  imports: [
    MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatIconModule, MatTooltipModule,
    MatDialogModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent,
    HasPermissionPipe
  ],
  templateUrl: './academic-departments-page.component.html',
  styleUrl: './academic-departments-page.component.scss'
})
export class AcademicDepartmentsPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(AcademicDepartmentMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly details = inject(DetailDialogService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<AcademicDepartment>([]);
  loading = true;
  query = '';
  cols = ['name', 'headName', 'teacherCount', 'subjects', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (d, filter) =>
      [d.name, d.headName, d.subjects].join(' ').toLowerCase().includes(filter);
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

  subjectList(d: AcademicDepartment): string[] {
    return (d.subjects ?? '').split(/[،,]/).map(s => s.trim()).filter(Boolean);
  }

  openDialog(d?: AcademicDepartment): void {
    const ref = this.dialog.open(AcademicDepartmentFormDialogComponent, { width: '520px', maxWidth: '95vw', direction: 'rtl', data: d ?? null });
    ref.afterClosed().subscribe((result: AcademicDepartment | undefined) => {
      if (!result) return;
      const req$ = d?.id ? this.service.update(d.id, result) : this.service.create(result);
      req$.subscribe({
        next: () => { this.toast.success(d?.id ? 'تم تحديث القسم' : 'تمت إضافة القسم'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  view(d: AcademicDepartment): void {
    this.details.open({
      title: d.name,
      subtitle: 'قسم دراسي',
      icon: 'account_tree',
      fields: [
        { label: 'رئيس القسم', value: d.headName },
        { label: 'عدد المعلمين', value: d.teacherCount, chip: 'info' },
        { label: 'المواد التابعة', value: d.subjects }
      ]
    });
  }

  delete(d: AcademicDepartment): void {
    if (!d.id) return;
    this.confirm.deleteConfirmed(d.name, 'القسم').subscribe(() => {
      this.service.delete(d.id!).subscribe({
        next: () => { this.toast.success('تم حذف القسم'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
