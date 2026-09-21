import { NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { HomeStats } from '../services/home-stats.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

interface AttendanceSplit {
  presentCount: string;
  presentRate: string;
  absentCount: string;
  absentRate: string;
}

interface StatCard {
  icon: string;
  labelKey: string;
  value: string;
  rate: string;
  rateKey: string;
  color: string;
  bg: string;
  route?: string;
  action?: 'calendar' | 'schedule';
  permission?: string;
  roles?: string[];
  live: boolean;
  split?: AttendanceSplit;
}

/** Home stats. Attendance cards are limited to school managers; the rest are shown to every user. */
@Component({
  selector: 'app-home-stats',
  standalone: true,
  imports: [NgTemplateOutlet, UiIconComponent, RouterLink, MatTooltipModule, TranslatePipe],
  host: { class: 'block' },
  template: `
    @if (loading) {
      <div class="mb-5 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        @for (i of [1,2,3,4,5]; track i) {
          <div class="flex min-h-[132px] flex-col justify-between gap-[0.85rem] rounded-2xl border border-border bg-white/90 p-4 shadow-sp backdrop-blur-md">
            <span class="skeleton size-[38px] rounded-sp-sm"></span>
            <div class="flex flex-1 flex-col gap-2">
              <span class="skeleton block h-[18px] w-2/5"></span>
              <span class="skeleton block h-3 w-[70%]"></span>
            </div>
          </div>
        }
      </div>
    } @else if (cards.length) {
      <div class="mb-5 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        @for (stat of cards; track stat.labelKey) {
          @if (stat.action) {
            <button
              type="button"
              class="group relative flex min-h-[132px] w-full cursor-pointer flex-col justify-between gap-[0.85rem] rounded-2xl border bg-white/90 p-4 text-start text-inherit shadow-sp backdrop-blur-md transition hover:-translate-y-[3px] hover:shadow-sp-md"
              [class.border-indigo-300]="isActionOpen(stat)"
              [class.border-border]="!isActionOpen(stat)"
              [class.ring-2]="isActionOpen(stat)"
              [class.ring-indigo-100]="isActionOpen(stat)"
              (click)="toggleAction(stat)"
              [attr.aria-expanded]="isActionOpen(stat)"
              [attr.aria-controls]="stat.action === 'calendar' ? 'home-calendar' : 'home-schedule'"
              [matTooltip]="actionHint(stat) | translate">
              <ng-container [ngTemplateOutlet]="cardInner" [ngTemplateOutletContext]="{ $implicit: stat }"></ng-container>
            </button>
          } @else {
            <a
              class="group relative flex min-h-[132px] cursor-pointer flex-col justify-between gap-[0.85rem] rounded-2xl border border-border bg-white/90 p-4 text-inherit no-underline shadow-sp backdrop-blur-md transition hover:-translate-y-[3px] hover:border-indigo-200 hover:shadow-sp-md"
              [routerLink]="stat.route"
              [matTooltip]="('common.open' | translate) + ' ' + (stat.labelKey | translate)">
              <ng-container [ngTemplateOutlet]="cardInner" [ngTemplateOutletContext]="{ $implicit: stat }"></ng-container>
            </a>
          }
        }
      </div>
    }

    <ng-template #cardInner let-stat>
      <div class="flex items-center justify-between gap-2">
        <span class="flex flex-wrap items-center gap-[0.35rem] text-xs font-bold text-muted">
          {{ stat.labelKey | translate }}
          @if (!stat.live) {
            <span class="rounded-full bg-amber-50 px-1.5 text-[0.65rem] font-semibold text-amber-700" [matTooltip]="'common.demoHint' | translate">{{ 'common.demo' | translate }}</span>
          }
        </span>
        <span class="flex size-[38px] shrink-0 items-center justify-center rounded-sp-sm" [style.background]="stat.bg" [style.color]="stat.color">
          <app-ui-icon [name]="stat.icon" class="text-[1.1rem]"></app-ui-icon>
        </span>
      </div>
      @if (stat.split) {
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-xl bg-emerald-50/90 px-2.5 py-2">
            <span class="block text-[0.68rem] font-bold text-emerald-800">{{ 'stats.present' | translate }}</span>
            <span class="mt-0.5 block text-[1.35rem] font-black leading-none tracking-tight text-text">{{ stat.split.presentCount }}</span>
            <span class="mt-1.5 block text-[0.68rem] font-semibold leading-snug text-muted">
              {{ 'stats.presentRate' | translate }}
              <span class="text-emerald-800">{{ stat.split.presentRate }}</span>
            </span>
          </div>
          <div class="rounded-xl bg-rose-50/90 px-2.5 py-2">
            <span class="block text-[0.68rem] font-bold text-rose-800">{{ 'stats.absent' | translate }}</span>
            <span class="mt-0.5 block text-[1.35rem] font-black leading-none tracking-tight text-text">{{ stat.split.absentCount }}</span>
            <span class="mt-1.5 block text-[0.68rem] font-semibold leading-snug text-muted">
              {{ 'stats.absentRate' | translate }}
              <span class="text-rose-800">{{ stat.split.absentRate }}</span>
            </span>
          </div>
        </div>
      } @else {
        <div class="flex min-w-0 flex-col leading-tight">
          <span class="text-[1.55rem] font-black tracking-tight text-text">{{ stat.value }}</span>
          @if (stat.rate) {
            <span class="mt-1 text-[0.78rem] font-semibold text-muted">
              @if (stat.rateKey) { {{ stat.rateKey | translate }} }
              {{ stat.rate }}
            </span>
          }
        </div>
      }
    </ng-template>
  `
})
export class HomeStatsComponent implements OnChanges {
  @Input() stats: HomeStats | null = null;
  @Input() loading = false;
  @Input() calendarOpen = false;
  @Input() scheduleOpen = false;
  @Output() calendarToggle = new EventEmitter<void>();
  @Output() scheduleToggle = new EventEmitter<void>();
  private readonly auth = inject(AuthService);
  private readonly lang = inject(LanguageService);
  cards: StatCard[] = [];

  ngOnChanges(): void {
    const d = this.stats;
    if (!d) { this.cards = []; return; }
    const studentsPresent = this.figure(d.studentPresentCount, 14);
    const studentsPresentRate = this.percent(d.studentPresentRate, 87.5);
    const studentsAbsent = this.figure(d.studentAbsentCount, 2);
    const studentsAbsentRate = this.percent(d.studentAbsentRate, 12.5);
    const teachersPresent = this.figure(d.teacherPresentCount, 5);
    const teachersPresentRate = this.percent(d.teacherPresentRate, 83.3);
    const teachersAbsent = this.figure(d.teacherAbsentCount, 1);
    const teachersAbsentRate = this.percent(d.teacherAbsentRate, 16.7);
    const all: StatCard[] = [
      {
        icon: 'how_to_reg',
        labelKey: 'stats.studentAttendance',
        value: studentsPresent.value,
        rate: studentsPresentRate.value,
        rateKey: 'stats.presentRate',
        color: '#059669', bg: '#ecfdf5',
        route: '/attendance/students',
        permission: 'attendance.view',
        roles: ['SCHOOL_MANAGER', 'ASSISTANT_MANAGER'],
        live: studentsPresent.live && studentsPresentRate.live && studentsAbsent.live && studentsAbsentRate.live,
        split: {
          presentCount: studentsPresent.value,
          presentRate: studentsPresentRate.value,
          absentCount: studentsAbsent.value,
          absentRate: studentsAbsentRate.value
        }
      },
      {
        icon: 'event_available',
        labelKey: 'stats.teacherAttendance',
        value: teachersPresent.value,
        rate: teachersPresentRate.value,
        rateKey: 'stats.presentRate',
        color: '#4f46e5', bg: '#eef2ff',
        route: '/attendance/teachers',
        permission: 'teacher_attendance.view',
        roles: ['SCHOOL_MANAGER', 'ASSISTANT_MANAGER'],
        live: teachersPresent.live && teachersPresentRate.live && teachersAbsent.live && teachersAbsentRate.live,
        split: {
          presentCount: teachersPresent.value,
          presentRate: teachersPresentRate.value,
          absentCount: teachersAbsent.value,
          absentRate: teachersAbsentRate.value
        }
      },
      {
        icon: 'task_alt',
        labelKey: 'stats.tasks',
        value: String(d.tasksCount),
        rate: this.tasksHint(d),
        rateKey: '',
        color: '#0d9488', bg: '#f0fdfa',
        route: '/tasks',
        live: d.live.tasks
      },
      {
        icon: 'calendar_view_week',
        labelKey: 'stats.schedule',
        value: this.weekdayLabel(),
        rate: this.lang.translate(this.scheduleOpen ? 'stats.scheduleHide' : 'stats.scheduleHint'),
        rateKey: '',
        color: '#7c3aed', bg: '#f5f3ff',
        action: 'schedule',
        live: true
      },
      {
        icon: 'calendar_month',
        labelKey: 'stats.calendar',
        value: this.todayLabel(),
        rate: this.lang.translate(this.calendarOpen ? 'stats.calendarHide' : 'stats.calendarHint'),
        rateKey: '',
        color: '#2563eb', bg: '#eff6ff',
        action: 'calendar',
        live: true
      }
    ];
    this.cards = all.filter(c =>
      (!c.permission || this.auth.hasPermission(c.permission)) &&
      (!c.roles?.length || this.auth.hasAnyRole(c.roles))
    );
  }

  private figure(value: number | null, sample: number): { value: string; live: boolean } {
    return value == null ? { value: String(sample), live: false } : { value: String(value), live: true };
  }

  private percent(value: number | null, sample: number): { value: string; live: boolean } {
    return value == null ? { value: `${sample}%`, live: false } : { value: `${value}%`, live: true };
  }

  isActionOpen(stat: StatCard): boolean {
    return stat.action === 'calendar' ? this.calendarOpen : this.scheduleOpen;
  }

  toggleAction(stat: StatCard): void {
    if (stat.action === 'calendar') this.calendarToggle.emit();
    else this.scheduleToggle.emit();
  }

  actionHint(stat: StatCard): string {
    if (stat.action === 'calendar') {
      return this.calendarOpen ? 'stats.calendarHide' : 'stats.calendarHint';
    }
    return this.scheduleOpen ? 'stats.scheduleHide' : 'stats.scheduleHint';
  }

  private todayLabel(): string {
    const locale = this.lang.isEnglish() ? 'en-GB' : 'ar-u-nu-latn';
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(new Date());
  }

  private weekdayLabel(): string {
    const locale = this.lang.isEnglish() ? 'en-GB' : 'ar-u-nu-latn';
    return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(new Date());
  }

  private tasksHint(d: HomeStats): string {
    if (!d.tasksCount) return this.lang.translate('stats.tasksNone');
    const parts: string[] = [];
    if (d.tasksOpenCount) parts.push(`${d.tasksOpenCount} ${this.lang.translate('stats.tasksOpen')}`);
    if (d.tasksOverdueCount) parts.push(`${d.tasksOverdueCount} ${this.lang.translate('stats.tasksOverdue')}`);
    if (d.tasksCompletedCount) parts.push(`${d.tasksCompletedCount} ${this.lang.translate('stats.tasksCompleted')}`);
    return parts.join(' · ') || this.lang.translate('stats.tasksNone');
  }
}
