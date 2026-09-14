import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
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

type AttendanceRecordStatus = 'PRESENT' | 'ABSENT' | 'LATE';

@Component({
  selector: 'app-attendance-record-page',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatButtonToggleModule,
    MatIconModule, MatTableModule, MatDatepickerModule, MatInputModule,
    PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent
  ],
  templateUrl: './attendance-record-page.component.html',
  styleUrl: './attendance-record-page.component.scss'
})
export class AttendanceRecordPageComponent implements OnInit {
  private readonly service = inject(TeacherPortalMockService);
  private readonly attendanceApi = inject(AttendanceApiService);
  private readonly lookup = inject(AcademicLookupService);
  private currentClass: SchoolClass | null = null;
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly statusLabels = ATTENDANCE_STATUS_LABELS;
  readonly statusOptions: AttendanceRecordStatus[] = ['PRESENT', 'ABSENT', 'LATE'];
  classNames: string[] = [];
  rows: ClassAttendanceRow[] = [];
  loading = false;
  cols = ['studentName', 'status'];

  form = this.fb.group({
    date: [new Date()],
    className: ['']
  });

  ngOnInit(): void {
    this.service.getClassNames().subscribe(names => {
      this.classNames = names;
      if (names.length) {
        this.form.controls.className.setValue(names[0]);
        this.load();
      }
    });
    this.form.controls.className.valueChanges.subscribe(() => this.load());
    this.form.controls.date.valueChanges.subscribe(() => this.load());
  }

  resetFilters(): void {
    const defaultClass = this.classNames[0] ?? '';
    this.form.reset({ date: new Date(), className: defaultClass });
    this.rows = [];
    if (defaultClass) this.load();
  }

  load(): void {
    const className = this.form.controls.className.value;
    const date = this.form.controls.date.value;
    if (!className || !date) return;
    this.loading = true;
    this.lookup.findClassByName(className).pipe(
      switchMap(schoolClass => {
        this.currentClass = schoolClass ?? null;
        if (!schoolClass?.id) return of([] as AttendanceRecord[]);
        return this.attendanceApi.getStudentAttendance(schoolClass.academicStageId ?? 0, schoolClass.id, this.isoDate(date));
      })
    ).subscribe({
      next: (data) => {
        this.rows = data.map(r => ({ id: r.personId, studentName: r.personName, status: this.normalizeStatus(r.status) }));
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
    this.rows = [...this.rows];
  }

  statusClass(status: string): string {
    switch (status) {
      case 'PRESENT': return 'status-present';
      case 'ABSENT': return 'status-absent';
      case 'LATE': return 'status-late';
      default: return '';
    }
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
      status: r.status
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
