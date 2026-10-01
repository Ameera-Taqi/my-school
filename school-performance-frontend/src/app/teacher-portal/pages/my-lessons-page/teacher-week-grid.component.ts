import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ClassScheduleEntry, ScheduleDay } from '../../../core/models';
import { ScheduleApiService } from '../../../class-schedule/services/schedule-api.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ClassPeriodSlot, LessonPrepMockService } from '../../services/lesson-prep-mock.service';
import { isPeriodNow, periodRange } from '../../../core/constants/bell-schedule';

const DAYS: ScheduleDay[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

interface LessonCell {
  classId: number;
  subject: string;
  className: string;
  stageName: string;
  room: string;
  color: string;
}

/** Weekly timetable for the signed-in teacher. Shared by جدولي and the home schedule card. */
@Component({
  selector: 'app-teacher-week-grid',
  standalone: true,
  imports: [MatCardModule, RouterLink, EmptyStateComponent, TranslatePipe],
  styles: `
    .lesson-chip { background: color-mix(in srgb, var(--subj) 12%, white); color: inherit; cursor: pointer; }
    .lesson-chip--idle {
      background: color-mix(in srgb, var(--color-muted) 10%, white);
      border-inline-start-color: var(--color-border);
    }
    .lesson-chip--idle strong,
    .lesson-chip--idle span { color: var(--color-muted); }
    .now-cell { background: color-mix(in srgb, var(--color-primary-mid) 16%, white); }
    .now-period { color: var(--color-primary); background: var(--color-primary-bg); }
    .now-lesson {
      background: var(--color-primary);
      color: #fff;
      border-inline-start-color: var(--color-primary-light);
    }
    .now-lesson strong,
    .now-lesson span { color: #fff; }
    .now-badge {
      display: inline-block;
      margin-top: 0.25rem;
      border-radius: 999px;
      background: var(--color-primary-light);
      color: var(--color-primary);
      padding: 0 0.45rem;
      font-size: 0.65rem;
      font-weight: 800;
    }
  `,
  template: `
    @if (loading) {
      <div class="px-5 pb-5" aria-busy="true">
        <div class="skeleton mb-3 h-10 w-full rounded-lg"></div>
        @for (i of [1, 2, 3, 4, 5]; track i) {
          <div class="skeleton mb-2 h-12 w-full rounded-lg"></div>
        }
      </div>
    } @else if (!hasLessons) {
      <div class="px-5 pb-5">
        <app-empty-state icon="calendar_view_day" [title]="'myLessons.empty' | translate"></app-empty-state>
      </div>
    } @else {
      <div class="overflow-x-auto px-2 py-4">
        <table class="w-full min-w-[760px] border-separate border-spacing-0 text-start">
          <thead>
            <tr class="bg-[#f8fafc]">
              <th class="sticky start-0 z-[1] min-w-[5.5rem] border-b border-border bg-[#f8fafc] px-3 py-2.5 text-[0.75rem] font-bold text-muted"></th>
              @for (day of days; track day) {
                <th class="min-w-[8rem] border-b border-border px-2 py-2.5 text-center text-[0.8rem] font-bold" [class.text-primary]="day === today" [class.text-muted]="day !== today">
                  {{ dayKey(day) | translate }}
                  @if (day === today) {
                    <span class="mt-0.5 block text-[0.65rem] font-semibold text-primary">{{ 'myLessons.today' | translate }}</span>
                  }
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (period of periods; track period) {
              <tr class="align-top">
                <th
                  class="sticky start-0 z-[1] border-t border-border px-3 py-2 text-start text-[0.78rem] font-bold"
                  [class.now-period]="isCurrentPeriod(period)"
                  [class.bg-white]="!isCurrentPeriod(period)"
                  [class.text-muted]="!isCurrentPeriod(period)">
                  {{ periodLabel(period) }}
                  <span class="mt-0.5 block text-[0.65rem] font-semibold" dir="ltr" [class.text-primary]="isCurrentPeriod(period)" [class.text-faint]="!isCurrentPeriod(period)">{{ range(period) }}</span>
                </th>
                @for (day of days; track day) {
                  <td
                    class="border-t border-border px-1.5 py-1.5"
                    [class.now-cell]="isCurrent(day, period)"
                    [class.bg-primary-bg]="day === today && !isCurrent(day, period)">
                    @if (cell(day, period); as lesson) {
                      <a
                        class="lesson-chip block rounded-lg px-2 py-1.5 leading-tight no-underline border-s-[3px]"
                        [routerLink]="['/my-lessons', lesson.classId]"
                        [queryParams]="{ period: period, day: day }"
                        [class.lesson-chip--idle]="day !== today"
                        [class.now-lesson]="isCurrent(day, period)"
                        [style.--subj]="lesson.color"
                        [style.border-inline-start-color]="day === today && !isCurrent(day, period) ? lesson.color : null">
                        <strong class="block text-[0.82rem] font-bold" [class.text-text]="day === today && !isCurrent(day, period)">{{ lesson.subject }}</strong>
                        <span class="block text-[0.72rem]" [class.text-muted]="day === today && !isCurrent(day, period)">{{ 'home.schedule.class' | translate }} {{ lesson.className }}</span>
                        <span class="block text-[0.68rem] font-semibold" [class.text-primary]="day === today && !isCurrent(day, period)">التحضير {{ lessonNumber(lesson, day, period) }}</span>
                        @if (lesson.room) {
                          <span class="block text-[0.68rem]" [class.text-faint]="!isCurrent(day, period)">{{ lesson.room }}</span>
                        }
                        @if (isCurrent(day, period)) {
                          <span class="now-badge">{{ 'myLessons.now' | translate }}</span>
                        }
                      </a>
                    } @else if (isCurrent(day, period)) {
                      <span class="now-badge">{{ 'myLessons.now' | translate }}</span>
                    } @else {
                      <span class="block min-h-[2.6rem] text-center text-[0.85rem] text-faint">—</span>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `
})
export class TeacherWeekGridComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ScheduleApiService);
  private readonly lang = inject(LanguageService);
  private readonly preps = inject(LessonPrepMockService);

  /** When set, the grid shows this teacher's lessons. Defaults to the signed-in teacher. */
  @Input() teacherId: number | null = null;

  readonly days = DAYS;
  readonly periods = PERIODS;
  loading = true;
  hasLessons = false;
  private readonly clock = signal(new Date());
  private clockTimer = 0;
  private readonly cells = new Map<string, LessonCell>();

  get today(): ScheduleDay | null {
    const index = this.clock().getDay();
    return index >= 0 && index <= 4 ? DAYS[index] : null;
  }

  ngOnInit(): void {
    this.clockTimer = window.setInterval(() => {
      this.settleLessons();
      this.clock.set(new Date());
    }, 15_000);
    const teacherId = this.teacherId ?? this.auth.user()?.teacherId ?? null;
    if (!teacherId) {
      this.loading = false;
      return;
    }
    this.api.getEntries({ teacherId }).subscribe({
      next: entries => {
        this.cells.clear();
        for (const entry of entries) this.put(entry);
        this.hasLessons = this.cells.size > 0;
        this.settleLessons();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  ngOnDestroy(): void {
    window.clearInterval(this.clockTimer);
  }

  isCurrent(day: ScheduleDay, period: number): boolean {
    return day === this.today && this.isCurrentPeriod(period);
  }

  isCurrentPeriod(period: number): boolean {
    return !!this.today && isPeriodNow(period, this.clock());
  }

  range(period: number): string {
    return periodRange(period);
  }

  lessonNumber(lesson: LessonCell, day: ScheduleDay, period: number): number {
    const slots: ClassPeriodSlot[] = [];
    for (const [key, cell] of this.cells) {
      if (cell.className !== lesson.className || cell.subject !== lesson.subject || cell.stageName !== lesson.stageName) continue;
      const split = key.lastIndexOf('-');
      slots.push({ day: key.slice(0, split) as ScheduleDay, period: Number(key.slice(split + 1)) });
    }
    return this.preps.lessonForSlot(lesson.className, lesson.subject, lesson.stageName, slots, day, period, this.clock());
  }

  cell(day: ScheduleDay, period: number): LessonCell | undefined {
    return this.cells.get(`${day}-${period}`);
  }

  dayKey(day: ScheduleDay): string {
    return `day.${day}`;
  }

  periodLabel(period: number): string {
    return this.lang.translate('home.schedule.period').replace('{n}', String(period));
  }

  private settleLessons(): void {
    const groups = new Map<string, { className: string; subject: string; stageName: string; slots: ClassPeriodSlot[] }>();
    for (const [key, lesson] of this.cells) {
      const split = key.lastIndexOf('-');
      const day = key.slice(0, split) as ScheduleDay;
      const period = Number(key.slice(split + 1));
      const id = `${lesson.className}|${lesson.subject}|${lesson.stageName}`;
      const group = groups.get(id) ?? { className: lesson.className, subject: lesson.subject, stageName: lesson.stageName, slots: [] };
      group.slots.push({ day, period });
      groups.set(id, group);
    }
    for (const group of groups.values()) {
      this.preps.resolve(group.className, group.subject, group.stageName, group.slots, this.clock());
    }
  }

  private put(entry: ClassScheduleEntry): void {
    this.cells.set(`${entry.dayOfWeek}-${entry.period}`, {
      classId: entry.classId ?? 0,
      subject: entry.subject || '—',
      className: entry.className,
      stageName: entry.stageName || '',
      room: entry.room || '',
      color: entry.subjectColor || '#5c6bc0'
    });
  }
}
