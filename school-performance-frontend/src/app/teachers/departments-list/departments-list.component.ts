import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { CredentialsDialogComponent } from '../../shared/components/credentials-dialog/credentials-dialog.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DetailDialogService } from '../../shared/services/detail-dialog.service';
import { DepartmentApiService } from '../../departments/services/department-api.service';
import { TeacherApiService } from '../services/teacher-api.service';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { TeacherFormDialogComponent } from '../teacher-form-dialog/teacher-form-dialog.component';
import { Department, Teacher } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-departments-list',
  standalone: true,
  imports: [
    UiIconComponent, RouterModule, FormsModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatButtonModule, MatTooltipModule, MatDialogModule,
    PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe
  ],
  templateUrl: './departments-list.component.html'
})
export class DepartmentsListComponent implements OnInit, AfterViewInit {
  private readonly departmentService = inject(DepartmentApiService);
  private readonly teacherService = inject(TeacherApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly details = inject(DetailDialogService);
  private readonly lookup = inject(AcademicLookupService);

  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<Teacher>([]);
  departments: Department[] = [];
  loading = true;
  filtersOpen = true;

  draftQuery = '';
  draftDepartment: number | 'all' = 'all';
  query = '';
  departmentFilter: number | 'all' = 'all';

  displayedColumns = ['fullName', 'departmentName', 'employeeNumber', 'specialization', 'role', 'active', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  get activeFilterCount(): number {
    let n = 0;
    if (this.query.trim()) n++;
    if (this.departmentFilter !== 'all') n++;
    return n;
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (t, filter) => {
      const parsed = this.parseFilter(filter);
      if (parsed.departmentId != null && t.departmentId !== parsed.departmentId) return false;
      if (!parsed.text) return true;
      return [t.fullName, t.employeeNumber, t.specialization, t.email, t.phone, t.username, t.departmentName, this.roleLabel(t)]
        .join(' ')
        .toLowerCase()
        .includes(parsed.text);
    };
    this.load();
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  load(): void {
    this.loading = true;
    forkJoin({
      teachers: this.teacherService.getAll(),
      departments: this.departmentService.getAll()
    }).subscribe({
      next: ({ teachers, departments }) => {
        this.departments = departments;
        this.dataSource.data = teachers;
        this.loading = false;
        this.commitFilter();
        setTimeout(() => this.attachTableControls());
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  applyFilters(): void {
    this.query = this.draftQuery;
    this.departmentFilter = this.draftDepartment;
    this.commitFilter();
  }

  resetFilters(): void {
    this.draftQuery = '';
    this.draftDepartment = 'all';
    this.query = '';
    this.departmentFilter = 'all';
    this.commitFilter();
  }

  isHead(teacher: Teacher): boolean {
    return teacher.departmentHead === true || teacher.roleKey?.startsWith('DEPARTMENT_HEAD') === true;
  }

  roleLabel(teacher: Teacher): string {
    if (teacher.roleName) return teacher.roleName;
    const labels: Record<string, string> = {
      DEPARTMENT_HEAD: 'رئيس شعبة', TEACHER: 'معلم', SCHOOL_MANAGER: 'مدير المدرسة',
      ASSISTANT_MANAGER: 'وكيل', ADMIN: 'مدير النظام'
    };
    if (teacher.roleKey?.startsWith('DEPARTMENT_HEAD')) return 'رئيس شعبة';
    if (teacher.roleKey && labels[teacher.roleKey]) return labels[teacher.roleKey];
    return teacher.departmentHead ? 'رئيس شعبة' : 'معلم';
  }

  openTeacherDialog(teacher?: Teacher): void {
    const dialogRef = this.dialog.open(TeacherFormDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      panelClass: 'sp-form-dialog',
      data: {
        teacher,
        departmentName: teacher?.departmentName ?? '',
        departments: this.departments,
        departmentId: teacher?.departmentId
          ?? (this.departmentFilter === 'all' ? undefined : this.departmentFilter)
      }
    });

    dialogRef.afterClosed().subscribe((result?: Teacher & { departmentId?: number }) => {
      if (!result) return;
      const isNew = !teacher?.id;
      const departmentId = result.departmentId ?? teacher?.departmentId;
      if (isNew && !departmentId) {
        this.toast.error('اختر الشعبة أولاً');
        return;
      }

      const request$ = isNew
        ? this.teacherService.create(departmentId!, result)
        : this.teacherService.update(teacher!.id!, result);

      request$.subscribe({
        next: (saved) => {
          this.lookup.invalidate();
          this.toast.success(isNew ? 'تمت إضافة المعلم' : 'تم تحديث بيانات المعلم');
          this.load();
          if (isNew && saved.username) {
            this.dialog.open(CredentialsDialogComponent, {
              width: '460px', maxWidth: '95vw', disableClose: true,
              data: { personName: saved.fullName, username: saved.username, password: `${saved.username}123` }
            });
          }
        },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  viewTeacher(teacher: Teacher): void {
    this.details.open({
      title: teacher.fullName,
      subtitle: `${this.roleLabel(teacher)}${teacher.departmentName ? ' · ' + teacher.departmentName : ''}`,
      icon: 'person',
      fields: [
        { label: 'الشعبة', value: teacher.departmentName },
        { label: 'رقم الموظف', value: teacher.employeeNumber, mono: true },
        { label: 'التخصص', value: teacher.specialization },
        { label: 'اسم المستخدم', value: teacher.username, mono: true },
        { label: 'البريد', value: teacher.email },
        { label: 'الجوال', value: teacher.phone, mono: true },
        { label: 'الحالة', value: teacher.active === false ? 'غير نشط' : 'نشط', chip: teacher.active === false ? 'danger' : 'success' }
      ]
    });
  }

  deleteTeacher(teacher: Teacher): void {
    if (!teacher.id) return;
    this.confirm.deleteConfirmed(teacher.fullName, 'المعلم').subscribe(() => {
      this.teacherService.delete(teacher.id!).subscribe({
        next: () => { this.lookup.invalidate(); this.toast.success('تم حذف المعلم'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  private commitFilter(): void {
    this.dataSource.filter = JSON.stringify({
      text: this.query.trim().toLowerCase(),
      departmentId: this.departmentFilter === 'all' ? null : this.departmentFilter
    });
    this.paginator?.firstPage();
  }

  private parseFilter(raw: string): { text: string; departmentId: number | null } {
    if (!raw) return { text: '', departmentId: null };
    try {
      const parsed = JSON.parse(raw) as { text?: string; departmentId?: number | null };
      return { text: parsed.text ?? '', departmentId: parsed.departmentId ?? null };
    } catch {
      return { text: raw.toLowerCase(), departmentId: null };
    }
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
