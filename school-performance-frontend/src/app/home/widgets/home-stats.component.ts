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
  template: `
    @if (loading) {
      <div class="stats-grid">
        @for (i of [1,2,3,4]; track i) {
          <div class="stat-card skeleton-card"><span class="skeleton icon"></span><div><span class="skeleton line w40"></span><span class="skeleton line w70"></span></div></div>
        }
      </div>
    } @else if (cards.length) {
      <div class="stats-grid">
        @for (stat of cards; track stat.labelKey) {
          <a class="stat-card link" [routerLink]="stat.route" [matTooltip]="('common.open' | translate) + ' ' + (stat.labelKey | translate)">
            <div class="stat-top">
              <span class="stat-label">
                {{ stat.labelKey | translate }}
                @if (!stat.live) {
                  <span class="demo-tag" [matTooltip]="'common.demoHint' | translate">{{ 'common.demo' | translate }}</span>
                }
              </span>
              <span class="stat-icon" [style.background]="stat.bg" [style.color]="stat.color"><app-ui-icon [name]="stat.icon"></app-ui-icon></span>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stat.value }}<small>{{ stat.suffix }}</small></span>
            </div>
            <app-ui-icon name="arrow_back" class="stat-arrow"></app-ui-icon>
          </a>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
    .stat-card {
      position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 0.85rem;
      padding: 1rem 1.05rem; min-height: 118px;
      background: var(--sp-surface); backdrop-filter: blur(12px);
      border: 1px solid var(--sp-border); border-radius: 1rem; box-shadow: var(--sp-shadow);
      color: inherit; text-decoration: none; transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
      &.link { cursor: pointer; }
      &.link:hover { transform: translateY(-3px); box-shadow: var(--sp-shadow-md); border-color: #c7d2fe; .stat-arrow { opacity: 1; transform: translateX(0); } }
    }
    .stat-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .stat-icon {
      width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      .app-ui-icon { font-size: 1.1rem; }
    }
    .stat-info { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
    .stat-value { font-size: 1.55rem; font-weight: 900; letter-spacing: -0.02em; color: var(--sp-text); small { font-size: 0.9rem; margin-inline-start: 1px; } }
    .stat-label { color: var(--sp-text-muted); font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
    .demo-tag { font-size: 0.65rem; background: #fff8e1; color: #b26a00; border-radius: 999px; padding: 0 6px; font-weight: 600; }
    .stat-arrow { position: absolute; inset-inline-end: 10px; top: 50%; margin-top: -10px; font-size: 1rem; color: var(--sp-text-faint); opacity: 0; transform: translateX(-4px); transition: all 0.15s; }
    .skeleton-card { .icon { width: 38px; height: 38px; border-radius: 12px; } > div { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; } .line { height: 12px; display: block; } .w40 { width: 40%; height: 18px; } .w70 { width: 70%; } }
  `]
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
