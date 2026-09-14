import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { AuthService } from '../../core/services/auth.service';
import { HomeStats } from '../services/home-stats.service';
import { ALERT_TYPE_LABELS, TASK_STATUS_LABELS } from '../../shared/constants/labels';

/** Recent meetings, upcoming tasks and latest alerts, each behind its own permission. */
@Component({
  selector: 'app-home-lists',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule, AppDatePipe],
  template: `
    <div class="lists-row">
      @if (can('meetings.view')) {
        <mat-card class="list-card">
          <div class="card-head"><h3><mat-icon>groups</mat-icon> آخر الاجتماعات</h3><a mat-button routerLink="/meetings">الكل</a></div>
          @if (!stats?.recentMeetings?.length) { <p class="muted">لا توجد اجتماعات</p> } @else {
            <ul class="simple-list">@for (m of stats?.recentMeetings; track m.id) { <li><span class="li-title">{{ m.title }}</span><span class="li-meta">{{ m.date | appDate:'withTime' }}</span></li> }</ul>
          }
        </mat-card>
      }
      @if (can('tasks.view')) {
        <mat-card class="list-card">
          <div class="card-head"><h3><mat-icon>task_alt</mat-icon> المهام القادمة</h3><a mat-button routerLink="/tasks">الكل</a></div>
          @if (!stats?.recentTasks?.length) { <p class="muted">لا توجد مهام</p> } @else {
            <ul class="simple-list">@for (t of stats?.recentTasks; track t.id) { <li><span class="li-title">{{ t.title }}</span><span class="li-meta"><span class="chip" [class]="'chip ' + taskChip(t.status)">{{ taskStatusLabels[t.status] || t.status }}</span> {{ t.dueDate | appDate }}</span></li> }</ul>
          }
        </mat-card>
      }
      @if (can('alerts.view')) {
        <mat-card class="list-card">
          <div class="card-head"><h3><mat-icon>notifications_active</mat-icon> آخر التنبيهات</h3><a mat-button routerLink="/alerts">الكل</a></div>
          @if (!stats?.recentAlerts?.length) { <p class="muted">لا توجد تنبيهات</p> } @else {
            <ul class="alert-list">@for (a of stats?.recentAlerts; track a.id) { <li [class.reviewed]="a.status === 'REVIEWED'"><span class="chip" [class]="'chip ' + severityChip(a.severity)">{{ alertTypeLabels[a.alertType] || a.alertType }}</span><span class="li-title">{{ a.title }}</span><span class="li-date">{{ a.alertDate | appDate }}</span></li> }</ul>
          }
        </mat-card>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .lists-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; }
    .list-card { padding: 1rem 1.25rem; }
    .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; h3 { margin: 0; font-size: 1rem; color: var(--sp-primary); display: flex; align-items: center; gap: 0.4rem; mat-icon { font-size: 20px; width: 20px; height: 20px; } } }
    .muted { color: var(--sp-text-muted); margin: 0.5rem 0; font-size: 0.9rem; }
    .simple-list, .alert-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .simple-list li { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.55rem 0; border-bottom: 1px solid var(--sp-border); &:last-child { border-bottom: none; } }
    .li-title { font-weight: 600; font-size: 0.92rem; }
    .li-meta { font-size: 0.8rem; color: var(--sp-text-muted); display: flex; align-items: center; gap: 0.4rem; }
    .li-date { font-size: 0.78rem; color: var(--sp-text-faint); margin-inline-start: auto; white-space: nowrap; }
    .alert-list li { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; padding: 0.55rem 0; border-bottom: 1px solid var(--sp-border); &:last-child { border-bottom: none; } &.reviewed { opacity: 0.6; } .li-title { flex-basis: 100%; } }
  `]
})
export class HomeListsComponent {
  @Input() stats: HomeStats | null = null;
  private readonly auth = inject(AuthService);
  readonly taskStatusLabels = TASK_STATUS_LABELS;
  readonly alertTypeLabels = ALERT_TYPE_LABELS;
  can(p: string): boolean { return this.auth.hasPermission(p); }
  taskChip(status: string): string { return status === 'COMPLETED' ? 'success' : status === 'OVERDUE' ? 'danger' : status === 'IN_PROGRESS' ? 'warning' : 'info'; }
  severityChip(severity: string): string { return severity === 'HIGH' ? 'danger' : severity === 'MEDIUM' ? 'warning' : 'neutral'; }
}
