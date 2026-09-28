import { NgClass } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { AttendanceApiService } from '../services/attendance-api.service';
import { AttendancePdfData, AttendancePdfService } from '../services/attendance-pdf.service';
import { AcademicStageApiService } from '../../academic-stages/services/academic-stage-api.service';
import { SchoolClassApiService } from '../../school-classes/services/school-class-api.service';
import { ATTENDANCE_STATUS_LABELS } from '../../shared/constants/labels';
import { AcademicStage, AttendanceRecord, SchoolClass } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';
import { AuthService } from '../../core/services/auth.service';
import { HomeClassScheduleComponent, TimetableSlotKind, TimetableSlotPick } from '../../home/widgets/home-class-schedule.component';
import { ASSEMBLY_VIOLATIONS, BehaviorMockService } from '../../behavior/services/behavior-mock.service';
import { periodRange } from '../../core/constants/bell-schedule';
import { forkJoin, Observable } from 'rxjs';

@Component({
  selector: 'app-student-attendance-page',
  standalone: true,
  imports: [NgClass, UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule, MatButtonToggleModule, MatTooltipModule, MatTableModule, MatProgressSpinnerModule, MatDatepickerModule, MatCardModule, PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe, HomeClassScheduleComponent],
  templateUrl: './student-attendance-page.component.html',
  styles: [`
    .student-att-filters {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
    }
    .student-att-filters .filter-field {
      flex: 1 1 0;
      min-width: 0;
      margin: 0;
    }
    .student-att-filters__actions {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 0.5rem;
      margin-inline-start: auto;
    }
    .violation-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      border: 0;
      border-radius: 999px;
      background: transparent;
      padding: 0.28rem 0.75rem;
      color: var(--color-muted);
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1.4;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .violation-pill:hover { background: #e9ebf3; }
    .violation-pill[data-tone="late"],
    .violation-pill[data-tone="late"]:hover { background: var(--color-warning); color: #fff; }
    .violation-pill[data-tone="hair"],
    .violation-pill[data-tone="hair"]:hover { background: #7c3aed; color: #fff; }
    .violation-pill[data-tone="uniform"],
    .violation-pill[data-tone="uniform"]:hover { background: #2563eb; color: #fff; }
    .violation-pill[data-tone="talk"],
    .violation-pill[data-tone="talk"]:hover { background: #0891b2; color: #fff; }
    .violation-pill[data-tone="flag"],
    .violation-pill[data-tone="flag"]:hover { background: var(--color-success); color: #fff; }
    .violation-pill[data-tone="assembly"],
    .violation-pill[data-tone="assembly"]:hover { background: var(--color-danger); color: #fff; }
  `]
})
export class StudentAttendancePageComponent implements OnInit {
  @ViewChild('pdfExportRoot') pdfExportRoot?: ElementRef<HTMLElement>;

  private readonly fb = inject(FormBuilder);
  private readonly attendanceService = inject(AttendanceApiService);
  private readonly pdfService = inject(AttendancePdfService);
  private readonly stageService = inject(AcademicStageApiService);
  private readonly classService = inject(SchoolClassApiService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly behavior = inject(BehaviorMockService);
  private readonly datePipe = new AppDatePipe();
  private pendingClassId: number | null = null;
  private readonly selectedViolations = new Map<number, string[]>();

  readonly isWingSupervisor = this.auth.hasAnyRole(['WING_SUPERVISOR']);
  readonly violations = ASSEMBLY_VIOLATIONS;
  readonly statusLabels = ATTENDANCE_STATUS_LABELS;
  readonly statusOptions = ['PRESENT', 'ABSENT', 'LATE'] as const;
  activeClassId: number | null = null;
  sheetMode: TimetableSlotKind = 'daily';
  activePeriod: number | null = null;
  activeSubject = '';
  activeTeacher = '';

  stages: AcademicStage[] = [];
  classes: SchoolClass[] = [];
  studentRecords: AttendanceRecord[] = [];
  loadingStudents = false;
  exportingStudentsPdf = false;

  studentCols = ['personName', 'status'];

  get sheetTitle(): string {
    const className = this.classes.find(c => c.id === this.studentFilters.controls.classId.value)?.name ?? '';
    const suffix = className ? ` — ${className}` : '';
    if (this.sheetMode === 'assembly') return `مخالفات طابور الصباح${suffix}`;
    if (this.sheetMode === 'period' && this.activePeriod) {
      const range = periodRange(this.activePeriod);
      const subject = this.activeSubject ? ` · ${this.activeSubject}` : '';
      const teacher = this.activeTeacher ? ` · ${this.activeTeacher}` : '';
      return `حضور الحصة ${this.activePeriod}${range ? ' (' + range + ')' : ''}${subject}${teacher}${suffix}`;
    }
    return `الحضور اليومي${suffix}`;
  }

  private applyColumns(): void {
    if (this.sheetMode === 'assembly') this.studentCols = ['personName', 'violations'];
    else if (this.sheetMode === 'period') this.studentCols = ['personName', 'status', 'wingSupervisor'];
    else this.studentCols = ['personName', 'status'];
  }

  get saveLabel(): string {
    if (this.sheetMode === 'assembly') return 'حفظ المخالفات';
    if (this.sheetMode === 'period') return 'حفظ حضور الحصة';
    return 'حفظ الحضور';
  }

  studentFilters = this.fb.group({
    date: [new Date()],
    stageId: [null as number | null],
    classId: [null as number | null]
  });


  ngOnInit(): void {
    this.stageService.getAll().subscribe(s => this.stages = s);
    this.studentFilters.controls.date.valueChanges.subscribe(() => {
      const { stageId, classId } = this.studentFilters.getRawValue();
      if (stageId && classId && this.studentRecords.length) this.loadStudents();
    });
    this.studentFilters.controls.stageId.valueChanges.subscribe(stageId => {
      this.studentFilters.controls.classId.setValue(null, { emitEvent: false });
      this.classes = [];
      const wanted = this.pendingClassId;
      this.pendingClassId = null;
      if (stageId) {
        this.classService.getByStage(stageId).subscribe(c => {
          this.classes = c;
          if (wanted && c.some(item => item.id === wanted)) {
            this.studentFilters.controls.classId.setValue(wanted, { emitEvent: false });
            this.loadStudents();
          }
        });
      }
    });
  }

  openSlot(pick: TimetableSlotPick): void {
    if (!pick.stageId) {
      this.toast.info('تعذر تحديد مرحلة هذا الفصل');
      return;
    }
    this.sheetMode = pick.kind;
    this.applyColumns();
    this.activePeriod = pick.kind === 'period' ? (pick.period ?? null) : null;
    this.activeSubject = pick.subject ?? '';
    this.activeTeacher = pick.teacher ?? '';
    this.activeClassId = pick.classId;
    const sameStage = this.studentFilters.controls.stageId.value === pick.stageId
      && this.classes.some(item => item.id === pick.classId);
    if (sameStage) {
      this.studentFilters.controls.classId.setValue(pick.classId, { emitEvent: false });
      this.loadStudents();
    } else {
      this.pendingClassId = pick.classId;
      this.studentFilters.controls.stageId.setValue(pick.stageId);
    }
  }

  showFromFilters(): void {
    this.sheetMode = 'daily';
    this.applyColumns();
    this.activePeriod = null;
    this.activeSubject = '';
    this.activeTeacher = '';
    this.loadStudents();
  }

  private formatDate(d: Date | null): string {
    const date = d instanceof Date ? d : d ? new Date(d) : new Date();
    if (isNaN(date.getTime())) {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  loadStudents(): void {
    const { stageId, classId, date } = this.studentFilters.getRawValue();
    if (!stageId || !classId) {
      this.toast.info('اختر المرحلة والفصل');
      return;
    }
    const period = this.sheetMode === 'period' ? (this.activePeriod ?? 0) : 0;
    this.loadingStudents = true;
    this.attendanceService.getStudentAttendance(stageId, classId, this.formatDate(date), period).subscribe({
      next: (data) => {
        this.studentRecords = data.map(r => ({ ...r, status: this.normalizeStatus(r.status), period }));
        if (this.sheetMode === 'assembly') this.captureViolations();
        this.loadingStudents = false;
        queueMicrotask(() => document.getElementById('student-attendance-sheet')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      },
      error: (e) => { this.loadingStudents = false; this.toast.fromError(e); }
    });
  }


  hasViolation(studentId: number, code: string): boolean {
    return (this.selectedViolations.get(studentId) ?? []).includes(code);
  }

  violationTone(studentId: number, code: string): string | null {
    if (!this.hasViolation(studentId, code)) return null;
    return this.violations.find(item => item.code === code)?.tone ?? null;
  }

  toggleViolation(studentId: number, code: string): void {
    const next = new Set(this.selectedViolations.get(studentId) ?? []);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    this.selectedViolations.set(studentId, [...next]);
  }

  setStatus(record: AttendanceRecord, status: string): void {
    record.status = this.normalizeStatus(status);
    this.studentRecords = [...this.studentRecords];
  }

  private normalizeStatus(status: string): AttendanceRecord['status'] {
    if (status === 'LATE') return 'LATE';
    if (status === 'ABSENT' || status === 'EXCUSED') return 'ABSENT';
    return 'PRESENT';
  }

  statusChip(status: string): 'success' | 'danger' | 'warning' | 'info' {
    switch (status) {
      case 'PRESENT': return 'success';
      case 'ABSENT': return 'danger';
      case 'LATE': return 'warning';
      default: return 'info';
    }
  }

  countByStatus(records: AttendanceRecord[], status: string): number {
    return records.filter(r => r.status === status).length;
  }

  saveStudents(): void {
    if (this.sheetMode === 'assembly') {
      this.saveViolations();
      return;
    }
    const period = this.sheetMode === 'period' ? (this.activePeriod ?? 0) : 0;
    if (this.sheetMode === 'period' && !period) return;
    const records = this.studentRecords.map(r => ({ ...r, period, periodMarks: undefined }));
    this.attendanceService.saveStudentAttendance(records).subscribe({
      next: () => {
        this.toast.success(period > 0 ? 'تم حفظ حضور الحصة' : 'تم حفظ الحضور اليومي');
        if (period > 0) this.loadStudents();
      },
      error: (e) => this.toast.fromError(e)
    });
  }

  private captureViolations(): void {
    const date = this.formatDate(this.studentFilters.controls.date.value);
    this.behavior.getAll().subscribe(notes => {
      this.selectedViolations.clear();
      for (const row of this.studentRecords) {
        const codes = notes
          .filter(n => n.source === 'ASSEMBLY' && n.studentId === row.personId && n.noteDate === date && !!n.code)
          .map(n => n.code!);
        this.selectedViolations.set(row.personId, codes);
      }
    });
  }

  private saveViolations(): void {
    const date = this.formatDate(this.studentFilters.controls.date.value);
    const recordedBy = this.auth.user()?.fullName || this.auth.user()?.username || '';
    this.behavior.getAll().subscribe(notes => {
      const ops: Observable<unknown>[] = [];
      for (const row of this.studentRecords) {
        const wanted = new Set(this.selectedViolations.get(row.personId) ?? []);
        const existing = notes.filter(n => n.source === 'ASSEMBLY' && n.studentId === row.personId && n.noteDate === date);
        for (const note of existing) {
          if (note.id != null && (!note.code || !wanted.has(note.code))) ops.push(this.behavior.delete(note.id));
        }
        const have = new Set(existing.map(n => n.code).filter((code): code is string => !!code));
        for (const code of wanted) {
          if (have.has(code)) continue;
          const label = this.violations.find(item => item.code === code)?.label ?? code;
          ops.push(this.behavior.create({
            studentId: row.personId,
            studentName: row.personName,
            type: 'WARNING',
            description: label,
            noteDate: date,
            recordedBy,
            code,
            source: 'ASSEMBLY'
          }));
        }
      }
      if (!ops.length) {
        this.toast.success('تم حفظ مخالفات الطابور');
        return;
      }
      forkJoin(ops).subscribe({
        next: () => this.toast.success('تم حفظ مخالفات الطابور'),
        error: (e: unknown) => this.toast.fromError(e)
      });
    });
  }


  resetStudentFilters(): void {
    this.studentRecords = [];
    this.studentFilters.reset({ date: new Date(), stageId: null, classId: null });
    this.classes = [];
    this.sheetMode = 'daily';
    this.applyColumns();
    this.activeClassId = null;
    this.activePeriod = null;
    this.activeSubject = '';
    this.activeTeacher = '';
  }


  exportStudentsPdf(): void {
    if (!this.studentRecords.length) {
      this.toast.info('اعرض سجل الحضور أولاً');
      return;
    }
    const { date, stageId, classId } = this.studentFilters.getRawValue();
    const stageName = this.stages.find(s => s.id === stageId)?.name ?? '';
    const className = this.classes.find(c => c.id === classId)?.name ?? '';
    const isoDate = this.formatDate(date);
    this.exportPdf(this.buildStudentPdfData(stageName, className, isoDate));
  }


  private buildStudentPdfData(stageName: string, className: string, date: string): AttendancePdfData {
    return {
      title: 'تقرير حضور المتعلمين',
      date,
      subtitle: `${this.datePipe.transform(date)} — المرحلة: ${stageName} — الفصل: ${className}`,
      columns: [
        { key: 'personName', label: 'اسم المتعلم' },
        { key: 'className', label: 'الفصل' },
        { key: 'status', label: 'الحالة' }
      ],
      rows: this.studentRecords.map(r => ({
        personName: r.personName,
        className: r.className ?? '—',
        status: this.statusLabels[r.status] ?? r.status
      })),
      summary: this.buildSummary(this.studentRecords)
    };
  }


  private buildSummary(records: AttendanceRecord[]): { label: string; value: string }[] {
    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    for (const r of records) {
      if (r.status in counts) counts[r.status as keyof typeof counts]++;
    }
    return [
      { label: 'حاضر', value: String(counts.PRESENT) },
      { label: 'غائب', value: String(counts.ABSENT) },
      { label: 'متأخر', value: String(counts.LATE) },
      { label: 'الإجمالي', value: String(records.length) }
    ];
  }

  private exportPdf(data: AttendancePdfData): void {
    const root = this.pdfExportRoot?.nativeElement;
    if (!root) {
      this.toast.error('فشل تجهيز التصدير');
      return;
    }

    this.exportingStudentsPdf = true;

    root.innerHTML = this.pdfService.buildExportHtml(data);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.pdfService.export(root, data)
          .then(() => this.toast.success('تم تنزيل تقرير حضور المتعلمين PDF'))
          .catch((err: Error) => {
            console.error('Attendance PDF export failed:', err);
            try {
              this.pdfService.exportViaPrint(data);
              this.toast.info('تم فتح نافذة الطباعة — اختر "حفظ كـ PDF"');
            } catch (printErr) {
              this.toast.error(printErr instanceof Error ? printErr.message : 'فشل تصدير PDF');
            }
          })
          .finally(() => {
            root.innerHTML = '';
            root.style.width = '';
            root.style.maxWidth = '';
            this.exportingStudentsPdf = false;
          });
      });
    });
  }
}
