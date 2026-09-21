import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { ClassScheduleEntry, ScheduleDay, SchoolClass } from '../../core/models';
import { ScheduleApiService } from '../../class-schedule/services/schedule-api.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

const WEEKDAYS: ScheduleDay[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

interface ScheduleCell {
  subject: string;
  teacher: string;
  color: string;
}

/**
 * Today's timetable for every registered class: rows are classes, columns are periods 1–7,
 * each cell shows the subject and teacher from the school schedule.
 */
@Component({
  selector: 'app-home-class-schedule',
  standalone: true,
  imports: [UiIconComponent, RouterLink, MatCardModule, MatButtonModule, TranslatePipe],
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
        <a mat-button routerLink="/class-schedule">{{ 'home.schedule.open' | translate }}</a>
      </div>

      @if (loading) {
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
                @for (p of periods; track p) {
                  <th class="min-w-[6.4rem] border-b border-border px-1.5 py-2.5 text-center text-[0.75rem] font-bold text-muted">{{ periodLabel(p) }}</th>
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
                  @for (p of periods; track p) {
                    <td class="border-t border-border px-1.5 py-1.5">
                      @if (cell(row.id, p); as lesson) {
                        <div
                          class="rounded-lg bg-[color-mix(in_srgb,var(--subj)_12%,white)] px-2 py-1.5 leading-tight border-s-[3px]"
                          [style.--subj]="lesson.color"
                          [style.border-inline-start-color]="lesson.color">
                          <strong class="block text-[0.78rem] font-bold text-text">{{ lesson.subject }}</strong>
                          <span class="block text-[0.7rem] text-muted">{{ lesson.teacher }}</span>
                        </div>
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
  `
})
export class HomeClassScheduleComponent implements OnInit {
  private readonly api = inject(ScheduleApiService);
  private readonly lookup = inject(AcademicLookupService);
  private readonly auth = inject(AuthService);
  private readonly lang = inject(LanguageService);

  readonly periods = PERIODS;
  loading = true;
  rows: { id: number; name: string; stage: string }[] = [];
  daySubtitle = '';
  private readonly cells = new Map<string, ScheduleCell>();
  private day: ScheduleDay = 'SUNDAY';

  ngOnInit(): void {
    if (!this.auth.hasPermission('class_schedule.view') && !this.auth.hasPermission('class_schedule.manage')) {
      this.loading = false;
      return;
    }
    this.day = this.schoolDay();
    this.daySubtitle = this.buildSubtitle();
    forkJoin({
      classes: this.lookup.getAllClasses().pipe(catchError(() => of([] as SchoolClass[]))),
      entries: this.api.getEntries({}).pipe(catchError(() => of([] as ClassScheduleEntry[])))
    }).subscribe({
      next: ({ classes, entries }) => {
        this.rows = [...classes]
          .filter(c => c.id != null)
          .sort((a, b) =>
            (a.academicStageId ?? 0) - (b.academicStageId ?? 0)
            || a.name.localeCompare(b.name, 'ar', { numeric: true }))
          .map(c => ({ id: c.id!, name: c.name, stage: c.academicStageName ?? '' }));
        if (!this.rows.length) {
          const seen = new Map<number, string>();
          for (const e of entries) {
            if (e.classId != null) seen.set(e.classId, e.className);
          }
          this.rows = [...seen.entries()].map(([id, name]) => ({ id, name, stage: '' }));
        }
        this.cells.clear();
        for (const e of entries) {
          if (e.dayOfWeek !== this.day || e.classId == null) continue;
          this.cells.set(`${e.classId}-${e.period}`, {
            subject: e.subject || '',
            teacher: this.shortTeacher(e.teacherName),
            color: e.subjectColor || '#5c6bc0'
          });
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  cell(classId: number, period: number): ScheduleCell | undefined {
    return this.cells.get(`${classId}-${period}`);
  }

  periodLabel(period: number): string {
    return this.lang.translate('home.schedule.period').replace('{n}', String(period));
  }

  private schoolDay(): ScheduleDay {
    const index = new Date().getDay();
    return index >= 0 && index <= 4 ? WEEKDAYS[index] : 'SUNDAY';
  }

  private buildSubtitle(): string {
    const locale = this.lang.isEnglish() ? 'en-GB' : 'ar-u-nu-latn';
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(this.displayDate());
    const note = this.isWeekend() ? ` · ${this.lang.translate('home.schedule.weekend')}` : '';
    return `${this.lang.translate('home.schedule.forDay')} ${weekday}${note}`;
  }

  private displayDate(): Date {
    if (!this.isWeekend()) return new Date();
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
    return d;
  }

  private isWeekend(): boolean {
    const d = new Date().getDay();
    return d === 5 || d === 6;
  }

  private shortTeacher(name: string): string {
    const cleaned = (name || '').replace(/^أ\.\s*/, '').trim();
    return cleaned.split(/\s+/).filter(Boolean)[0] || name;
  }
}
