import { Component, Input, OnChanges, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { HomeStats } from '../services/home-stats.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

interface StatCard {
  icon: string;
  labelKey: string;
  value: string;
  suffix?: string;
  color: string;
  bg: string;
  route: string;
  permission: string;
  live: boolean;
}

/** Key figures. Each card needs its own permission; the widget disappears when none apply. */
@Component({
  selector: 'app-home-stats',
  standalone: true,
  imports: [UiIconComponent, RouterLink, MatTooltipModule, TranslatePipe],
  host: { class: 'block' },
  template: `
    @if (loading) {
      <div class="mb-5 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
        @for (i of [1,2,3,4]; track i) {
          <div class="flex min-h-[118px] flex-col justify-between gap-[0.85rem] rounded-2xl border border-border bg-white/90 p-4 shadow-sp backdrop-blur-md">
            <span class="skeleton size-[38px] rounded-sp-sm"></span>
            <div class="flex flex-1 flex-col gap-2">
              <span class="skeleton block h-[18px] w-2/5"></span>
              <span class="skeleton block h-3 w-[70%]"></span>
            </div>
          </div>
        }
      </div>
    } @else if (cards.length) {
      <div class="mb-5 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
        @for (stat of cards; track stat.labelKey) {
          <a
            class="group relative flex min-h-[118px] cursor-pointer flex-col justify-between gap-[0.85rem] rounded-2xl border border-border bg-white/90 p-4 text-inherit no-underline shadow-sp backdrop-blur-md transition hover:-translate-y-[3px] hover:border-indigo-200 hover:shadow-sp-md"
            [routerLink]="stat.route"
            [matTooltip]="('common.open' | translate) + ' ' + (stat.labelKey | translate)">
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
            <div class="flex min-w-0 flex-col leading-tight">
              <span class="text-[1.55rem] font-black tracking-tight text-text">{{ stat.value }}<small class="ms-px text-[0.9rem]">{{ stat.suffix }}</small></span>
            </div>
            <app-ui-icon name="arrow_back" class="absolute end-2.5 top-1/2 -mt-2.5 text-base text-faint opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 -translate-x-1"></app-ui-icon>
          </a>
        }
      </div>
    }
  `
})
export class HomeStatsComponent implements OnChanges {
  @Input() stats: HomeStats | null = null;
  @Input() loading = false;
  private readonly auth = inject(AuthService);
  cards: StatCard[] = [];

  ngOnChanges(): void {
    const d = this.stats;
    if (!d) { this.cards = []; return; }
    const all: StatCard[] = [
      { icon: 'school', labelKey: 'stats.students', value: String(d.studentsCount), color: '#4f46e5', bg: '#eef2ff', route: '/students', permission: 'students.view', live: d.live.students },
      { icon: 'how_to_reg', labelKey: 'stats.teachers', value: String(d.teachersCount), color: '#059669', bg: '#ecfdf5', route: '/teachers', permission: 'teachers.view', live: d.live.teachers },
      { icon: 'menu_book', labelKey: 'stats.classes', value: String(d.classesCount), color: '#2563eb', bg: '#eff6ff', route: '/students', permission: 'students.view', live: d.live.classes },
      {
        icon: 'event_available',
        labelKey: d.attendanceRate == null ? 'stats.attendanceMissing' : 'stats.attendanceRate',
        value: d.attendanceRate == null ? '—' : String(d.attendanceRate),
        suffix: d.attendanceRate == null ? '' : '%',
        color: '#d97706', bg: '#fffbeb', route: '/attendance/students', permission: 'attendance.view', live: d.live.attendance
      },
      { icon: 'view_kanban', labelKey: 'stats.openRequests', value: String(d.openRequestsCount), color: '#7c3aed', bg: '#f5f3ff', route: '/internal-requests', permission: 'internal_requests.view', live: d.live.requests },
      { icon: 'notifications', labelKey: 'stats.newAlerts', value: String(d.alertsCount), color: '#e11d48', bg: '#fff1f2', route: '/alerts', permission: 'alerts.view', live: d.live.alerts }
    ];
    this.cards = all.filter(c => this.auth.hasPermission(c.permission));
  }
}
