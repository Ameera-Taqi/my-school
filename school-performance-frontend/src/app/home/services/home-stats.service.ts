import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DashboardStats } from '../../core/models';
import { AcademicStageApiService } from '../../academic-stages/services/academic-stage-api.service';
import { DepartmentApiService } from '../../departments/services/department-api.service';
import { MeetingApiService } from '../../meetings/services/meeting-api.service';
import { TaskApiService } from '../../tasks/services/task-api.service';
import { AttendanceApiService } from '../../attendance/services/attendance-api.service';
import { InternalRequestMockService } from '../../internal-requests/services/internal-request-mock.service';
import { AlertMockService } from '../../alerts/services/alert-mock.service';
import { AlertItem } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';

export interface HomeStats extends Omit<DashboardStats, 'attendanceRate'> {
  /** null when no attendance has been recorded today */
  attendanceRate: number | null;
  attendanceRecorded: number;
  departmentsCount: number;
  /** Which figures come from the live database vs demo modules. */
  live: { students: boolean; teachers: boolean; classes: boolean; attendance: boolean; meetings: boolean; tasks: boolean; requests: boolean; alerts: boolean };
  recentAlerts: AlertItem[];
}

/**
 * Dashboard figures. Students, teachers, classes, departments, attendance, meetings and tasks
 * are read from the API. Internal requests and alerts still come from demo modules.
 */
@Injectable({ providedIn: 'root' })
export class HomeStatsService {
  private readonly stageApi = inject(AcademicStageApiService);
  private readonly departmentApi = inject(DepartmentApiService);
  private readonly meetings = inject(MeetingApiService);
  private readonly tasks = inject(TaskApiService);
  private readonly attendance = inject(AttendanceApiService);
  private readonly requests = inject(InternalRequestMockService);
  private readonly alerts = inject(AlertMockService);
  private readonly auth = inject(AuthService);

  getStats(): Observable<HomeStats> {
    // Only call endpoints the user may access, so limited roles never trigger 403 toasts on the home page.
    const can = (...keys: string[]) => keys.some(k => this.auth.hasPermission(k));
    return forkJoin({
      stages: can('students.view', 'dashboard.view', 'kpi.view') ? this.stageApi.getAll().pipe(catchError(() => of([]))) : of([]),
      departments: can('teachers.view', 'departments.view', 'dashboard.view') ? this.departmentApi.getAll().pipe(catchError(() => of([]))) : of([]),
      meetings: can('meetings.view', 'meetings.create') ? this.meetings.getAll().pipe(catchError(() => of([]))) : of([]),
      tasks: can('tasks.view', 'tasks.create') ? this.tasks.getAll().pipe(catchError(() => of([]))) : of([]),
      requests: can('internal_requests.view') ? this.requests.getAll().pipe(catchError(() => of([]))) : of([]),
      alerts: can('alerts.view') ? this.alerts.getAll().pipe(catchError(() => of([]))) : of([]),
      attendance: can('dashboard.view', 'attendance.view', 'attendance.manage') ? this.attendance.getSummary().pipe(catchError(() => of(null))) : of(null)
    }).pipe(
      map(({ stages, departments, meetings, tasks, requests, alerts, attendance }) => {
        const studentsCount = stages.reduce((n, s) => n + (s.studentCount ?? 0), 0);
        const classesCount = stages.reduce((n, s) => n + (s.classCount ?? 0), 0);
        const teachersCount = departments.reduce((n, d) => n + (d.teacherCount ?? 0), 0);
        const openRequests = requests.filter(r => r.status === 'NEW' || r.status === 'IN_REVIEW');
        const newAlerts = alerts.filter(a => a.status === 'NEW');
        const sortedMeetings = [...meetings].sort((a, b) => (b.meetingDate ?? '').localeCompare(a.meetingDate ?? ''));
        const sortedTasks = [...tasks].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));

        return {
          studentsCount,
          teachersCount,
          classesCount,
          departmentsCount: departments.length,
          attendanceRate: attendance?.rate ?? null,
          attendanceRecorded: attendance?.recorded ?? 0,
          openRequestsCount: openRequests.length,
          alertsCount: newAlerts.length,
          recentMeetings: sortedMeetings.slice(0, 4).map(m => ({ id: m.id!, title: m.title, date: m.meetingDate })),
          recentTasks: sortedTasks.slice(0, 4).map(t => ({ id: t.id!, title: t.title, dueDate: t.dueDate, status: t.status })),
          recentAlerts: [...alerts].sort((a, b) => b.alertDate.localeCompare(a.alertDate)).slice(0, 4),
          live: { students: true, teachers: true, classes: true, attendance: true, meetings: true, tasks: true, requests: false, alerts: false }
        };
      })
    );
  }
}
