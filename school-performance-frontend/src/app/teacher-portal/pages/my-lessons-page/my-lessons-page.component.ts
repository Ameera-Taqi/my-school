import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ClassScheduleEntry, ScheduleDay } from '../../../core/models';
import { ScheduleApiService } from '../../../class-schedule/services/schedule-api.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { KanbanBoardComponent } from '../../../shared/kanban/kanban-board.component';
import { KanbanStage } from '../../../shared/kanban/kanban.models';

const DAYS: ScheduleDay[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

/** Bell times for periods 1–7, starting at the school day (07:30). */
const PERIOD_TIMES = [
  { start: '07:30', end: '08:15' },
  { start: '08:15', end: '09:00' },
  { start: '09:00', end: '09:45' },
  { start: '10:00', end: '10:45' },
  { start: '10:45', end: '11:30' },
  { start: '11:30', end: '12:15' },
  { start: '12:15', end: '13:00' }
];

interface LessonCell {
  subject: string;
  className: string;
  room: string;
  color: string;
}

/** The signed-in teacher's own weekly timetable. */
@Component({
  selector: 'app-my-lessons-page',
  standalone: true,
  imports: [MatCardModule, PageHeaderComponent, EmptyStateComponent, TranslatePipe, KanbanBoardComponent],
  styles: `
    .lesson-chip { background: color-mix(in srgb, var(--subj) 12%, white); }
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
    <app-page-header [title]="'nav.myLessons' | translate" [subtitle]="'myLessons.subtitle' | translate"></app-page-header>

    @if (loading) {
      <mat-card class="p-5">
        <div class="skeleton mb-3 h-10 w-full rounded-lg"></div>
        @for (i of [1, 2, 3, 4, 5]; track i) {
          <div class="skeleton mb-2 h-12 w-full rounded-lg"></div>
        }
      </mat-card>
    } @else if (!teacherId) {
      <div class="data-card">
        <app-empty-state icon="person_off" [title]="'myLessons.noTeacher' | translate"></app-empty-state>
      </div>
    } @else if (!hasLessons) {
      <div class="data-card">
        <app-empty-state icon="calendar_view_day" [title]="'myLessons.empty' | translate"></app-empty-state>
      </div>
    } @else {
      @if (stages.length) {
        <app-kanban-board
          [stages]="stages"
          [label]="'nav.myLessons' | translate"
          [emptyLabel]="'myLessons.columnEmpty' | translate">
        </app-kanban-board>
      }
      <mat-card class="overflow-hidden px-0 py-0">
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
                    <span class="mt-0.5 block text-[0.65rem] font-semibold" [class.text-primary]="isCurrentPeriod(period)" [class.text-faint]="!isCurrentPeriod(period)">{{ periodRange(period) }}</span>
                  </th>
                  @for (day of days; track day) {
                    <td
                      class="border-t border-border px-1.5 py-1.5"
                      [class.now-cell]="isCurrent(day, period)"
                      [class.bg-primary-bg]="day === today && !isCurrent(day, period)">
                      @if (cell(day, period); as lesson) {
                        <div
                          class="lesson-chip rounded-lg px-2 py-1.5 leading-tight border-s-[3px]"
                          [class.now-lesson]="isCurrent(day, period)"
                          [style.--subj]="lesson.color"
                          [style.border-inline-start-color]="isCurrent(day, period) ? null : lesson.color">
                          <strong class="block text-[0.82rem] font-bold" [class.text-text]="!isCurrent(day, period)">{{ lesson.subject }}</strong>
                          <span class="block text-[0.72rem]" [class.text-muted]="!isCurrent(day, period)">{{ 'home.schedule.class' | translate }} {{ lesson.className }}</span>
                          @if (lesson.room) {
                            <span class="block text-[0.68rem]" [class.text-faint]="!isCurrent(day, period)">{{ lesson.room }}</span>
                          }
                          @if (isCurrent(day, period)) {
                            <span class="now-badge">{{ 'myLessons.now' | translate }}</span>
                          }
                        </div>
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
      </mat-card>
    }
  `
})
export class MyLessonsPageComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ScheduleApiService);
  private readonly lang = inject(LanguageService);

  readonly days = DAYS;
  readonly periods = PERIODS;
  loading = true;
  hasLessons = false;
  stages: KanbanStage[] = [];
  private readonly clock = signal(new Date());
  private clockTimer = 0;
  private readonly cells = new Map<string, LessonCell>();

  get today(): ScheduleDay | null {
    const index = this.clock().getDay();
    return index >= 0 && index <= 4 ? DAYS[index] : null;
  }

  get teacherId(): number | null {
    return this.auth.user()?.teacherId ?? null;
  }

  ngOnInit(): void {
    this.clockTimer = window.setInterval(() => this.clock.set(new Date()), 15_000);
    const teacherId = this.teacherId;
    if (!teacherId) {
      this.loading = false;
      return;
    }
    this.api.getEntries({ teacherId }).subscribe({
      next: entries => {
        this.cells.clear();
        for (const entry of entries) this.put(entry);
        this.stages = this.groupStages(entries);
        this.hasLessons = this.cells.size > 0;
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
    if (!this.today) return false;
    const slot = PERIOD_TIMES[period - 1];
    if (!slot) return false;
    const minutes = this.clock().getHours() * 60 + this.clock().getMinutes();
    return minutes >= minutesOf(slot.start) && minutes < minutesOf(slot.end);
  }

  periodRange(period: number): string {
    const slot = PERIOD_TIMES[period - 1];
    return slot ? `${slot.start}–${slot.end}` : '';
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

  private groupStages(entries: ClassScheduleEntry[]): KanbanStage[] {
    const byStage = new Map<number, { name: string; classes: Map<number, { title: string; lessons: number }> }>();
    for (const entry of entries) {
      const stageId = entry.stageId ?? 0;
      const classId = entry.classId ?? 0;
      if (!stageId || !classId || !entry.stageName) continue;
      let stage = byStage.get(stageId);
      if (!stage) {
        stage = { name: entry.stageName, classes: new Map() };
        byStage.set(stageId, stage);
      }
      const existing = stage.classes.get(classId);
      if (existing) existing.lessons += 1;
      else stage.classes.set(classId, { title: entry.className, lessons: 1 });
    }

    const columns = [...byStage.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([id, stage]) => ({
        id: String(id),
        title: stage.name,
        tasks: [...stage.classes.entries()]
          .sort((a, b) => a[1].title.localeCompare(b[1].title, 'ar'))
          .map(([classId, cls]) => ({
            id: String(classId),
            title: cls.title,
            progress: 0,
            status: stage.name,
            link: `/my-lessons/${classId}`,
            lessons: cls.lessons
          }))
      }));

    const total = columns.reduce((sum, stage) => sum + stage.tasks.reduce((n, task) => n + task.lessons, 0), 0);
    return columns.map(stage => ({
      id: stage.id,
      title: stage.title,
      tasks: stage.tasks.map(task => ({
        id: task.id,
        title: task.title,
        progress: total > 0 ? Math.round((task.lessons / total) * 100) : 0,
        status: task.status,
        link: task.link
      }))
    }));
  }

  private put(entry: ClassScheduleEntry): void {
    this.cells.set(`${entry.dayOfWeek}-${entry.period}`, {
      subject: entry.subject || '—',
      className: entry.className,
      room: entry.room || '',
      color: entry.subjectColor || '#5c6bc0'
    });
  }
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
