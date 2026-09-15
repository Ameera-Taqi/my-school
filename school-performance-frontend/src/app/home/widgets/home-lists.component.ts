import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { AuthService } from '../../core/services/auth.service';
import { HomeStats } from '../services/home-stats.service';
import { ALERT_TYPE_LABELS, TASK_STATUS_LABELS } from '../../shared/constants/labels';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

/** Recent meetings, upcoming tasks and latest alerts, each behind its own permission. */
@Component({
  selector: 'app-home-lists',
  standalone: true,
  imports: [UiIconComponent, RouterLink, MatCardModule, MatButtonModule, AppDatePipe],
  host: { class: 'block' },
  template: `
    <div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
      @if (can('meetings.view')) {
        <mat-card class="px-5 py-4">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="m-0 flex items-center gap-1.5 text-base text-primary"><app-ui-icon name="groups" class="size-5 text-[20px]"></app-ui-icon> آخر الاجتماعات</h3>
            <a mat-button routerLink="/meetings">الكل</a>
          </div>
          @if (!stats?.recentMeetings?.length) {
            <p class="my-2 text-[0.9rem] text-muted">لا توجد اجتماعات</p>
          } @else {
            <ul class="m-0 flex list-none flex-col p-0">
              @for (m of stats?.recentMeetings; track m.id) {
                <li class="flex flex-col gap-[0.15rem] border-b border-border py-[0.55rem] last:border-b-0">
                  <span class="text-[0.92rem] font-semibold">{{ m.title }}</span>
                  <span class="text-[0.8rem] text-muted">{{ m.date | appDate:'withTime' }}</span>
                </li>
              }
            </ul>
          }
        </mat-card>
      }
      @if (can('tasks.view')) {
        <mat-card class="px-5 py-4">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="m-0 flex items-center gap-1.5 text-base text-primary"><app-ui-icon name="task_alt" class="size-5 text-[20px]"></app-ui-icon> المهام القادمة</h3>
            <a mat-button routerLink="/tasks">الكل</a>
          </div>
          @if (!stats?.recentTasks?.length) {
            <p class="my-2 text-[0.9rem] text-muted">لا توجد مهام</p>
          } @else {
            <ul class="m-0 flex list-none flex-col p-0">
              @for (t of stats?.recentTasks; track t.id) {
                <li class="flex flex-col gap-[0.15rem] border-b border-border py-[0.55rem] last:border-b-0">
                  <span class="text-[0.92rem] font-semibold">{{ t.title }}</span>
                  <span class="flex items-center gap-1.5 text-[0.8rem] text-muted">
                    <span class="chip" [class]="'chip ' + taskChip(t.status)">{{ taskStatusLabels[t.status] || t.status }}</span>
                    {{ t.dueDate | appDate }}
                  </span>
                </li>
              }
            </ul>
          }
        </mat-card>
      }
      @if (can('alerts.view')) {
        <mat-card class="px-5 py-4">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="m-0 flex items-center gap-1.5 text-base text-primary"><app-ui-icon name="notifications_active" class="size-5 text-[20px]"></app-ui-icon> آخر التنبيهات</h3>
            <a mat-button routerLink="/alerts">الكل</a>
          </div>
          @if (!stats?.recentAlerts?.length) {
            <p class="my-2 text-[0.9rem] text-muted">لا توجد تنبيهات</p>
          } @else {
            <ul class="m-0 flex list-none flex-col p-0">
              @for (a of stats?.recentAlerts; track a.id) {
                <li class="flex flex-wrap items-center gap-1.5 border-b border-border py-[0.55rem] last:border-b-0" [class.opacity-60]="a.status === 'REVIEWED'">
                  <span class="chip" [class]="'chip ' + severityChip(a.severity)">{{ alertTypeLabels[a.alertType] || a.alertType }}</span>
                  <span class="basis-full text-[0.92rem] font-semibold">{{ a.title }}</span>
                  <span class="ms-auto text-[0.78rem] whitespace-nowrap text-faint">{{ a.alertDate | appDate }}</span>
                </li>
              }
            </ul>
          }
        </mat-card>
      }
    </div>
  `
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
