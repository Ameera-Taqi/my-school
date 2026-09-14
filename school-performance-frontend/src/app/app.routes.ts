import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RoleListComponent } from './roles/role-list/role-list.component';
import { PermissionListComponent } from './permissions/permission-list/permission-list.component';
import { RolePermissionsComponent } from './permissions/role-permissions/role-permissions.component';
import { StagesListComponent } from './students/stages-list/stages-list.component';
import { StageDetailsComponent } from './students/stage-details/stage-details.component';
import { ClassDetailsComponent } from './students/class-details/class-details.component';
import { DepartmentsListComponent } from './teachers/departments-list/departments-list.component';
import { DepartmentTeachersComponent } from './teachers/department-teachers/department-teachers.component';
import { StudentAttendancePageComponent } from './attendance/pages/student-attendance-page.component';
import { TeacherAttendancePageComponent } from './attendance/pages/teacher-attendance-page.component';
import { BehaviorPageComponent } from './behavior/pages/behavior-page.component';
import { InternalRequestsPageComponent } from './internal-requests/pages/internal-requests-page.component';
import { MeetingsPageComponent } from './meetings/pages/meetings-page.component';
import { TasksPageComponent } from './tasks/pages/tasks-page.component';
import { ReportsPageComponent } from './reports/pages/reports-page.component';
import { AlertsPageComponent } from './alerts/pages/alerts-page.component';
import { AcademicDepartmentsPageComponent } from './academic-departments/pages/academic-departments-page.component';
import { LessonPlansPageComponent } from './lesson-plans/pages/lesson-plans-page.component';
import { ResourceBankPageComponent } from './resource-bank/pages/resource-bank-page.component';
import { UsersPageComponent } from './users/pages/users-page.component';
import { MyClassesPageComponent } from './teacher-portal/pages/my-classes-page/my-classes-page.component';
import { MyStudentsPageComponent } from './teacher-portal/pages/my-students-page/my-students-page.component';
import { AttendanceRecordPageComponent } from './teacher-portal/pages/attendance-record-page/attendance-record-page.component';
import { AssignmentsPageComponent } from './teacher-portal/pages/assignments-page/assignments-page.component';
import { GradesPageComponent } from './teacher-portal/pages/grades-page/grades-page.component';
import { TeacherNotesPageComponent } from './teacher-portal/pages/teacher-notes-page/teacher-notes-page.component';
import { KpiPageComponent } from './kpi/pages/kpi-page.component';
import { TeacherMonitoringPageComponent } from './teacher-monitoring/pages/teacher-monitoring-page.component';
import { SubjectResultsPageComponent } from './subject-results/pages/subject-results-page.component';
import { AcademicNotesPageComponent } from './academic-notes/pages/academic-notes-page.component';
import { ClassSchedulePageComponent } from './class-schedule/pages/class-schedule-page.component';
import { SettingsPageComponent } from './settings/pages/settings-page.component';
import { SectionHomePageComponent } from './section-home/pages/section-home-page.component';
import { OrgStructurePageComponent } from './org-structure/pages/org-structure-page.component';
import { HEADS_PERMISSIONS, TEACHERS_PERMISSIONS, SYSTEM_PERMISSIONS } from './core/constants/sidebar.config';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, canActivate: [permissionGuard], data: { permission: 'dashboard.view' } },

      { path: 'kpi', component: KpiPageComponent, canActivate: [permissionGuard], data: { permission: 'kpi.view' } },
      { path: 'reports', component: ReportsPageComponent, canActivate: [permissionGuard], data: { permission: 'reports.view' } },
      { path: 'meetings', component: MeetingsPageComponent, canActivate: [permissionGuard], data: { permission: 'meetings.view' } },
      { path: 'tasks', component: TasksPageComponent, canActivate: [permissionGuard], data: { permission: 'tasks.view' } },
      { path: 'org-structure', component: OrgStructurePageComponent, canActivate: [permissionGuard], data: { permission: 'org_structure.view' } },

      { path: 'students', component: StagesListComponent, canActivate: [permissionGuard], data: { permission: 'students.view' } },
      { path: 'students/stages/:stageId', component: StageDetailsComponent, canActivate: [permissionGuard], data: { permission: 'students.view' } },
      { path: 'students/classes/:classId', component: ClassDetailsComponent, canActivate: [permissionGuard], data: { permission: 'students.view' } },
      { path: 'teachers', component: DepartmentsListComponent, canActivate: [permissionGuard], data: { permission: 'teachers.view' } },
      { path: 'teachers/departments/:departmentId', component: DepartmentTeachersComponent, canActivate: [permissionGuard], data: { permission: 'teachers.view' } },
      { path: 'attendance', redirectTo: 'attendance/students', pathMatch: 'full' },
      { path: 'attendance/students', component: StudentAttendancePageComponent, canActivate: [permissionGuard], data: { permission: 'attendance.view' } },
      { path: 'attendance/teachers', component: TeacherAttendancePageComponent, canActivate: [permissionGuard], data: { permission: 'teacher_attendance.view' } },
      { path: 'behavior', component: BehaviorPageComponent, canActivate: [permissionGuard], data: { permission: 'behavior.view' } },
      { path: 'internal-requests', component: InternalRequestsPageComponent, canActivate: [permissionGuard], data: { permission: 'internal_requests.view' } },
      { path: 'alerts', component: AlertsPageComponent, canActivate: [permissionGuard], data: { permission: 'alerts.view' } },

      { path: 'teacher-monitoring', component: TeacherMonitoringPageComponent, canActivate: [permissionGuard], data: { permission: 'teacher_monitoring.view' } },
      { path: 'heads-home', component: SectionHomePageComponent, canActivate: [permissionGuard], data: { permission: HEADS_PERMISSIONS, sectionTitleKey: 'section.heads' } },
      { path: 'lesson-plans', component: LessonPlansPageComponent, canActivate: [permissionGuard], data: { permission: 'lesson_plans.view' } },
      { path: 'class-schedule', component: ClassSchedulePageComponent, canActivate: [permissionGuard], data: { permission: 'class_schedule.view' } },
      { path: 'subject-results', component: SubjectResultsPageComponent, canActivate: [permissionGuard], data: { permission: 'subject_results.view' } },
      { path: 'academic-notes', component: AcademicNotesPageComponent, canActivate: [permissionGuard], data: { permission: 'academic_notes.view' } },
      { path: 'resource-bank', component: ResourceBankPageComponent, canActivate: [permissionGuard], data: { permission: 'resource_bank.view' } },

      { path: 'my-classes', component: MyClassesPageComponent, canActivate: [permissionGuard], data: { permission: 'my_classes.view' } },
      { path: 'teachers-home', component: SectionHomePageComponent, canActivate: [permissionGuard], data: { permission: TEACHERS_PERMISSIONS, sectionTitleKey: 'section.teachers' } },
      { path: 'my-students', component: MyStudentsPageComponent, canActivate: [permissionGuard], data: { permission: 'my_students.view' } },
      { path: 'attendance-record', component: AttendanceRecordPageComponent, canActivate: [permissionGuard], data: { permission: 'attendance_record.view' } },
      { path: 'assignments', component: AssignmentsPageComponent, canActivate: [permissionGuard], data: { permission: 'assignments.view' } },
      { path: 'grades', component: GradesPageComponent, canActivate: [permissionGuard], data: { permission: 'grades.view' } },
      { path: 'notes', component: TeacherNotesPageComponent, canActivate: [permissionGuard], data: { permission: 'notes.view' } },

      { path: 'users', component: UsersPageComponent, canActivate: [permissionGuard], data: { permission: 'users.view' } },
      { path: 'system-home', component: SectionHomePageComponent, canActivate: [permissionGuard], data: { permission: SYSTEM_PERMISSIONS, sectionTitleKey: 'section.system' } },
      { path: 'roles', component: RoleListComponent, canActivate: [permissionGuard], data: { permission: 'roles.view' } },
      { path: 'permissions', component: PermissionListComponent, canActivate: [permissionGuard], data: { permission: 'permissions.view' } },
      { path: 'role-permissions', component: RolePermissionsComponent, canActivate: [permissionGuard], data: { permission: 'role_permissions.manage' } },
      { path: 'departments', component: AcademicDepartmentsPageComponent, canActivate: [permissionGuard], data: { permission: 'departments.view' } },
      { path: 'settings', component: SettingsPageComponent, canActivate: [permissionGuard], data: { permission: 'settings.view' } }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
