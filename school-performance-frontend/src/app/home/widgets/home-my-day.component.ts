import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { AttendanceApiService, TeacherAttendanceScope } from '../../attendance/services/attendance-api.service';
import { ScheduleApiService } from '../../class-schedule/services/schedule-api.service';
import { AttendanceRecord, ClassScheduleEntry } from '../../core/models';
import { ATTENDANCE_STATUS_LABELS } from '../../shared/constants/labels';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

const DAY_KEYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/**
 * Personal widget for accounts linked to a teacher (teachers and department heads):
 * today's lessons from the timetable and today's attendance within the user's scope.
 */
@Component({
  selector: 'app-home-my-day',
  standalone: true,
  imports: [UiIconComponent, RouterLink, MatCardModule, MatButtonModule, MatTooltipModule],
  host: { class: 'block' },
  template: `
    <div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
      @if (canSchedule) {
        <mat-card class="px-5 py-4">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="m-0 flex items-center gap-1.5 text-base text-primary"><app-ui-icon name="calendar_view_day" class="size-5 text-[20px]"></app-ui-icon> حصصي اليوم</h3>
            <a mat-button routerLink="/class-schedule">الجدول</a>
          </div>
          @if (loading) {
            <div class="flex flex-col gap-2"><span class="skeleton block h-3.5 w-[70%]"></span><span class="skeleton block h-3.5 w-[70%]"></span></div>
          } @else if (isWeekend) {
            <p class="my-2 flex items-center gap-[0.35rem] text-[0.9rem] text-muted"><app-ui-icon name="weekend" class="size-[18px] text-[18px]"></app-ui-icon> اليوم عطلة نهاية الأسبوع</p>
          } @else if (!lessons.length) {
            <p class="my-2 text-[0.9rem] text-muted">لا توجد حصص لك اليوم</p>
          } @else {
            <ul class="m-0 flex list-none flex-col gap-[0.35rem] p-0">
              @for (l of lessons; track l.id) {
                <li class="flex items-center gap-[0.6rem] rounded-lg bg-[color-mix(in_srgb,var(--subj)_10%,white)] py-[0.4rem] ps-[0.6rem] pe-[0.6rem] border-s-4" [style.--subj]="l.subjectColor || '#5c6bc0'" [style.border-inline-start-color]="l.subjectColor || '#5c6bc0'">
                  <span class="inline-flex size-[26px] shrink-0 items-center justify-center rounded-full text-[0.8rem] font-bold text-white" [style.background]="l.subjectColor || '#5c6bc0'">{{ l.period }}</span>
                  <span class="flex flex-col leading-tight">
                    <strong class="text-[0.9rem]">{{ l.subject }}</strong>
                    <small class="text-xs text-muted">فصل {{ l.className }}@if (l.room) { · {{ l.room }} }</small>
                  </span>
                </li>
              }
            </ul>
          }
        </mat-card>
      }
      @if (canAttendance) {
        <mat-card class="px-5 py-4">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="m-0 flex items-center gap-1.5 text-base text-primary"><app-ui-icon name="fingerprint" class="size-5 text-[20px]"></app-ui-icon> {{ scope?.scope === 'DEPARTMENT' ? 'حضور معلمي الشعبة اليوم' : 'حضوري اليوم' }}</h3>
            <a mat-button routerLink="/attendance/teachers">التفاصيل</a>
          </div>
          @if (loading) {
            <div class="flex flex-col gap-2"><span class="skeleton block h-3.5 w-[70%]"></span><span class="skeleton block h-3.5 w-[70%]"></span></div>
          } @else if (scope?.scope === 'SELF' && mine) {
            <div class="flex flex-wrap items-center gap-3 py-[0.35rem]">
              <span class="chip" [class]="'chip ' + chip(mine.status)">{{ labels[mine.status] || mine.status }}</span>
              <span class="inline-flex gap-[0.9rem] font-variant-numeric:tabular-nums" dir="ltr">
                <span class="inline-flex items-center gap-1 text-[0.88rem]" matTooltip="وقت الحضور"><app-ui-icon name="login" class="size-4 text-[16px] text-faint"></app-ui-icon> {{ mine.checkInTime || '—' }}</span>
                <span class="inline-flex items-center gap-1 text-[0.88rem]" matTooltip="وقت التواجد"><app-ui-icon name="schedule" class="size-4 text-[16px] text-faint"></app-ui-icon> {{ mine.presenceTime || '—' }}</span>
                <span class="inline-flex items-center gap-1 text-[0.88rem]" matTooltip="وقت الانصراف"><app-ui-icon name="logout" class="size-4 text-[16px] text-faint"></app-ui-icon> {{ mine.checkOutTime || '—' }}</span>
              </span>
            </div>
          } @else if (scope?.scope === 'DEPARTMENT') {
            <div class="flex flex-wrap gap-1.5 py-[0.35rem]">
              <span class="chip success">حاضر {{ count('PRESENT') }}</span><span class="chip warning">متأخر {{ count('LATE') }}</span>
              <span class="chip danger">غائب {{ count('ABSENT') }}</span><span class="chip info">مستأذن {{ count('EXCUSED') }}</span><span class="chip neutral">غير مسجّل {{ count('NOT_RECORDED') }}</span>
            </div>
          } @else {
            <p class="my-2 text-[0.9rem] text-muted">لا توجد بيانات</p>
          }
        </mat-card>
      }
    </div>
  `
})
export class HomeMyDayComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly attendance = inject(AttendanceApiService);
  private readonly schedule = inject(ScheduleApiService);

  readonly labels: Record<string, string> = { ...ATTENDANCE_STATUS_LABELS, NOT_RECORDED: 'غير مسجّل' };
  loading = true;
  lessons: ClassScheduleEntry[] = [];
  records: AttendanceRecord[] = [];
  scope: TeacherAttendanceScope | null = null;
  mine: AttendanceRecord | null = null;

  get teacherId(): number | null { return this.auth.user()?.teacherId ?? null; }
  get canSchedule(): boolean { return !!this.teacherId && ['my_classes.view', 'class_schedule.view', 'class_schedule.manage'].some(p => this.auth.hasPermission(p)); }
  get canAttendance(): boolean { return this.auth.hasPermission('teacher_attendance.view') && !this.auth.hasPermission('attendance.view'); }
  get isWeekend(): boolean { const d = new Date().getDay(); return d === 5 || d === 6; }

  ngOnInit(): void {
    const today = new Date();
    const dayKey = DAY_KEYS[today.getDay()];
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    forkJoin({
      lessons: this.canSchedule && this.teacherId ? this.schedule.getEntries({ teacherId: this.teacherId }).pipe(catchError(() => of([] as ClassScheduleEntry[]))) : of([] as ClassScheduleEntry[]),
      scope: this.canAttendance ? this.attendance.getTeacherScope().pipe(catchError(() => of(null))) : of(null),
      records: this.canAttendance ? this.attendance.getTeacherAttendance(iso).pipe(catchError(() => of([] as AttendanceRecord[]))) : of([] as AttendanceRecord[])
    }).subscribe(r => {
      this.lessons = r.lessons.filter(l => l.dayOfWeek === dayKey).sort((a, b) => a.period - b.period);
      this.scope = r.scope;
      this.records = r.records;
      this.mine = r.records.find(x => x.personId === this.teacherId) ?? r.records[0] ?? null;
      this.loading = false;
    });
  }

  count(status: string): number { return this.records.filter(r => r.status === status).length; }
  chip(status: string): string { return status === 'PRESENT' ? 'success' : status === 'LATE' ? 'warning' : status === 'ABSENT' ? 'danger' : status === 'NOT_RECORDED' ? 'neutral' : 'info'; }
}
