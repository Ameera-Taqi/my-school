import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { TeacherMonitoringRecord } from '../../core/models';

export interface TeacherMonitoringFilters {
  department?: string;
  status?: string;
  search?: string;
}

const MOCK: TeacherMonitoringRecord[] = [
  {
    id: 1,
    teacherName: 'أ. سالم الحربي',
    departmentName: 'شعبة الرياضيات',
    subject: 'رياضيات',
    classesCount: 4,
    attendanceRate: 98,
    lessonPlanRate: 95,
    evaluationScore: 4.6,
    lastVisitDate: '2026-06-15',
    status: 'EXCELLENT',
    strengths: 'تنويع استراتيجيات التدريس، التزام بالخطط',
    improvements: 'زيادة الأنشطة التفاعلية',
    notes: 'أداء متميز خلال الزيارة الصفية'
  },
  {
    id: 2,
    teacherName: 'أ. مريم العتيبي',
    departmentName: 'شعبة العلوم',
    subject: 'أحياء',
    classesCount: 3,
    attendanceRate: 96,
    lessonPlanRate: 88,
    evaluationScore: 4.2,
    lastVisitDate: '2026-06-12',
    status: 'GOOD',
    strengths: 'شرح واضح، إدارة صف جيدة',
    improvements: 'رفع نسبة إنجاز الخطط الأسبوعية',
    notes: 'يُنصح بمتابعة خطة الأسبوع القادم'
  },
  {
    id: 3,
    teacherName: 'أ. يوسف القحطاني',
    departmentName: 'شعبة اللغة العربية',
    subject: 'لغة عربية',
    classesCount: 5,
    attendanceRate: 91,
    lessonPlanRate: 72,
    evaluationScore: 3.5,
    lastVisitDate: '2026-06-08',
    status: 'NEEDS_FOLLOW_UP',
    strengths: 'تفاعل جيد مع الطلاب',
    improvements: 'تسليم خطط الدروس في الوقت، توثيق الواجبات',
    notes: 'تم التنبيه بضرورة تحسين إنجاز الخطط'
  },
  {
    id: 4,
    teacherName: 'أ. نورة الشمري',
    departmentName: 'شعبة اللغة الإنجليزية',
    subject: 'إنجليزي',
    classesCount: 4,
    attendanceRate: 94,
    lessonPlanRate: 90,
    evaluationScore: 4.4,
    lastVisitDate: '2026-06-10',
    status: 'GOOD',
    strengths: 'استخدام التقنية في التعليم',
    improvements: 'متابعة الطلاب ضعاف المستوى',
    notes: '—'
  },
  {
    id: 5,
    teacherName: 'أ. فهد الدوسري',
    departmentName: 'شعبة الرياضيات',
    subject: 'إحصاء',
    classesCount: 3,
    attendanceRate: 85,
    lessonPlanRate: 60,
    evaluationScore: 2.8,
    lastVisitDate: '2026-05-28',
    status: 'CRITICAL',
    strengths: 'خبرة في المادة',
    improvements: 'الالتزام بالحضور، إعداد الدروس، متابعة الطلاب',
    notes: 'اجتماع متابعة مجدول مع رئيس الشعبة'
  }
];

@Injectable({ providedIn: 'root' })
export class TeacherMonitoringMockService {
  getAll(filters?: TeacherMonitoringFilters): Observable<TeacherMonitoringRecord[]> {
    let data = [...MOCK];

    if (filters?.department) {
      data = data.filter(r => r.departmentName === filters.department);
    }
    if (filters?.status) {
      data = data.filter(r => r.status === filters.status);
    }
    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      data = data.filter(r =>
        r.teacherName.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q)
      );
    }

    return of(data).pipe(delay(300));
  }

  getDepartments(): Observable<string[]> {
    const departments = [...new Set(MOCK.map(r => r.departmentName))];
    return of(departments).pipe(delay(100));
  }
}
