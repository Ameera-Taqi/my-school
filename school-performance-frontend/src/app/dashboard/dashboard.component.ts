import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatListModule } from '@angular/material/list';
import { DashboardCalendarComponent } from '../calendar/dashboard-calendar/dashboard-calendar.component';
import { HasPermissionPipe } from '../shared/pipes/has-permission.pipe';
import { AppDatePipe } from '../shared/pipes/app-date.pipe';
import { DashboardData, DashboardService } from './services/dashboard.service';
import { AuthService } from '../core/services/auth.service';
import { ALERT_TYPE_LABELS, TASK_STATUS_LABELS } from '../shared/constants/labels';

interface StatCard {
  icon: string;
  label: string;
  value: string;
  suffix?: string;
  color: string;
  bg: string;
  route?: string;
  permission?: string;
  live: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule, MatListModule,
    DashboardCalendarComponent, HasPermissionPipe, AppDatePipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);

  readonly taskStatusLabels = TASK_STATUS_LABELS;
  readonly alertTypeLabels = ALERT_TYPE_LABELS;
  readonly today = new Date();

  loading = true;
  stats: DashboardData | null = null;
  statCards: StatCard[] = [];

  get greeting(): string {
    const h = this.today.getHours();
    const name = (this.authService.fullName() || '').split(' ')[0];
    const salute = h < 12 ? 'صباح الخير' : h < 17 ? 'مساء الخير' : 'مساء الخير';
    return name ? `${salute}، ${name}` : salute;
  }

  ngOnInit(): void {
    this.dashboardService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.statCards = [
          { icon: 'school', label: 'الطلاب', value: String(data.studentsCount), color: '#1976d2', bg: '#e3f2fd', route: '/students', permission: 'students.view', live: data.live.students },
          { icon: 'person', label: 'المعلمون', value: String(data.teachersCount), color: '#388e3c', bg: '#e8f5e9', route: '/teachers', permission: 'teachers.view', live: data.live.teachers },
          { icon: 'class', label: 'الفصول', value: String(data.classesCount), color: '#0288d1', bg: '#e1f5fe', route: '/students', permission: 'students.view', live: data.live.classes },
          { icon: 'event_available', label: data.attendanceRate == null ? 'لم يُسجَّل حضور اليوم' : 'نسبة الحضور اليوم', value: data.attendanceRate == null ? '—' : String(data.attendanceRate), suffix: data.attendanceRate == null ? '' : '%', color: '#f57c00', bg: '#fff3e0', route: '/attendance/students', permission: 'attendance.view', live: data.live.attendance },
          { icon: 'inbox', label: 'طلبات مفتوحة', value: String(data.openRequestsCount), color: '#7b1fa2', bg: '#f3e5f5', route: '/internal-requests', permission: 'internal_requests.view', live: data.live.requests },
          { icon: 'notifications_active', label: 'تنبيهات جديدة', value: String(data.alertsCount), color: '#c62828', bg: '#ffebee', route: '/alerts', permission: 'alerts.view', live: data.live.alerts }
        ];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });

  }

  canOpen(card: StatCard): boolean {
    return !!card.route && (!card.permission || this.authService.hasPermission(card.permission));
  }

  taskChip(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'OVERDUE': return 'danger';
      case 'IN_PROGRESS': return 'warning';
      default: return 'info';
    }
  }

  severityChip(severity: string): string {
    return severity === 'HIGH' ? 'danger' : severity === 'MEDIUM' ? 'warning' : 'neutral';
  }

}

