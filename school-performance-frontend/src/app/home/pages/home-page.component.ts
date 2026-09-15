import { Component, OnInit, inject } from '@angular/core';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { AuthService } from '../../core/services/auth.service';
import { DashboardCalendarComponent } from '../../calendar/dashboard-calendar/dashboard-calendar.component';
import { HomeStats, HomeStatsService } from '../services/home-stats.service';
import { HomeStatsComponent } from '../widgets/home-stats.component';
import { HomeListsComponent } from '../widgets/home-lists.component';
import { HomeMyDayComponent } from '../widgets/home-my-day.component';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

/**
 * One home page for every role. It is assembled from independent widgets; each widget checks the
 * user's permissions itself, so the same page serves management, department heads and teachers.
 */
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [UiIconComponent, AppDatePipe, HasPermissionPipe, DashboardCalendarComponent, HomeStatsComponent, HomeListsComponent, HomeMyDayComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent implements OnInit {
  private readonly statsService = inject(HomeStatsService);
  private readonly auth = inject(AuthService);

  readonly today = new Date();
  loading = true;
  stats: HomeStats | null = null;

  get greeting(): string {
    const h = this.today.getHours();
    const name = (this.auth.fullName() || '').replace(/^أ\.\s*/, '').split(' ')[0];
    const salute = h < 12 ? 'صباح الخير' : 'مساء الخير';
    return name ? `${salute}، ${name}` : salute;
  }

  get roleLine(): string {
    const u = this.auth.user();
    const role = u?.roleNames?.[0] ?? '';
    return u?.departmentName ? `${role} · ${u.departmentName}` : role;
  }

  /** Stats widget is worth loading only when at least one card is permitted. */
  get showStats(): boolean {
    return ['students.view', 'teachers.view', 'attendance.view', 'internal_requests.view', 'alerts.view', 'dashboard.view'].some(p => this.auth.hasPermission(p));
  }
  get showLists(): boolean { return ['meetings.view', 'tasks.view', 'alerts.view'].some(p => this.auth.hasPermission(p)); }
  get showMyDay(): boolean {
    const u = this.auth.user();
    return !!u?.teacherId && ['my_classes.view', 'class_schedule.view', 'teacher_attendance.view'].some(p => this.auth.hasPermission(p));
  }

  ngOnInit(): void {
    if (!this.showStats && !this.showLists) { this.loading = false; return; }
    this.statsService.getStats().subscribe({
      next: (data) => { this.stats = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
}
