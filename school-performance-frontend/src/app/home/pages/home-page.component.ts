import { Component, OnInit, computed, inject } from '@angular/core';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
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
  private readonly lang = inject(LanguageService);

  readonly today = new Date();
  loading = true;
  stats: HomeStats | null = null;

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    const salute = this.lang.translate(h < 12 ? 'menu.greeting.morning' : 'menu.greeting.evening');
    const role = this.roleLabel();
    const raw = (this.auth.fullName() || '').replace(/^أ\.\s*/, '').trim();
    const first = raw.split(/\s+/).filter(Boolean)[0];
    const name = first && first !== role ? first : role;
    const sep = this.lang.isEnglish() ? ', ' : '، ';
    return name ? `${salute}${sep}${name}` : salute;
  });

  readonly roleLine = computed(() => {
    const dept = this.auth.user()?.departmentName ?? '';
    const role = this.roleLabel();
    return dept ? `${role} · ${dept}` : role;
  });

  private roleLabel(): string {
    const u = this.auth.user();
    return this.lang.roleLabel(u?.roles?.[0], u?.roleNames?.[0]);
  }

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
