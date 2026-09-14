export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: 'حاضر', ABSENT: 'غائب', LATE: 'متأخر', EXCUSED: 'مستأذن'
};

export const BEHAVIOR_TYPE_LABELS: Record<string, string> = {
  POSITIVE: 'إيجابية', NEGATIVE: 'سلبية', WARNING: 'إنذار'
};

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  MAINTENANCE: 'طلب صيانة', DEVICES: 'طلب أجهزة', SUPPLIES: 'طلب مستلزمات',
  TEACHER_LEAVE: 'طلب إجازة معلم', SCHOOL_ACTIVITY: 'طلب نشاط مدرسي', OTHER: 'أخرى'
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'منخفضة', MEDIUM: 'متوسطة', HIGH: 'عالية'
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  NEW: 'جديد', IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد',
  REJECTED: 'مرفوض', COMPLETED: 'مكتمل'
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  NEW: 'جديدة', IN_PROGRESS: 'قيد التنفيذ', COMPLETED: 'مكتملة', OVERDUE: 'متأخرة'
};

export const LESSON_PLAN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة', APPROVED: 'معتمدة', NEEDS_REVISION: 'تحتاج تعديل'
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  ABSENCE: 'غياب متكرر', LATE_REQUEST: 'طلب متأخر', OVERDUE_TASK: 'مهمة متأخرة',
  LOW_PERFORMANCE: 'انخفاض مستوى', BEHAVIOR: 'ملاحظات سلوكية'
};

export const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'منخفض', MEDIUM: 'متوسط', HIGH: 'عالي'
};

export const ALERT_STATUS_LABELS: Record<string, string> = {
  NEW: 'جديد', REVIEWED: 'تمت المراجعة'
};

export const REPORT_TYPE_LABELS: Record<string, string> = {
  ATTENDANCE: 'تقرير الحضور', STUDENTS: 'تقرير الطلاب', TEACHERS: 'تقرير المعلمين',
  BEHAVIOR: 'تقرير السلوك', REQUESTS: 'تقرير الطلبات الداخلية', TASKS: 'تقرير المهام'
};

export const CALENDAR_EVENT_TYPE_LABELS: Record<string, string> = {
  PUBLIC: 'مدرسي', PERSONAL: 'شخصي', ROLE: 'اجتماع'
};

export const TEACHER_MONITORING_STATUS_LABELS: Record<string, string> = {
  EXCELLENT: 'ممتاز',
  GOOD: 'جيد',
  NEEDS_FOLLOW_UP: 'يحتاج متابعة',
  CRITICAL: 'حرج'
};

export const GRADE_LEVEL_LABELS: Record<string, string> = {
  EXCELLENT: 'ممتاز',
  VERY_GOOD: 'جيد جداً',
  GOOD: 'جيد',
  PASS: 'مقبول',
  FAIL: 'راسب'
};

export const ACADEMIC_NOTE_CATEGORY_LABELS: Record<string, string> = {
  PERFORMANCE: 'مستوى الأداء',
  PARTICIPATION: 'المشاركة الصفية',
  HOMEWORK: 'الواجبات المنزلية',
  ASSESSMENT: 'التقييم والاختبارات',
  GENERAL: 'ملاحظة عامة'
};

export const ACADEMIC_NOTE_STATUS_LABELS: Record<string, string> = {
  OPEN: 'مفتوحة',
  REVIEWED: 'تمت المراجعة',
  RESOLVED: 'تمت المعالجة'
};
