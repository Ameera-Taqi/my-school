import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { ClassScheduleEntry, ScheduleDay, SchoolClass } from '../../core/models';
import { ScheduleApiService } from '../../class-schedule/services/schedule-api.service';
import { AttendanceApiService } from '../../attendance/services/attendance-api.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';
import { BELL_PERIODS, morningAssemblyRange, periodRange } from '../../core/constants/bell-schedule';
import { TeacherWeekGridComponent } from '../../teacher-portal/pages/my-lessons-page/teacher-week-grid.component';

const WEEKDAYS: ScheduleDay[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

interface ScheduleCell {
  subject: string;
  teacher: string;
  color: string;
}

export type TimetableSlotKind = 'daily' | 'assembly' | 'period';

export interface TimetableSlotPick {
  kind: TimetableSlotKind;
  classId: number;
  className: string;
  stageId: number;
  stageName: string;
  period?: number;
  subject?: string;
  teacher?: string;
}

/**
 * Home timetable. A teacher, including a wing supervisor who also teaches, sees the same
 * weekly grid as جدولي. Leadership sees today's lessons for every class.
 * The student-attendance page reuses this grid for a wing supervisor, with the morning assembly.
 */
@Component({
  selector: 'app-home-class-schedule',
  standalone: true,
  imports: [UiIconComponent, RouterLink, ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, TranslatePipe, TeacherWeekGridComponent],
  host: { class: 'block' },
  template: `
    <mat-card class="overflow-hidden px-0 py-0">
      <div class="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-3">
        <div>
          <h3 class="m-0 flex items-center gap-1.5 text-base text-primary">
            <app-ui-icon name="calendar_view_week" class="size-5 text-[20px]"></app-ui-icon>
            {{ 'home.schedule.title' | translate }}
          </h3>
          <p class="mt-1 mb-0 text-[0.8rem] text-muted">{{ daySubtitle }}</p>
        </div>
        @if (dateControl) {
          <mat-form-field appearance="outline" class="mb-0 w-40 shrink-0" subscriptSizing="dynamic">
            <mat-label>التاريخ</mat-label>
            <input matInput [matDatepicker]="scheduleDate" [formControl]="dateControl">
            <mat-datepicker-toggle matIconSuffix [for]="scheduleDate"></mat-datepicker-toggle>
            <mat-datepicker #scheduleDate></mat-datepicker>
          </mat-form-field>
        } @else if (canOpenFullSchedule) {
          <a mat-button [routerLink]="scheduleLink">{{ 'home.schedule.open' | translate }}</a>
        }
      </div>

      @if (ownTimetable) {
        <app-teacher-week-grid [teacherId]="teacherId"></app-teacher-week-grid>
      } @else if (loading) {
        <div class="px-5 pb-5" aria-busy="true">
          <div class="skeleton mb-2 h-9 w-full rounded-lg"></div>
          @for (i of [1,2,3,4]; track i) {
            <div class="skeleton mb-2 h-12 w-full rounded-lg"></div>
          }
        </div>
      } @else if (!rows.length) {
        <p class="mx-5 mb-5 mt-0 text-[0.9rem] text-muted">{{ 'home.schedule.noClasses' | translate }}</p>
      } @else {
        <div class="overflow-x-auto px-2 pb-4">
          <table class="w-full min-w-[720px] border-separate border-spacing-0 text-start">
            <thead>
              <tr class="bg-[#f8fafc]">
                <th class="sticky start-0 z-[1] min-w-[5.5rem] border-b border-border bg-[#f8fafc] px-3 py-2.5 text-[0.75rem] font-bold text-muted">{{ 'home.schedule.class' | translate }}</th>
                @if (showAssembly) {
                  <th class="min-w-[6.4rem] border-b border-border px-1.5 py-2.5 text-center text-[0.75rem] font-bold text-muted">
                    {{ 'home.schedule.assembly' | translate }}
                    <span class="mt-0.5 block text-[0.62rem] font-semibold text-faint" dir="ltr">{{ assemblyRange }}</span>
                  </th>
                }
                @for (p of periods; track p) {
                  <th class="min-w-[6.4rem] border-b border-border px-1.5 py-2.5 text-center text-[0.75rem] font-bold text-muted">
                    {{ periodLabel(p) }}
                    <span class="mt-0.5 block text-[0.62rem] font-semibold text-faint" dir="ltr">{{ range(p) }}</span>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of rows; track row.id) {
                <tr class="align-top">
                  <th class="sticky start-0 z-[1] border-t border-border bg-white px-3 py-2 text-start">
                    <span class="block text-[0.88rem] font-bold text-text">{{ row.name }}</span>
                    @if (row.stage) {
                      <span class="block text-[0.7rem] font-medium text-faint">{{ row.stage }}</span>
                    }
                  </th>
                  @if (showAssembly) {
                    <td class="border-t border-border px-1.5 py-1.5">
                      <button
                        type="button"
                        class="block w-full min-h-[2.4rem] rounded-lg border border-primary-light bg-primary-bg px-2 py-1.5 text-[0.72rem] font-bold text-primary"
                        [class.ring-2]="isActive('assembly', row.id)"
                        [class.ring-primary]="isActive('assembly', row.id)"
                        (click)="openAssembly(row)">
                        {{ 'home.schedule.assembly' | translate }}
                      </button>
                    </td>
                  }
                  @for (p of periods; track p) {
                    <td class="border-t border-border px-1.5 py-1.5">
                      @if (cell(row.id, p); as lesson) {
                        @if (showAssembly) {
                          <button
                            type="button"
                            class="relative block w-full rounded-lg bg-[color-mix(in_srgb,var(--subj)_12%,white)] px-2 py-1.5 pb-3 text-start leading-tight border-s-[3px]"
                            [class.ring-2]="isActive('period', row.id, p)"
                            [class.ring-primary]="isActive('period', row.id, p)"
                            [style.--subj]="lesson.color"
                            [style.border-inline-start-color]="lesson.color"
                            (click)="openPeriod(row, p, lesson)">
                            <strong class="block text-[0.78rem] font-bold text-text">{{ lesson.subject }}</strong>
                            <span class="block text-[0.7rem] text-muted">{{ lesson.teacher }}</span>
                            <span
                              class="attendance-lamp"
                              [class.is-sent]="isSubmitted(row.id, p)"
                              [attr.title]="lampTitle(row.id, p)"
                              [attr.aria-label]="lampTitle(row.id, p)"
                            ></span>
                          </button>
                        } @else {
                          <div
                            class="rounded-lg bg-[color-mix(in_srgb,var(--subj)_12%,white)] px-2 py-1.5 leading-tight border-s-[3px]"
                            [style.--subj]="lesson.color"
                            [style.border-inline-start-color]="lesson.color">
                            <strong class="block text-[0.78rem] font-bold text-text">{{ lesson.subject }}</strong>
                            <span class="block text-[0.7rem] text-muted">{{ lesson.teacher }}</span>
                          </div>
                        }
                      } @else {
                        <span class="block min-h-[2.4rem] text-center text-[0.85rem] text-faint">—</span>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </mat-card>
  `,
  styles: [`
    .attendance-lamp {
      position: absolute;
      bottom: 0.28rem;
      left: 0.35rem;
      width: 0.48rem;
      height: 0.48rem;
      border-radius: 999px;
      background: #e11d48;
      box-shadow: 0 0 0 2px #fff, 0 0 6px #e11d48;
    }
    .attendance-lamp.is-sent {
      background: #059669;
      box-shadow: 0 0 0 2px #fff, 0 0 6px #059669;
    }
  `]
})
export class HomeClassScheduleComponent implements OnInit {
  private readonly api = inject(ScheduleApiService);
  private readonly attendanceApi = inject(AttendanceApiService);
  private readonly lookup = inject(AcademicLookupService);
  private readonly auth = inject(AuthService);
  private readonly lang = inject(LanguageService);

  /** school: always the all-classes day grid, used on the wing supervisor attendance page. */
  @Input() mode: 'auto' | 'school' = 'auto';
  @Input() assembly = false;
  @Input() activeClassId: number | null = null;
  @Input() activeKind: TimetableSlotKind | null = null;
  @Input() activePeriod: number | null = null;
  /** When set, the header shows this date and the grid follows the chosen school day. */
  @Input() dateControl: FormControl<Date | null> | null = null;
  @Output() slotOpen = new EventEmitter<TimetableSlotPick>();

  readonly periods = PERIODS;
  readonly assemblyRange = morningAssemblyRange();
  loading = true;

  get teacherId(): number | null {
    return this.auth.user()?.teacherId ?? null;
  }

  /** Teachers see the same weekly grid as جدولي. Leadership is not assigned lessons. */
  get ownTimetable(): boolean {
    if (this.mode === 'school') return false;
    if (this.auth.hasAnyRole(['SCHOOL_MANAGER', 'ASSISTANT_MANAGER'])) return false;
    return this.teacherId != null;
  }

  get showAssembly(): boolean {
    return this.assembly;
  }

  get canOpenFullSchedule(): boolean {
    return this.auth.hasPermission('class_schedule.view') || this.auth.hasPermission('class_schedule.manage');
  }

  get scheduleLink(): string {
    return this.ownTimetable ? '/my-lessons' : '/class-schedule';
  }
  rows: { id: number; name: string; stage: string; stageId: number }[] = [];
  daySubtitle = '';
  private readonly cells = new Map<string, ScheduleCell>();
  private readonly submitted = new Set<string>();
  private entries: ClassScheduleEntry[] = [];
  private day: ScheduleDay | null = 'SUNDAY';

  ngOnInit(): void {
    if (this.ownTimetable) {
      this.daySubtitle = this.lang.translate('myLessons.subtitle');
      this.loading = false;
      return;
    }
    if (!this.canOpenFullSchedule && !this.showAssembly) {
      this.loading = false;
      return;
    }
    this.dateControl?.valueChanges.subscribe(value => this.applyDate(value));
    this.applyDate(this.dateControl?.value ?? null);
    const classes$ = this.showAssembly
      ? of([] as SchoolClass[])
      : this.lookup.getAllClasses().pipe(catchError(() => of([] as SchoolClass[])));
    forkJoin({
      classes: classes$,
      entries: this.api.getEntries({}).pipe(catchError(() => of([] as ClassScheduleEntry[])))
    }).subscribe({
      next: ({ classes, entries }) => {
        this.rows = [...classes]
          .filter(c => c.id != null)
          .sort((a, b) =>
            (a.academicStageId ?? 0) - (b.academicStageId ?? 0)
            || a.name.localeCompare(b.name, 'ar', { numeric: true }))
          .map(c => ({ id: c.id!, name: c.name, stage: c.academicStageName ?? '', stageId: c.academicStageId ?? 0 }));
        if (!this.rows.length) {
          const seen = new Map<number, { id: number; name: string; stage: string; stageId: number }>();
          for (const e of entries) {
            if (e.classId == null || seen.has(e.classId)) continue;
            seen.set(e.classId, { id: e.classId, name: e.className, stage: e.stageName ?? '', stageId: e.stageId ?? 0 });
          }
          this.rows = [...seen.values()]
            .sort((a, b) => a.stageId - b.stageId || a.name.localeCompare(b.name, 'ar', { numeric: true }));
        }
        this.entries = entries;
        this.fillCells();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  cell(classId: number, period: number): ScheduleCell | undefined {
    return this.cells.get(`${classId}-${period}`);
  }

  isActive(kind: TimetableSlotKind, classId: number, period?: number): boolean {
    if (this.activeKind !== kind || this.activeClassId !== classId) return false;
    return kind !== 'period' || this.activePeriod === period;
  }

  openAssembly(row: { id: number; name: string; stage: string; stageId: number }): void {
    this.emitSlot('assembly', row);
  }

  openPeriod(row: { id: number; name: string; stage: string; stageId: number }, period: number, lesson: ScheduleCell): void {
    this.emitSlot('period', row, { period, subject: lesson.subject, teacher: lesson.teacher });
  }

  private emitSlot(
    kind: TimetableSlotKind,
    row: { id: number; name: string; stage: string; stageId: number },
    extra?: { period: number; subject: string; teacher: string }
  ): void {
    this.slotOpen.emit({
      kind,
      classId: row.id,
      className: row.name,
      stageId: row.stageId,
      stageName: row.stage,
      period: extra?.period,
      subject: extra?.subject,
      teacher: extra?.teacher
    });
  }

  periodLabel(period: number): string {
    return this.lang.translate('home.schedule.period').replace('{n}', String(period));
  }

  range(period: number): string {
    return periodRange(period);
  }

  private applyDate(value: Date | null): void {
    const date = this.chosenDate(value);
    this.day = this.dayOf(date);
    this.daySubtitle = this.buildSubtitle(date);
    this.fillCells();
    this.reloadSubmitted();
  }

  /** Teaching periods already saved by a teacher turn the card lamp green. */
  reloadSubmitted(): void {
    if (!this.showAssembly) return;
    const date = this.isoDate(this.chosenDate(this.dateControl?.value ?? null));
    this.attendanceApi.getSubmittedSlots(date).pipe(catchError(() => of([]))).subscribe(slots => {
      this.submitted.clear();
      for (const slot of slots) this.submitted.add(`${slot.classId}-${slot.period}`);
    });
  }

  /** Green only after the period has started and the teacher saved attendance. Before that the lamp stays red. */
  isSubmitted(classId: number, period: number): boolean {
    return this.periodHasStarted(period) && this.submitted.has(`${classId}-${period}`);
  }

  /** True when a teacher already saved this slot, even if the period has not started. */
  hasSavedAttendance(classId: number, period: number): boolean {
    return this.submitted.has(`${classId}-${period}`);
  }

  lampTitle(classId: number, period: number): string {
    if (!this.periodHasStarted(period)) return 'لم يحن موعد الحصة';
    return this.submitted.has(`${classId}-${period}`) ? 'تم إرسال الحضور' : 'لم يُرسل الحضور';
  }

  private periodHasStarted(period: number): boolean {
    const slot = BELL_PERIODS[period - 1];
    if (!slot) return false;
    const date = this.chosenDate(this.dateControl?.value ?? null);
    const [hours, minutes] = slot.start.split(':').map(Number);
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
    return start.getTime() <= Date.now();
  }

  private isoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private fillCells(): void {
    this.cells.clear();
    if (!this.day) return;
    for (const e of this.entries) {
      if (e.dayOfWeek !== this.day || e.classId == null) continue;
      this.cells.set(`${e.classId}-${e.period}`, {
        subject: e.subject || '',
        teacher: this.shortTeacher(e.teacherName),
        color: e.subjectColor || '#5c6bc0'
      });
    }
  }

  /** A picked Friday or Saturday stays on that date. Without a picker, the weekend still previews Sunday. */
  private chosenDate(value: Date | null): Date {
    const date = value instanceof Date && !isNaN(value.getTime()) ? value : new Date();
    if (this.dateControl || (date.getDay() !== 5 && date.getDay() !== 6)) return date;
    const sunday = new Date(date);
    sunday.setDate(date.getDate() + ((7 - date.getDay()) % 7));
    return sunday;
  }

  private dayOf(date: Date): ScheduleDay | null {
    const index = date.getDay();
    return index >= 0 && index <= 4 ? WEEKDAYS[index] : null;
  }

  private buildSubtitle(date: Date): string {
    const locale = this.lang.isEnglish() ? 'en-GB' : 'ar-u-nu-latn';
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
    const note = date.getDay() === 5 || date.getDay() === 6 ? ` · ${this.lang.translate('home.schedule.weekend')}` : '';
    return `${this.lang.translate('home.schedule.forDay')} ${weekday}${note}`;
  }

  private shortTeacher(name: string): string {
    const cleaned = (name || '').replace(/^أ\.\s*/, '').trim();
    return cleaned.split(/\s+/).filter(Boolean)[0] || name;
  }
}
