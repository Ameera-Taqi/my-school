import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { SearchFieldComponent } from '../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DetailDialogService } from '../../shared/services/detail-dialog.service';
import { SchoolClassApiService } from '../../school-classes/services/school-class-api.service';
import { StudentApiService } from '../services/student-api.service';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { StudentFormDialogComponent } from '../student-form-dialog/student-form-dialog.component';
import { StudentImportResultDialogComponent } from '../student-import-result-dialog.component';
import { downloadStudentImportTemplate, parseStudentImportFile } from '../student-excel';
import { GENDER_LABELS, STUDENT_STATUS_LABELS } from '../constants/student.constants';
import { SchoolClass, Student, StudentImportError } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-class-details',
  standalone: true,
  imports: [UiIconComponent, RouterModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, PageHeaderComponent, BreadcrumbComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe, AppDatePipe],
  templateUrl: './class-details.component.html'
})
export class ClassDetailsComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly classService = inject(SchoolClassApiService);
  private readonly studentService = inject(StudentApiService);
  private readonly lookup = inject(AcademicLookupService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly details = inject(DetailDialogService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;
  @ViewChild('excelFileInput') excelFileInput?: ElementRef<HTMLInputElement>;

  readonly statusLabels = STUDENT_STATUS_LABELS;
  readonly genderLabels = GENDER_LABELS;
  readonly dataSource = new MatTableDataSource<Student>([]);

  classId = 0;
  schoolClass: SchoolClass | null = null;
  loading = true;
  importing = false;
  query = '';
  displayedColumns = ['fullName', 'civilId', 'guardianPhone', 'status', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }
  get capacityPercent(): number {
    const cap = this.schoolClass?.capacity ?? 0;
    return cap > 0 ? Math.min(100, Math.round((this.total / cap) * 100)) : 0;
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (s, filter) =>
      [s.fullName, s.civilId, s.guardianPhone, this.statusLabels[s.status ?? '']].join(' ').toLowerCase().includes(filter);
    this.route.paramMap.subscribe(params => {
      this.classId = Number(params.get('classId'));
      this.load();
    });
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  load(): void {
    this.loading = true;
    this.classService.getById(this.classId).subscribe({
      next: (cls) => {
        this.schoolClass = cls;
        this.studentService.getByClass(this.classId).subscribe({
          next: (students) => { this.dataSource.data = students; this.loading = false; setTimeout(() => this.attachTableControls()); },
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

  downloadTemplate(): void {
    void downloadStudentImportTemplate(this.schoolClass?.name ?? '');
  }

  triggerExcelUpload(): void {
    this.excelFileInput?.nativeElement.click();
  }

  async onExcelFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.importing = true;
    try {
      const parsed = await parseStudentImportFile(file);
      if (!parsed.students.length) {
        this.showImportResult(0, parsed.errors.length
          ? parsed.errors
          : [{ row: 1, message: 'لا توجد صفوف صالحة للاستيراد في الملف' }]);
        return;
      }

      this.studentService.import(this.classId, parsed.students).subscribe({
        next: (result) => {
          this.importing = false;
          if (result.created > 0) {
            this.lookup.invalidate();
            this.load();
            this.toast.success(`تم إضافة ${result.created} طالب`);
          }
          const errors = [...parsed.errors, ...(result.errors ?? [])];
          if (errors.length) {
            this.showImportResult(result.created, errors);
          } else if (result.created === 0) {
            this.toast.warning('لم يتم استيراد أي طالب');
          }
        },
        error: (e) => {
          this.importing = false;
          this.toast.fromError(e);
        }
      });
    } catch {
      this.importing = false;
      this.toast.error('تعذر قراءة ملف Excel. تأكد من استخدام القالب الصحيح');
    }
  }

  openStudentDialog(student?: Student): void {
    const dialogRef = this.dialog.open(StudentFormDialogComponent, {
      width: '560px',
      maxWidth: '95vw',

      data: { student, stageName: this.schoolClass?.academicStageName ?? '', className: this.schoolClass?.name ?? '' }
    });

    dialogRef.afterClosed().subscribe((result: Student | undefined) => {
      if (!result) return;
      const request$ = student?.id
        ? this.studentService.update(student.id, result)
        : this.studentService.create(this.classId, result);

      request$.subscribe({
        next: () => {
          this.lookup.invalidate();
          this.toast.success(student?.id ? 'تم تحديث بيانات الطالب' : 'تمت إضافة الطالب');
          this.load();
        },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  viewStudent(student: Student): void {
    this.details.open({
      title: student.fullName,
      subtitle: `${student.academicStageName ?? ''} · ${student.className ?? ''}`,
      icon: 'school',
      fields: [
        { label: 'الرقم المدني', value: student.civilId, mono: true },
        { label: 'تاريخ الميلاد', value: this.formatDate(student.birthDate) },
        { label: 'الجنس', value: this.genderLabels[student.gender ?? ''] },
        { label: 'رقم ولي الأمر', value: student.guardianPhone, mono: true },
        { label: 'الحالة', value: this.statusLabels[student.status ?? ''] || student.status, chip: this.statusChip(student.status) },
        { label: 'ملاحظات', value: student.notes }
      ]
    });
  }

  deleteStudent(student: Student): void {
    if (!student.id) return;
    this.confirm.deleteConfirmed(student.fullName, 'الطالب').subscribe(() => {
      this.studentService.delete(student.id!).subscribe({
        next: () => { this.lookup.invalidate(); this.toast.success('تم حذف الطالب'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  statusChip(status?: string): string {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'TRANSFERRED': return 'warning';
      case 'SUSPENDED': return 'danger';
      default: return 'neutral';
    }
  }

  private formatDate(value?: string): string {
    return new AppDatePipeProxy().transform(value);
  }

  private showImportResult(created: number, errors: StudentImportError[]): void {
    this.importing = false;
    this.dialog.open(StudentImportResultDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { created, errors }
    });
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}

/** Tiny helper so the detail dialog gets the same date format as templates. */
class AppDatePipeProxy {
  transform(value?: string): string {
    if (!value) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
    return isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  }
}
