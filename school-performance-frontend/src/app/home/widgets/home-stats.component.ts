import { Component, Input, OnChanges, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { HomeStats } from '../services/home-stats.service';

interface StatCard { icon: string; label: string; value: string; suffix?: string; color: string; bg: string; route: string; permission: string; live: boolean; }

/** Key figures. Each card needs its own permission; the widget disappears when none apply. */
@Component({
  selector: 'app-home-stats',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, MatIconModule, MatTooltipModule],
  template: `
    @if (loading) {
      <div class="stats-grid">
        @for (i of [1,2,3,4]; track i) {
          <div class="stat-card skeleton-card"><span class="skeleton icon"></span><div><span class="skeleton line w40"></span><span class="skeleton line w70"></span></div></div>
        }
      </div>
    } @else if (cards.length) {
      <div class="stats-grid">
        @for (stat of cards; track stat.label) {
          <a class="stat-card link" [routerLink]="stat.route" [matTooltip]="'فتح ' + stat.label">
            <span class="stat-icon" [style.background]="stat.bg" [style.color]="stat.color"><mat-icon>{{ stat.icon }}</mat-icon></span>
            <div class="stat-info">
              <span class="stat-value">{{ stat.value }}<small>{{ stat.suffix }}</small></span>
              <span class="stat-label">{{ stat.label }} @if (!stat.live) { <span class="demo-tag" matTooltip="بيانات تجريبية حتى ربط هذه الوحدة بقاعدة البيانات">تجريبي</span> }</span>
            </div>
            <mat-icon class="stat-arrow">arrow_back</mat-icon>
          </a>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
    .stat-card {
      position: relative; display: flex; align-items: center; gap: 0.9rem; padding: 1rem 1.1rem;
      background: var(--sp-surface); border: 1px solid var(--sp-border); border-radius: var(--sp-radius); box-shadow: var(--sp-shadow);
      color: inherit; text-decoration: none; transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
      &.link { cursor: pointer; }
      &.link:hover { transform: translateY(-2px); box-shadow: var(--sp-shadow-md); border-color: #c5cae9; .stat-arrow { opacity: 1; transform: translateX(0); } }
    }
    .stat-icon { width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; mat-icon { font-size: 26px; width: 26px; height: 26px; } }
    .stat-info { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--sp-primary); small { font-size: 0.9rem; margin-inline-start: 1px; } }
    .stat-label { color: var(--sp-text-muted); font-size: 0.82rem; display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
    .demo-tag { font-size: 0.65rem; background: #fff8e1; color: #b26a00; border-radius: 999px; padding: 0 6px; font-weight: 600; }
    .stat-arrow { position: absolute; inset-inline-end: 10px; top: 50%; margin-top: -10px; font-size: 20px; width: 20px; height: 20px; color: var(--sp-text-faint); opacity: 0; transform: translateX(-4px); transition: all 0.15s; }
    .skeleton-card { .icon { width: 48px; height: 48px; border-radius: 12px; } > div { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; } .line { height: 12px; display: block; } .w40 { width: 40%; height: 18px; } .w70 { width: 70%; } }
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
      { icon: 'school', label: 'الطلاب', value: String(d.studentsCount), color: '#1976d2', bg: '#e3f2fd', route: '/students', permission: 'students.view', live: d.live.students },
      { icon: 'person', label: 'المعلمون', value: String(d.teachersCount), color: '#388e3c', bg: '#e8f5e9', route: '/teachers', permission: 'teachers.view', live: d.live.teachers },
      { icon: 'class', label: 'الفصول', value: String(d.classesCount), color: '#0288d1', bg: '#e1f5fe', route: '/students', permission: 'students.view', live: d.live.classes },
      { icon: 'event_available', label: d.attendanceRate == null ? 'لم يُسجَّل حضور اليوم' : 'نسبة الحضور اليوم', value: d.attendanceRate == null ? '—' : String(d.attendanceRate), suffix: d.attendanceRate == null ? '' : '%', color: '#f57c00', bg: '#fff3e0', route: '/attendance/students', permission: 'attendance.view', live: d.live.attendance },
      { icon: 'inbox', label: 'طلبات مفتوحة', value: String(d.openRequestsCount), color: '#7b1fa2', bg: '#f3e5f5', route: '/internal-requests', permission: 'internal_requests.view', live: d.live.requests },
      { icon: 'notifications_active', label: 'تنبيهات جديدة', value: String(d.alertsCount), color: '#c62828', bg: '#ffebee', route: '/alerts', permission: 'alerts.view', live: d.live.alerts }
    ];
    this.cards = all.filter(c => this.auth.hasPermission(c.permission));
  }
}
