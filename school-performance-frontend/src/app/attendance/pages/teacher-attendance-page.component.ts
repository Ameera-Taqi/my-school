import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { forkJoin } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { AttendanceApiService, TeacherAttendanceScope } from '../services/attendance-api.service';
import { AttendancePdfData, AttendancePdfService } from '../services/attendance-pdf.service';
import { ATTENDANCE_STATUS_LABELS } from '../../shared/constants/labels';
import { AttendanceRecord } from '../../core/models';

interface TeacherMonthRow {
  teacherId: number;
  teacherName: string;
  departmentName?: string;
  recorded: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  /** total recorded presence in minutes */
  presenceMinutes: number;
  rate: number | null;
}

@Component({
  selector: 'app-teacher-attendance-page',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule, MatMenuModule,
    MatIconModule, MatTooltipModule, MatTableModule, MatProgressSpinnerModule, MatDatepickerModule, MatCardModule, MatTabsModule,
    PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent, AppDatePipe
  ],
  templateUrl: './teacher-attendance-page.component.html',
  styleUrl: './teacher-attendance-page.component.scss'
})
export class TeacherAttendancePageComponent implements OnInit {
  @ViewChild('pdfExportRoot') pdfExportRoot?: ElementRef<HTMLElement>;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AttendanceApiService);
  private readonly pdfService = inject(AttendancePdfService);
  private readonly toast = inject(ToastService);

  /** Toggle options (a teacher is marked present/late only when a punch time exists). */
  readonly statusOptions = Object.keys(ATTENDANCE_STATUS_LABELS);
  readonly statusLabels: Record<string, string> = { ...ATTENDANCE_STATUS_LABELS, NOT_RECORDED: 'غير مسجّل' };

  scope: TeacherAttendanceScope | null = null;
  records: AttendanceRecord[] = [];
  history: AttendanceRecord[] = [];
  monthRows: TeacherMonthRow[] = [];
  loading = true;
  loadingHistory = false;
  exporting = false;

  dayCols: string[] = [];
  monthCols: string[] = [];

  filters = this.fb.group({ date: [new Date()] });
  /** Official start of the working day; a check-in after it is marked late automatically. Remembered per browser. */
  schoolStart = this.loadSchoolStart();
  readonly manualStatuses: { key: AttendanceRecord['status']; label: string; hint: string }[] = [
    { key: 'PRESENT', label: 'حاضر', hint: 'يتطلب وقت حضور' },
    { key: 'LATE', label: 'متأخر', hint: 'يتطلب وقت حضور' },
    { key: 'ABSENT', label: 'غائب', hint: 'يمسح الأوقات المسجّلة' },
    { key: 'EXCUSED', label: 'مستأذن', hint: 'غياب بعذر' }
  ];
  monthFilter = this.fb.nonNullable.group({ month: [this.currentMonth()] });

  get title(): string {
    switch (this.scope?.scope) {
      case 'DEPARTMENT': return `حضور معلمي ${this.scope.departmentName ?? 'القسم'}`;
      case 'SELF': return 'حضوري وانصرافي';
      case 'ALL': return 'حضور وانصراف المعلمين';
      default: return 'حضور المعلمين';
    }
  }

  get subtitle(): string {
    switch (this.scope?.scope) {
      case 'DEPARTMENT': return `تظهر لك سجلات معلمي قسمك فقط (${this.scope.teachersCount} معلم)`;
      case 'SELF': return 'تظهر لك سجلات حضورك أنت فقط';
      case 'ALL': return this.scope?.canRecord ? 'تسجيل ومتابعة حضور جميع المعلمين' : 'متابعة حضور جميع المعلمين';
      default: return 'لا يوجد نطاق عرض لحسابك';
    }
  }

  get canRecord(): boolean { return !!this.scope?.canRecord; }
  get isSelf(): boolean { return this.scope?.scope === 'SELF'; }

  ngOnInit(): void {
    this.api.getTeacherScope().subscribe({
      next: (scope) => {
        this.scope = scope;
        this.dayCols = scope.scope === 'ALL' ? ['personName', 'department', 'status', 'checkIn', 'presence', 'checkOut', 'actions'] : ['personName', 'status', 'checkIn', 'presence', 'checkOut', 'actions'];
        this.monthCols = scope.scope === 'SELF' ? ['date', 'status', 'checkIn', 'presence', 'checkOut', 'hours'] : ['teacherName', 'recorded', 'present', 'absent', 'late', 'excused', 'presenceTotal', 'rate'];
        this.loadDay();
        this.loadMonth();
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  loadDay(): void {
    this.loading = true;
    this.api.getTeacherAttendance(this.formatDate(this.filters.controls.date.value)).subscribe({
      next: (data) => { this.records = data; this.loading = false; },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  loadMonth(): void {
    this.loadingHistory = true;
    this.api.getTeacherHistory(this.monthFilter.controls.month.value).subscribe({
      next: (rows) => { this.history = rows; this.monthRows = this.aggregate(rows); this.loadingHistory = false; },
      error: (e) => { this.loadingHistory = false; this.toast.fromError(e); }
    });
  }

  resetFilters(): void {
    this.filters.reset({ date: new Date() });
    this.loadDay();
  }

  setStatus(record: AttendanceRecord, status: string): void {
    if (!this.canRecord) return;
    if ((status === 'PRESENT' || status === 'LATE') && !record.checkInTime) {
      this.toast.error('سجّل وقت الحضور (البصمة) أولاً قبل اختيار حاضر أو متأخر');
      this.records = [...this.records]; // re-render keeps the toggle on the previous value
      return;
    }
    record.status = status as AttendanceRecord['status'];
    if (status === 'ABSENT') { record.checkInTime = null; record.presenceTime = null; record.checkOutTime = null; record.presenceMinutes = null; }
    this.records = [...this.records];
  }

  setTime(record: AttendanceRecord, field: 'checkInTime' | 'presenceTime' | 'checkOutTime', value: string): void {
    if (!this.canRecord) return;
    record[field] = value || null;
    record.presenceMinutes = this.presenceOf(record);
    // A punch turns an unrecorded/absent teacher into present or late (compared with the school start time);
    // removing the check-in drops present/late back to unrecorded.
    if (field === 'checkInTime' && value && (record.status === 'NOT_RECORDED' || record.status === 'ABSENT' || record.status === 'PRESENT' || record.status === 'LATE')) {
      record.status = this.isLate(value) ? 'LATE' : 'PRESENT';
    } else if (value && (record.status === 'NOT_RECORDED' || record.status === 'ABSENT')) {
      record.status = 'PRESENT';
    }
    if (field === 'checkInTime' && !value && (record.status === 'PRESENT' || record.status === 'LATE')) record.status = 'NOT_RECORDED';
    this.records = [...this.records];
  }

  /** Fill a time field with the current clock time (one-click punch). */
  punchNow(record: AttendanceRecord, field: 'checkInTime' | 'presenceTime' | 'checkOutTime'): void {
    const d = new Date();
    this.setTime(record, field, `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
  }

  isLate(checkIn: string): boolean {
    if (!this.schoolStart) return false;
    const m = (t: string) => { const [h, mm] = t.split(':').map(Number); return h * 60 + mm; };
    return m(checkIn) > m(this.schoolStart);
  }

  setSchoolStart(value: string): void {
    this.schoolStart = value || '';
    try { localStorage.setItem('sp_school_start', this.schoolStart); } catch { /* ignore */ }
  }

  statusDisabled(record: AttendanceRecord, key: string): boolean {
    return (key === 'PRESENT' || key === 'LATE') && !record.checkInTime;
  }

  private loadSchoolStart(): string {
    try { return localStorage.getItem('sp_school_start') ?? '07:30'; } catch { return '07:30'; }
  }

  /** Same rule as the server: minutes between check-in and check-out when both exist. */
  presenceOf(r: AttendanceRecord): number | null {
    if (!r.checkInTime || !r.checkOutTime) return null;
    const [h1, m1] = r.checkInTime.split(':').map(Number);
    const [h2, m2] = r.checkOutTime.split(':').map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    return diff > 0 ? diff : null;
  }

  formatMinutes(minutes: number | null | undefined): string {
    if (minutes == null || minutes === 0) return '—';
    const h = Math.floor(minutes / 60); const m = minutes % 60;
    if (h && m) return `${h} س ${m} د`;
    if (h) return `${h} س`;
    return `${m} د`;
  }

  hasTimeError(r: AttendanceRecord): boolean {
    return !!r.checkInTime && !!r.checkOutTime && this.presenceOf(r) === null;
  }

  /** Presence check must fall between check-in and check-out when those exist. */
  hasPresenceError(r: AttendanceRecord): boolean {
    if (!r.presenceTime) return false;
    const m = (t: string) => { const [h, mm] = t.split(':').map(Number); return h * 60 + mm; };
    const p = m(r.presenceTime);
    if (r.checkInTime && p < m(r.checkInTime)) return true;
    if (r.checkOutTime && p > m(r.checkOutTime)) return true;
    return false;
  }

  save(): void {
    if (!this.canRecord) return;
    if (this.records.some(r => this.hasTimeError(r))) { this.toast.error('وقت الانصراف يجب أن يكون بعد وقت الحضور'); return; }
    if (this.records.some(r => this.hasPresenceError(r))) { this.toast.error('وقت التواجد يجب أن يكون بين وقت الحضور ووقت الانصراف'); return; }
    const missingPunch = this.records.find(r => (r.status === 'PRESENT' || r.status === 'LATE') && !r.checkInTime);
    if (missingPunch) { this.toast.error(`${missingPunch.personName}: لا يمكن تسجيل حاضر/متأخر بدون وقت حضور`); return; }
    this.api.saveTeacherAttendance(this.records).subscribe({
      next: () => { this.toast.success('تم حفظ حضور المعلمين'); this.loadMonth(); },
      error: (e) => this.toast.fromError(e)
    });
  }

  statusChip(status: string): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
    switch (status) {
      case 'PRESENT': return 'success';
      case 'ABSENT': return 'danger';
      case 'LATE': return 'warning';
      case 'NOT_RECORDED': return 'neutral';
      default: return 'info';
    }
  }

  statusIcon(status: string): string {
    switch (status) {
      case 'PRESENT': return 'check_circle';
      case 'ABSENT': return 'cancel';
      case 'LATE': return 'schedule';
      case 'NOT_RECORDED': return 'radio_button_unchecked';
      default: return 'event_busy';
    }
  }

  get notRecordedCount(): number { return this.records.filter(r => r.status === 'NOT_RECORDED').length; }

  countByStatus(status: string): number {
    return this.records.filter(r => r.status === status).length;
  }

  monthOptions(): { value: string; label: string }[] {
    const out: { value: string; label: string }[] = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      const y = d.getFullYear(); const m = d.getMonth() + 1;
      out.push({ value: `${y}-${String(m).padStart(2, '0')}`, label: new Intl.DateTimeFormat('ar-u-nu-latn', { month: 'long', year: 'numeric' }).format(d) });
      d.setMonth(d.getMonth() - 1);
    }
    return out;
  }

  exportPdf(): void {
    if (!this.records.length) { this.toast.info('لا توجد سجلات لتصديرها'); return; }
    const data: AttendancePdfData = {
      title: this.title,
      date: this.formatDate(this.filters.controls.date.value),
      subtitle: this.scope?.scope === 'DEPARTMENT' ? `القسم: ${this.scope.departmentName ?? ''}` : undefined,
      columns: [{ key: 'personName', label: 'اسم المعلم' }, { key: 'department', label: 'القسم' }, { key: 'status', label: 'الحالة' }, { key: 'checkIn', label: 'الحضور' }, { key: 'presence', label: 'التواجد' }, { key: 'checkOut', label: 'الانصراف' }, { key: 'hours', label: 'ساعات الدوام' }],
      rows: this.records.map(r => ({ personName: r.personName, department: r.className ?? '—', status: this.statusLabels[r.status] ?? r.status, checkIn: r.checkInTime ?? '—', presence: r.presenceTime ?? '—', checkOut: r.checkOutTime ?? '—', hours: this.formatMinutes(r.presenceMinutes ?? this.presenceOf(r)) })),
      summary: this.statusOptions.map(s => ({ label: this.statusLabels[s], value: String(this.countByStatus(s)) })).concat([{ label: 'الإجمالي', value: String(this.records.length) }])
    };
    const root = this.pdfExportRoot?.nativeElement;
    if (!root) { this.toast.error('فشل تجهيز التصدير'); return; }
    this.exporting = true;
    root.innerHTML = this.pdfService.buildExportHtml(data);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.pdfService.export(root, data)
        .then(() => this.toast.success('تم تصدير PDF'))
        .catch(() => { try { this.pdfService.exportViaPrint(data); this.toast.info('تم فتح نافذة الطباعة — اختر "حفظ كـ PDF"'); } catch { this.toast.error('فشل تصدير PDF'); } })
        .finally(() => { root.innerHTML = ''; this.exporting = false; });
    }));
  }

  private aggregate(rows: AttendanceRecord[]): TeacherMonthRow[] {
    const map = new Map<number, TeacherMonthRow>();
    for (const r of rows) {
      let row = map.get(r.personId);
      if (!row) {
        row = { teacherId: r.personId, teacherName: r.personName, departmentName: r.className, recorded: 0, present: 0, absent: 0, late: 0, excused: 0, presenceMinutes: 0, rate: null };
        map.set(r.personId, row);
      }
      row.recorded++;
      row.presenceMinutes += r.presenceMinutes ?? 0;
      if (r.status === 'PRESENT') row.present++;
      else if (r.status === 'ABSENT') row.absent++;
      else if (r.status === 'LATE') row.late++;
      else if (r.status === 'EXCUSED') row.excused++;
    }
    return [...map.values()].map(r => ({ ...r, rate: r.recorded ? Math.round(((r.present + r.late) / r.recorded) * 100) : null }))
      .sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'ar'));
  }

  private currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatDate(d: Date | string | null): string {
    if (!d) return this.formatDate(new Date());
    const date = d instanceof Date ? d : new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
