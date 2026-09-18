import { SidebarSection } from '../models';

const HEADS_PERMISSIONS = [
  'teacher_monitoring.view', 'lesson_plans.view', 'subject_results.view',
  'academic_notes.view', 'resource_bank.view', 'resource_bank.manage'
];

const TEACHERS_PERMISSIONS = [
  'my_classes.view', 'my_students.view', 'attendance_record.view',
  'assignments.view', 'grades.view', 'notes.view', 'resource_bank.view'
];

const SYSTEM_PERMISSIONS = [
  'users.view', 'roles.view', 'permissions.view',
  'role_permissions.manage', 'settings.view'
];

export { HEADS_PERMISSIONS, TEACHERS_PERMISSIONS, SYSTEM_PERMISSIONS };

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    titleKey: 'section.home',
    items: [
      { labelKey: 'nav.home', icon: 'dashboard', route: '/home', permission: '*' }
    ]
  },
  {
    titleKey: 'section.executive',
    items: [
      { labelKey: 'nav.kpi', icon: 'bar_chart', route: '/kpi', permission: 'kpi.view' },
      { labelKey: 'nav.reports', icon: 'description', route: '/reports', permission: 'reports.view' },
      { labelKey: 'nav.meetings', icon: 'groups', route: '/meetings', permission: 'meetings.view' },
      { labelKey: 'nav.tasks', icon: 'check_box', route: '/tasks', permission: 'tasks.view' },
      { labelKey: 'nav.orgStructure', icon: 'hub', route: '/org-structure', permission: 'org_structure.view' }
    ]
  },
  {
    titleKey: 'section.school',
    items: [
      { labelKey: 'nav.students', icon: 'school', route: '/students', permission: 'students.view' },
      { labelKey: 'nav.teachers', icon: 'how_to_reg', route: '/teachers', permission: 'teachers.view' },
      { labelKey: 'nav.departments', icon: 'domain', route: '/departments', permission: 'departments.view' },
      { labelKey: 'nav.classSchedule', icon: 'menu_book', route: '/class-schedule', permission: 'class_schedule.view' },
      { labelKey: 'nav.attendanceStudents', icon: 'event_available', route: '/attendance/students', permission: 'attendance.view' },
      { labelKey: 'nav.attendanceTeachers', icon: 'schedule', route: '/attendance/teachers', permission: 'teacher_attendance.view' },
      { labelKey: 'nav.behavior', icon: 'shield', route: '/behavior', permission: 'behavior.view' },
      { labelKey: 'nav.internalRequests', icon: 'view_kanban', route: '/internal-requests', permission: 'internal_requests.view' },
      { labelKey: 'nav.alerts', icon: 'notifications', route: '/alerts', permission: 'alerts.view' }
    ]
  },
  {
    titleKey: 'section.wing',
    items: [
      { labelKey: 'nav.attendanceStudents', icon: 'event_available', route: '/attendance/students', permission: 'wing_supervisor.view' }
    ]
  },
  {
    titleKey: 'section.heads',
    items: [
      { labelKey: 'nav.teacherMonitoring', icon: 'supervisor_account', route: '/teacher-monitoring', permission: 'teacher_monitoring.view' },
      { labelKey: 'nav.lessonPlans', icon: 'menu_book', route: '/lesson-plans', permission: 'lesson_plans.view' },
      { labelKey: 'nav.subjectResults', icon: 'bar_chart', route: '/subject-results', permission: 'subject_results.view' },
      { labelKey: 'nav.academicNotes', icon: 'sticky_note_2', route: '/academic-notes', permission: 'academic_notes.view' },
      { labelKey: 'nav.resourceBank', icon: 'folder_open', route: '/resource-bank', permission: 'resource_bank.manage' }
    ]
  },
  {
    titleKey: 'section.teachers',
    items: [
      { labelKey: 'nav.myClasses', icon: 'class', route: '/my-classes', permission: 'my_classes.view' },
      { labelKey: 'nav.myStudents', icon: 'groups', route: '/my-students', permission: 'my_students.view' },
      { labelKey: 'nav.attendanceRecord', icon: 'how_to_reg', route: '/attendance-record', permission: 'attendance_record.view' },
      { labelKey: 'nav.assignments', icon: 'assignment', route: '/assignments', permission: 'assignments.view' },
      { labelKey: 'nav.grades', icon: 'grade', route: '/grades', permission: 'grades.view' },
      { labelKey: 'nav.notes', icon: 'comment', route: '/notes', permission: 'notes.view' },
      { labelKey: 'nav.resourceBank', icon: 'folder_open', route: '/resource-bank', permission: 'resource_bank.view' }
    ]
  },
  {
    titleKey: 'section.system',
    items: [
      { labelKey: 'nav.users', icon: 'manage_accounts', route: '/users', permission: 'users.view' },
      { labelKey: 'nav.roles', icon: 'admin_panel_settings', route: '/roles', permission: 'roles.view' },
      { labelKey: 'nav.permissions', icon: 'security', route: '/permissions', permission: 'permissions.view' },
      { labelKey: 'nav.rolePermissions', icon: 'link', route: '/role-permissions', permission: 'role_permissions.manage' },
      { labelKey: 'nav.settings', icon: 'settings', route: '/settings', permission: 'settings.view' }
    ]
  }
];
