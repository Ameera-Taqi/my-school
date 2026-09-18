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
import { ToastService } from '../../shared/services/toast.service';
import { AttendanceApiService } from '../services/attendance-api.service';
import { AttendancePdfData, AttendancePdfService } from '../services/attendance-pdf.service';
import { AcademicStageApiService } from '../../academic-stages/services/academic-stage-api.service';
import { SchoolClassApiService } from '../../school-classes/services/school-class-api.service';
import { ATTENDANCE_STATUS_LABELS } from '../../shared/constants/labels';
import { AcademicStage, AttendanceRecord, SchoolClass } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-student-attendance-page',
  standalone: true,
  imports: [NgClass, UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule, MatButtonToggleModule, MatTooltipModule, MatTableModule, MatProgressSpinnerModule, MatDatepickerModule, MatCardModule, PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe],
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

  readonly statusLabels = ATTENDANCE_STATUS_LABELS;
  readonly statusOptions = ['PRESENT', 'ABSENT', 'LATE'] as const;

  stages: AcademicStage[] = [];
  classes: SchoolClass[] = [];
  studentRecords: AttendanceRecord[] = [];
  loadingStudents = false;
  exportingStudentsPdf = false;

  studentCols = ['personName', 'className', 'status'];

  studentFilters = this.fb.group({
    date: [new Date()],
    stageId: [null as number | null],
    classId: [null as number | null]
  });


  ngOnInit(): void {
    this.stageService.getAll().subscribe(s => this.stages = s);
    this.studentFilters.controls.stageId.valueChanges.subscribe(stageId => {
      this.studentFilters.controls.classId.setValue(null);
      this.classes = [];
      if (stageId) {
        this.classService.getByStage(stageId).subscribe(c => this.classes = c);
      }
    });
  }

  private formatDate(d: Date | null): string {
    if (!d) return new Date().toISOString().slice(0, 10);
    return d instanceof Date ? d.toISOString().slice(0, 10) : String(d);
  }

  loadStudents(): void {
    const { stageId, classId, date } = this.studentFilters.getRawValue();
    if (!stageId || !classId) {
      this.toast.info('اختر المرحلة والفصل');
      return;
    }
    this.loadingStudents = true;
    this.attendanceService.getStudentAttendance(stageId, classId, this.formatDate(date)).subscribe({
      next: (data) => {
        this.studentRecords = data.map(r => ({ ...r, status: this.normalizeStatus(r.status) }));
        this.loadingStudents = false;
      },
      error: (e) => { this.loadingStudents = false; this.toast.fromError(e); }
    });
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
    this.attendanceService.saveStudentAttendance(this.studentRecords).subscribe({
      next: () => this.toast.success('تم حفظ حضور الطلاب'),
      error: (e) => this.toast.fromError(e)
    });
  }


  resetStudentFilters(): void {
    this.studentFilters.reset({ date: new Date(), stageId: null, classId: null });
    this.classes = [];
    this.studentRecords = [];
  }


  exportStudentsPdf(): void {
    if (!this.studentRecords.length) {
      this.toast.info('اعرض سجل الحضور أولاً');
      return;
    }
    const { date, stageId, classId } = this.studentFilters.getRawValue();
    const stageName = this.stages.find(s => s.id === stageId)?.name ?? '';
    const className = this.classes.find(c => c.id === classId)?.name ?? '';
    this.exportPdf(this.buildStudentPdfData(stageName, className, this.formatDate(date)));
  }


  private buildStudentPdfData(stageName: string, className: string, date: string): AttendancePdfData {
    return {
      title: 'سجل حضور الطلاب',
      date,
      subtitle: `المرحلة: ${stageName} — الفصل: ${className}`,
      columns: [
        { key: 'personName', label: 'اسم الطالب' },
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
          .then(() => this.toast.success('تم تصدير PDF'))
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
