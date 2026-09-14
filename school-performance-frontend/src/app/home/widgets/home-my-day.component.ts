import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { AttendanceApiService, TeacherAttendanceScope } from '../../attendance/services/attendance-api.service';
import { ScheduleApiService } from '../../class-schedule/services/schedule-api.service';
import { AttendanceRecord, ClassScheduleEntry } from '../../core/models';
import { ATTENDANCE_STATUS_LABELS } from '../../shared/constants/labels';

const DAY_KEYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/**
 * Personal widget for accounts linked to a teacher (teachers and department heads):
 * today's lessons from the timetable and today's attendance within the user's scope.
 */
@Component({
  selector: 'app-home-my-day',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="my-day">
      @if (canSchedule) {
        <mat-card class="day-card">
          <div class="card-head"><h3><mat-icon>calendar_view_day</mat-icon> حصصي اليوم</h3><a mat-button routerLink="/class-schedule">الجدول</a></div>
          @if (loading) { <div class="sk"><span class="skeleton line"></span><span class="skeleton line"></span></div> }
          @else if (isWeekend) { <p class="muted"><mat-icon>weekend</mat-icon> اليوم عطلة نهاية الأسبوع</p> }
          @else if (!lessons.length) { <p class="muted">لا توجد حصص لك اليوم</p> }
          @else {
            <ul class="lessons">
              @for (l of lessons; track l.id) {
                <li [style.--subj]="l.subjectColor || '#5c6bc0'"><span class="period">{{ l.period }}</span><span class="lesson-text"><strong>{{ l.subject }}</strong><small>فصل {{ l.className }}@if (l.room) { · {{ l.room }} }</small></span></li>
              }
            </ul>
          }
        </mat-card>
      }
      @if (canAttendance) {
        <mat-card class="day-card">
          <div class="card-head"><h3><mat-icon>fingerprint</mat-icon> {{ scope?.scope === 'DEPARTMENT' ? 'حضور معلمي القسم اليوم' : 'حضوري اليوم' }}</h3><a mat-button routerLink="/attendance/teachers">التفاصيل</a></div>
          @if (loading) { <div class="sk"><span class="skeleton line"></span><span class="skeleton line"></span></div> }
          @else if (scope?.scope === 'SELF' && mine) {
            <div class="self-row">
              <span class="chip" [class]="'chip ' + chip(mine.status)">{{ labels[mine.status] || mine.status }}</span>
              <span class="times"><span matTooltip="وقت الحضور"><mat-icon>login</mat-icon> {{ mine.checkInTime || '—' }}</span><span matTooltip="وقت التواجد"><mat-icon>schedule</mat-icon> {{ mine.presenceTime || '—' }}</span><span matTooltip="وقت الانصراف"><mat-icon>logout</mat-icon> {{ mine.checkOutTime || '—' }}</span></span>
            </div>
          }
          @else if (scope?.scope === 'DEPARTMENT') {
            <div class="dept-counts">
              <span class="chip success">حاضر {{ count('PRESENT') }}</span><span class="chip warning">متأخر {{ count('LATE') }}</span>
              <span class="chip danger">غائب {{ count('ABSENT') }}</span><span class="chip info">مستأذن {{ count('EXCUSED') }}</span><span class="chip neutral">غير مسجّل {{ count('NOT_RECORDED') }}</span>
            </div>
          }
          @else { <p class="muted">لا توجد بيانات</p> }
        </mat-card>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .my-day { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; }
    .day-card { padding: 1rem 1.25rem; }
    .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; h3 { margin: 0; font-size: 1rem; color: var(--sp-primary); display: flex; align-items: center; gap: 0.4rem; mat-icon { font-size: 20px; width: 20px; height: 20px; } } }
    .muted { color: var(--sp-text-muted); margin: 0.5rem 0; font-size: 0.9rem; display: flex; align-items: center; gap: 0.35rem; mat-icon { font-size: 18px; width: 18px; height: 18px; } }
    .sk { display: flex; flex-direction: column; gap: 0.5rem; .line { height: 14px; width: 70%; display: block; } }
    .lessons { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .lessons li { --subj: #5c6bc0; display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.6rem; border-radius: 8px; background: color-mix(in srgb, var(--subj) 10%, #fff); border-inline-start: 4px solid var(--subj); }
    .period { width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--subj); color: #fff; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
    .lesson-text { display: flex; flex-direction: column; line-height: 1.25; strong { font-size: 0.9rem; } small { font-size: 0.75rem; color: var(--sp-text-muted); } }
    .self-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; padding: 0.35rem 0; }
    .times { display: inline-flex; gap: 0.9rem; font-variant-numeric: tabular-nums; direction: ltr; span { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.88rem; } mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--sp-text-faint); } }
    .dept-counts { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.35rem 0; }
  `]
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
