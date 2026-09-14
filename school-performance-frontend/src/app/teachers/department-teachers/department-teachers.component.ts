import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { SearchFieldComponent } from '../../shared/components/search-field/search-field.component';
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

@Component({
  selector: 'app-department-teachers',
  standalone: true,
  imports: [
    RouterModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatDialogModule, PageHeaderComponent, BreadcrumbComponent, SearchFieldComponent,
    EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe
  ],
  templateUrl: './department-teachers.component.html',
  styleUrl: './department-teachers.component.scss'
})
export class DepartmentTeachersComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly departmentService = inject(DepartmentApiService);
  private readonly teacherService = inject(TeacherApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly details = inject(DetailDialogService);
  private readonly lookup = inject(AcademicLookupService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<Teacher>([]);
  departmentId = 0;
  department: Department | null = null;
  loading = true;
  query = '';
  displayedColumns = ['fullName', 'employeeNumber', 'specialization', 'role', 'contact', 'active', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }
  get headsCount(): number { return this.dataSource.data.filter(t => this.isHead(t)).length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (t, filter) =>
      [t.fullName, t.employeeNumber, t.specialization, t.email, t.phone, t.username, this.roleLabel(t)].join(' ').toLowerCase().includes(filter);
    this.route.paramMap.subscribe(params => {
      this.departmentId = Number(params.get('departmentId'));
      this.load();
    });
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  load(): void {
    this.loading = true;
    this.departmentService.getById(this.departmentId).subscribe({
      next: (dept) => {
        this.department = dept;
        this.teacherService.getByDepartment(this.departmentId).subscribe({
          next: (teachers) => { this.dataSource.data = teachers; this.loading = false; setTimeout(() => this.attachTableControls()); },
          error: (e) => { this.loading = false; this.toast.fromError(e); }
        });
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  onSearch(query: string): void {
    this.query = query;
    this.dataSource.filter = query.toLowerCase();
    this.paginator?.firstPage();
  }

  isHead(teacher: Teacher): boolean {
    return teacher.departmentHead === true || teacher.roleKey?.startsWith('DEPARTMENT_HEAD') === true;
  }

  roleLabel(teacher: Teacher): string {
    if (teacher.roleName) return teacher.roleName;
    const labels: Record<string, string> = {
      DEPARTMENT_HEAD: 'رئيس قسم', TEACHER: 'معلم', SCHOOL_MANAGER: 'مدير المدرسة',
      ASSISTANT_MANAGER: 'مدير مساعد', ADMIN: 'مدير النظام'
    };
    if (teacher.roleKey?.startsWith('DEPARTMENT_HEAD')) return labels[teacher.roleKey] ?? 'رئيس قسم';
    if (teacher.roleKey && labels[teacher.roleKey]) return labels[teacher.roleKey];
    return teacher.departmentHead ? 'رئيس قسم' : 'معلم';
  }

  openTeacherDialog(teacher?: Teacher): void {
    const dialogRef = this.dialog.open(TeacherFormDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      direction: 'rtl',
      data: { teacher, departmentName: this.department?.name ?? '' }
    });

    dialogRef.afterClosed().subscribe((result: Teacher | undefined) => {
      if (!result) return;
      const isNew = !teacher?.id;
      const request$ = isNew
        ? this.teacherService.create(this.departmentId, result)
        : this.teacherService.update(teacher!.id!, result);

      request$.subscribe({
        next: (saved) => {
          this.lookup.invalidate();
          this.toast.success(isNew ? 'تمت إضافة المعلم' : 'تم تحديث بيانات المعلم');
          this.load();
          if (isNew && saved.username) {
            this.dialog.open(CredentialsDialogComponent, {
              width: '460px', maxWidth: '95vw', direction: 'rtl', disableClose: true,
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
      subtitle: `${this.roleLabel(teacher)} · ${this.department?.name ?? ''}`,
      icon: 'person',
      fields: [
        { label: 'رقم الموظف', value: teacher.employeeNumber, mono: true },
        { label: 'التخصص', value: teacher.specialization },
        { label: 'اسم المستخدم', value: teacher.username, mono: true },
        { label: 'البريد', value: teacher.email },
        { label: 'الجوال', value: teacher.phone, mono: true },
        { label: 'تاريخ التعيين', value: teacher.hireDate ? new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(teacher.hireDate)) : '' },
        { label: 'الحالة', value: teacher.active ? 'نشط' : 'غير نشط', chip: teacher.active ? 'success' : 'danger' }
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

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
