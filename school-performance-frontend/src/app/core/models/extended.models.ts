export interface DashboardStats {
  studentsCount: number;
  teachersCount: number;
  classesCount: number;
  attendanceRate: number;
  openRequestsCount: number;
  alertsCount: number;
  recentMeetings: { id: number; title: string; date: string }[];
  recentTasks: { id: number; title: string; dueDate: string; status: string }[];
}

export interface AttendanceRecord {
  id?: number;
  personId: number;
  personName: string;
  personType: 'STUDENT' | 'TEACHER';
  stageName?: string;
  className?: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'NOT_RECORDED';
  notes?: string | null;
  /** "HH:mm", teachers only */
  checkInTime?: string | null;
  /** "HH:mm", mid-day presence check, teachers only */
  presenceTime?: string | null;
  /** "HH:mm", teachers only */
  checkOutTime?: string | null;
  /** computed by the server from the two times */
  presenceMinutes?: number | null;
}

export interface BehaviorNote {
  id?: number;
  studentId: number;
  studentName: string;
  type: 'POSITIVE' | 'NEGATIVE' | 'WARNING';
  description: string;
  noteDate: string;
  recordedBy: string;
}

export interface InternalRequest {
  id?: number;
  requestType: 'MAINTENANCE' | 'DEVICES' | 'SUPPLIES' | 'TEACHER_LEAVE' | 'SCHOOL_ACTIVITY' | 'OTHER';
  customRequestType?: string;
  requesterName: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  requestDate: string;
}

export interface Meeting {
  id?: number;
  title: string;
  meetingDate: string;
  attendees: string;
  agenda: string;
  minutes: string;
  followUpTasks: string;
  targetRoleKeys?: string[];
  calendarEventId?: number;
}

export interface SchoolTask {
  id?: number;
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  meetingId?: number;
  meetingTitle?: string;
}

export interface AlertItem {
  id?: number;
  title: string;
  alertType: 'ABSENCE' | 'LATE_REQUEST' | 'OVERDUE_TASK' | 'LOW_PERFORMANCE' | 'BEHAVIOR';
  alertDate: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'NEW' | 'REVIEWED';
}

export interface LessonPlan {
  id?: number;
  subject: string;
  teacherName: string;
  stageName: string;
  className: string;
  title: string;
  weekNumber: number;
  attachmentName?: string;
  status: 'DRAFT' | 'APPROVED' | 'NEEDS_REVISION';
}

export interface ResourceFile {
  id?: number;
  title: string;
  fileType: string;
  subject: string;
  stageName: string;
  teacherName: string;
  description: string;
  uploadedAt: string;
  fileName?: string;
  fileSize?: number;
}

export interface AppUser {
  id?: number;
  fullName: string;
  email: string;
  username: string;
  phone?: string;
  password?: string;
  roleId?: number;
  roleIds?: number[];
  roleName?: string;
  roleNames?: string[];
  departmentId?: number;
  departmentName?: string;
  active: boolean;
}

export type ReportType = 'ATTENDANCE' | 'STUDENTS' | 'TEACHERS' | 'BEHAVIOR' | 'REQUESTS' | 'TASKS';

export interface CalendarEvent {
  id?: number;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  eventType: 'PUBLIC' | 'PERSONAL';
  color?: string;
  notes?: string;
  targetRoleKeys?: string[];
  createdByUserId?: number;
  createdByName?: string;
  ownedByCurrentUser?: boolean;
}

export interface TeacherMyClass {
  id: number;
  name: string;
  stageName: string;
  studentCount: number;
  subject?: string;
  schedule?: string;
}

export interface TeacherMyStudent {
  id: number;
  fullName: string;
  className: string;
  stageName: string;
  guardianPhone?: string;
  status?: string;
}

export interface TeacherAssignment {
  id?: number;
  title: string;
  className: string;
  subject: string;
  dueDate: string;
  status: 'OPEN' | 'CLOSED';
  description?: string;
}

export interface StudentGrade {
  id?: number;
  studentName: string;
  className: string;
  subject: string;
  score: number;
  maxScore: number;
  term: string;
  assessmentName?: string;
}

export interface GradeSheetColumn {
  id: string;
  title: string;
  maxScore: number;
}

export interface GradeSheetEntry {
  studentId: number;
  studentName: string;
  className: string;
  scores: Record<string, number | null>;
}

export interface GradeSheet {
  className: string;
  subject: string;
  term: string;
  columns: GradeSheetColumn[];
  entries: GradeSheetEntry[];
}

export interface SystemSettings {
  school: {
    name: string;
    code: string;
    address: string;
    phone: string;
    email: string;
    principalName: string;
  };
  academic: {
    year: string;
    currentTerm: string;
    passMark: number;
    maxGrade: number;
  };
  attendance: {
    lateAfterMinutes: number;
    absentAlertThreshold: number;
    countLateAsPartial: boolean;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    absenceAlerts: boolean;
    gradeAlerts: boolean;
    meetingReminders: boolean;
  };
  system: {
    dateFormat: string;
    maintenanceMode: boolean;
    sessionTimeoutMinutes: number;
    defaultLanguage: string;
  };
}

export interface TeacherNote {
  id?: number;
  studentName: string;
  className: string;
  noteType: 'BEHAVIOR' | 'ACADEMIC';
  content: string;
  noteDate: string;
}

export interface ClassAttendanceRow {
  id: number;
  studentName: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
}

export interface TeacherMonitoringRecord {
  id?: number;
  teacherName: string;
  departmentName: string;
  subject: string;
  classesCount: number;
  attendanceRate: number;
  lessonPlanRate: number;
  evaluationScore: number;
  lastVisitDate: string;
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_FOLLOW_UP' | 'CRITICAL';
  strengths?: string;
  improvements?: string;
  notes?: string;
}

export interface SubjectStudentResult {
  id?: number;
  studentName: string;
  className: string;
  stageName: string;
  subject: string;
  teacherName: string;
  score: number;
  maxScore: number;
  percentage: number;
  term: string;
  gradeLevel: 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'PASS' | 'FAIL';
  examDate: string;
  notes?: string;
}

export interface AcademicNote {
  id?: number;
  studentName: string;
  className: string;
  stageName: string;
  subject: string;
  teacherName: string;
  category: 'PERFORMANCE' | 'PARTICIPATION' | 'HOMEWORK' | 'ASSESSMENT' | 'GENERAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  content: string;
  noteDate: string;
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED';
}

export type ScheduleDay = 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY';

export interface ClassScheduleEntry {
  id?: number;
  classId?: number;
  className: string;
  dayOfWeek: ScheduleDay;
  period: number;
  subjectId?: number;
  subject?: string;
  subjectColor?: string;
  teacherId?: number;
  teacherName: string;
  room?: string;
  /** Placed by hand; the generator keeps it in place. */
  locked?: boolean;
}
