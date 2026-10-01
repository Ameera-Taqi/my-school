import { NgClass } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { ToastService } from '../../../shared/services/toast.service';
import { TeacherPortalMockService } from '../../services/teacher-portal-mock.service';
import { AttendanceApiService } from '../../../attendance/services/attendance-api.service';
import { AcademicLookupService } from '../../../core/services/academic-lookup.service';
import { AttendanceRecord, SchoolClass } from '../../../core/models';
import { switchMap, of } from 'rxjs';
import { ATTENDANCE_STATUS_LABELS } from '../../../shared/constants/labels';
import { ClassAttendanceRow } from '../../../core/models';
import { UiIconComponent } from '../../../shared/icons/ui-icon.component';
import { currentPeriod, periodRange } from '../../../core/constants/bell-schedule';

type AttendanceRecordStatus = 'PRESENT' | 'ABSENT' | 'LATE';

@Component({
  selector: 'app-attendance-record-page',
  standalone: true,
  imports: [NgClass, UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatButtonToggleModule, MatTableModule, MatDatepickerModule, MatInputModule, MatCardModule, PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent],
  templateUrl: './attendance-record-page.component.html'
})
export class AttendanceRecordPageComponent implements OnInit {
  /** Hides the page title and class picker when shown inside a class page. */
  @Input() embedded = false;
  @Input() lockedClass = '';
  @Input() lockedClassId: number | null = null;
  @Input() lockedStageName = '';
  @Input() lockedStageId: number | null = null;
  /** Teaching period for this session. Null lets the teacher choose the period. */
  @Input() lockedPeriod: number | null = null;

  private readonly service = inject(TeacherPortalMockService);
  private readonly attendanceApi = inject(AttendanceApiService);
  private readonly lookup = inject(AcademicLookupService);
  private currentClass: SchoolClass | null = null;
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly statusLabels = ATTENDANCE_STATUS_LABELS;
  readonly statusOptions: AttendanceRecordStatus[] = ['PRESENT', 'ABSENT', 'LATE'];
  readonly periodOptions = [1, 2, 3, 4, 5, 6, 7];
  classNames: string[] = [];
  rows: ClassAttendanceRow[] = [];
  loading = false;
  cols = ['rowNumber', 'studentName', 'status'];

  form = this.fb.group({
    date: [new Date()],
    className: [''],
    period: [currentPeriod() ?? 1]
  });

  get activePeriod(): number {
    return this.lockedPeriod && this.lockedPeriod > 0 ? this.lockedPeriod : (this.form.controls.period.value ?? 1);
  }

  get periodSubtitle(): string {
    const range = periodRange(this.activePeriod);
    return `حضور الحصة ${this.activePeriod}${range ? ' (' + range + ')' : ''} — مستقل عن الحضور اليومي`;
  }

  ngOnInit(): void {
    if (this.lockedPeriod && this.lockedPeriod > 0) {
      this.form.controls.period.setValue(this.lockedPeriod);
    }
    if (this.embedded && this.lockedClassId) {
      this.form.controls.className.setValue(this.lockedClass);
      this.currentClass = {
        id: this.lockedClassId,
        name: this.lockedClass,
        capacity: 0,
        academicStageId: this.lockedStageId ?? undefined,
        academicStageName: this.lockedStageName
      };
      this.load();
      this.form.controls.date.valueChanges.subscribe(() => this.load());
      this.form.controls.period.valueChanges.subscribe(() => this.load());
      return;
    }
    this.service.getClassNames().subscribe(names => {
      this.classNames = names;
      if (names.length) {
        this.form.controls.className.setValue(names[0]);
        this.load();
      }
    });
    this.form.controls.className.valueChanges.subscribe(() => this.load());
    this.form.controls.date.valueChanges.subscribe(() => this.load());
    this.form.controls.period.valueChanges.subscribe(() => this.load());
  }

  resetFilters(): void {
    if (this.embedded) {
      this.form.controls.date.setValue(new Date());
      return;
    }
    const defaultClass = this.classNames[0] ?? '';
    this.form.reset({ date: new Date(), className: defaultClass });
    this.rows = [];
    if (defaultClass) this.load();
  }

  load(): void {
    const className = this.form.controls.className.value ?? '';
    const date = this.form.controls.date.value;
    if (!date || (!className && !this.lockedClassId)) return;
    if (this.lockedClassId) {
      this.loading = true;
      this.attendanceApi.getStudentAttendance(this.lockedStageId ?? 0, this.lockedClassId, this.isoDate(date), this.activePeriod).subscribe({
        next: (data) => {
          this.rows = data.map(r => ({ id: r.personId, studentName: r.personName, status: this.normalizeStatus(r.status), lateTime: r.lateTime }));
          this.syncColumns();
          this.loading = false;
        },
        error: (e) => { this.loading = false; this.toast.fromError(e); }
      });
      return;
    }
    this.loading = true;
    this.lookup.findClassByName(className).pipe(
      switchMap(schoolClass => {
        this.currentClass = schoolClass ?? null;
        if (!schoolClass?.id) return of([] as AttendanceRecord[]);
        return this.attendanceApi.getStudentAttendance(schoolClass.academicStageId ?? 0, schoolClass.id, this.isoDate(date), this.activePeriod);
      })
    ).subscribe({
      next: (data) => {
        this.rows = data.map(r => ({ id: r.personId, studentName: r.personName, status: this.normalizeStatus(r.status), lateTime: r.lateTime }));
        this.syncColumns();
        this.loading = false;
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  private isoDate(value: Date | string): string {
    const d = value instanceof Date ? value : new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  setStatus(row: ClassAttendanceRow, status: AttendanceRecordStatus): void {
    row.status = status;
    row.lateTime = status === 'LATE' ? this.clockTime() : null;
    this.rows = [...this.rows];
    this.syncColumns();
  }

  private syncColumns(): void {
    this.cols = this.rows.some(row => row.status === 'LATE')
      ? ['rowNumber', 'studentName', 'status', 'lateTime']
      : ['rowNumber', 'studentName', 'status'];
  }

  private clockTime(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  countOf(status: AttendanceRecordStatus): number {
    return this.rows.filter(r => r.status === status).length;
  }

  save(): void {
    const date = this.form.controls.date.value;
    if (!date || !this.currentClass) return;
    const records: AttendanceRecord[] = this.rows.map(r => ({
      personId: r.id,
      personName: r.studentName,
      personType: 'STUDENT',
      stageName: this.currentClass?.academicStageName,
      className: this.currentClass?.name,
      date: this.isoDate(date),
      period: this.activePeriod,
      status: r.status,
      lateTime: r.status === 'LATE' ? r.lateTime : null
    }));
    this.attendanceApi.saveStudentAttendance(records).subscribe({
      next: () => this.toast.success('تم حفظ الحضور'),
      error: (e) => this.toast.fromError(e)
    });
  }

  private normalizeStatus(status: string): AttendanceRecordStatus {
    return status === 'ABSENT' || status === 'LATE' ? status : 'PRESENT';
  }
}
