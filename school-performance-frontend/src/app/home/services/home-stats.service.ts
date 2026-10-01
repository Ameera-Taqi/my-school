import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DashboardStats, SchoolTask, TaskListResponse, AlertItem } from '../../core/models';
import { AcademicStageApiService } from '../../academic-stages/services/academic-stage-api.service';
import { DepartmentApiService } from '../../departments/services/department-api.service';
import { MeetingApiService } from '../../meetings/services/meeting-api.service';
import { TaskApiService } from '../../tasks/services/task-api.service';
import { AttendanceApiService } from '../../attendance/services/attendance-api.service';
import { InternalRequestMockService } from '../../internal-requests/services/internal-request-mock.service';
import { AlertMockService } from '../../alerts/services/alert-mock.service';
import { AuthService } from '../../core/services/auth.service';

export interface HomeStats extends Omit<DashboardStats, 'attendanceRate'> {
  /** null when no attendance has been recorded today */
  attendanceRate: number | null;
  attendanceRecorded: number;
  departmentsCount: number;
  studentPresentCount: number | null;
  studentPresentRate: number | null;
  studentAbsentCount: number | null;
  studentAbsentRate: number | null;
  teacherPresentCount: number | null;
  teacherPresentRate: number | null;
  teacherAbsentCount: number | null;
  teacherAbsentRate: number | null;
  tasksCount: number;
  tasksOpenCount: number;
  tasksOverdueCount: number;
  tasksCompletedCount: number;
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
    const emptyTasks: TaskListResponse = { items: [], summary: { total: 0, newCount: 0, inProgress: 0, overdue: 0, completed: 0 } };
    return forkJoin({
      stages: can('students.view', 'dashboard.view', 'kpi.view', 'attendance.view') ? this.stageApi.getAll().pipe(catchError(() => of([]))) : of([]),
      departments: can('teachers.view', 'departments.view', 'dashboard.view', 'teacher_attendance.view') ? this.departmentApi.getAll().pipe(catchError(() => of([]))) : of([]),
      meetings: can('meetings.view', 'meetings.create') ? this.meetings.getAll().pipe(catchError(() => of([]))) : of([]),
      tasks: can('tasks.view', 'tasks.create') ? this.tasks.list('mine').pipe(catchError(() => of(emptyTasks))) : of(emptyTasks),
      requests: can('internal_requests.view') ? this.requests.getAll().pipe(catchError(() => of([]))) : of([]),
      alerts: can('alerts.view') ? this.alerts.getAll().pipe(catchError(() => of([]))) : of([]),
      attendance: can('dashboard.view', 'attendance.view', 'attendance.manage', 'teacher_attendance.view') ? this.attendance.getSummary().pipe(catchError(() => of(null))) : of(null)
    }).pipe(
      map(({ stages, departments, meetings, tasks, requests, alerts, attendance }) => {
        const studentsCount = stages.reduce((n, s) => n + (s.studentCount ?? 0), 0);
        const classesCount = stages.reduce((n, s) => n + (s.classCount ?? 0), 0);
        const teachersCount = departments.reduce((n, d) => n + (d.teacherCount ?? 0), 0);
        const openRequests = requests.filter(r => r.status === 'NEW' || r.status === 'IN_REVIEW');
        const newAlerts = alerts.filter(a => a.status === 'NEW');
        const sortedMeetings = [...meetings].sort((a, b) => (b.meetingDate ?? '').localeCompare(a.meetingDate ?? ''));
        const assignedTasks = [...tasks.items].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
        const summary = tasks.summary;

        const studentRecorded = (attendance?.recorded ?? 0) > 0;
        const teacherRecorded = (attendance?.teachersRecorded ?? 0) > 0;
        const tasksOpenCount = summary.newCount + summary.inProgress;
        return {
          studentsCount: (attendance?.studentsTotal ?? 0) || studentsCount,
          teachersCount: (attendance?.teachersTotal ?? 0) || teachersCount,
          classesCount,
          departmentsCount: departments.length,
          attendanceRate: attendance?.rate ?? null,
          attendanceRecorded: attendance?.recorded ?? 0,
          studentPresentCount: studentRecorded ? (attendance!.present + attendance!.late) : null,
          studentPresentRate: attendance?.rate ?? null,
          studentAbsentCount: studentRecorded ? attendance!.absent : null,
          studentAbsentRate: attendance?.absentRate ?? null,
          teacherPresentCount: teacherRecorded ? (attendance!.teachersPresent + attendance!.teachersLate) : null,
          teacherPresentRate: attendance?.teacherRate ?? null,
          teacherAbsentCount: teacherRecorded ? attendance!.teachersAbsent : null,
          teacherAbsentRate: attendance?.teacherAbsentRate ?? null,
          tasksCount: summary.total,
          tasksOpenCount,
          tasksOverdueCount: summary.overdue,
          tasksCompletedCount: summary.completed,
          openRequestsCount: openRequests.length,
          alertsCount: newAlerts.length,
          recentMeetings: sortedMeetings.slice(0, 4).map(m => ({ id: m.id!, title: m.title, date: m.meetingDate })),
          recentTasks: assignedTasks.slice(0, 4).map(t => ({ id: t.id!, title: t.title, dueDate: t.dueDate, status: t.status, assignedByName: t.assignedByName })),
          recentAlerts: [...alerts].sort((a, b) => b.alertDate.localeCompare(a.alertDate)).slice(0, 4),
          live: { students: true, teachers: true, classes: true, attendance: true, meetings: true, tasks: true, requests: false, alerts: false }
        };
      })
    );
  }
}
