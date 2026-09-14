import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AcademicNote } from '../../core/models';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { DepartmentScopeService } from '../../core/services/department-scope.service';

export interface AcademicNotesFilters {
  subjects?: string[];
  subject?: string;
  stage?: string;
  className?: string;
  category?: string;
  priority?: string;
  status?: string;
  search?: string;
}

const MOCK: AcademicNote[] = [
  { id: 1, studentName: 'محمد العتيبي', className: '10-أ', stageName: 'العاشر', subject: 'رياضيات', teacherName: 'أ. سالم الحربي', category: 'PERFORMANCE', priority: 'HIGH', content: 'انخفاض ملحوظ في نتائج الاختبارات القصيرة خلال الأسبوعين الماضيين.', noteDate: '2026-06-18', status: 'OPEN' },
  { id: 2, studentName: 'سارة القحطاني', className: '10-أ', stageName: 'العاشر', subject: 'رياضيات', teacherName: 'أ. سالم الحربي', category: 'PARTICIPATION', priority: 'MEDIUM', content: 'مشاركة جيدة في حل المسائل على السبورة.', noteDate: '2026-06-16', status: 'REVIEWED' },
  { id: 3, studentName: 'عبدالله الشمري', className: '10-ب', stageName: 'العاشر', subject: 'رياضيات', teacherName: 'أ. سالم الحربي', category: 'HOMEWORK', priority: 'HIGH', content: 'تأخر متكرر في تسليم الواجبات المنزلية.', noteDate: '2026-06-15', status: 'OPEN' },
  { id: 4, studentName: 'نورة الدوسري', className: '10-ب', stageName: 'العاشر', subject: 'أحياء', teacherName: 'أ. مريم العتيبي', category: 'ASSESSMENT', priority: 'LOW', content: 'أداء ممتاز في اختبار الوحدة الثالثة.', noteDate: '2026-06-14', status: 'RESOLVED' },
  { id: 5, studentName: 'خالد العنزي', className: '10-أ', stageName: 'العاشر', subject: 'أحياء', teacherName: 'أ. مريم العتيبي', category: 'PERFORMANCE', priority: 'MEDIUM', content: 'يحتاج مراجعة دروس الخلية قبل الاختبار النهائي.', noteDate: '2026-06-12', status: 'OPEN' },
  { id: 6, studentName: 'أحمد الزهراني', className: '12-أ', stageName: 'الثاني عشر', subject: 'لغة عربية', teacherName: 'أ. يوسف القحطاني', category: 'GENERAL', priority: 'LOW', content: 'تحسن في أسلوب التعبير الكتابي.', noteDate: '2026-06-11', status: 'REVIEWED' },
  { id: 7, studentName: 'هند الغامدي', className: '12-أ', stageName: 'الثاني عشر', subject: 'لغة عربية', teacherName: 'أ. يوسف القحطاني', category: 'HOMEWORK', priority: 'MEDIUM', content: 'لم تسلم تقرير القراءة المطلوب.', noteDate: '2026-06-10', status: 'OPEN' },
  { id: 8, studentName: 'سلمان البلوي', className: '11-ب', stageName: 'الحادي عشر', subject: 'إنجليزي', teacherName: 'أ. نورة الشمري', category: 'PARTICIPATION', priority: 'LOW', content: 'تفاعل إيجابي في الأنشطة الصفية.', noteDate: '2026-06-09', status: 'RESOLVED' },
  { id: 9, studentName: 'دانة الرشيدي', className: '11-ب', stageName: 'الحادي عشر', subject: 'إنجليزي', teacherName: 'أ. نورة الشمري', category: 'ASSESSMENT', priority: 'HIGH', content: 'ضعف في مهارة الاستماع يؤثر على نتائج الاختبارات.', noteDate: '2026-06-08', status: 'OPEN' },
  { id: 10, studentName: 'ياسر الفيصل', className: '11-أ', stageName: 'الحادي عشر', subject: 'إحصاء', teacherName: 'أ. فهد الدوسري', category: 'PERFORMANCE', priority: 'MEDIUM', content: 'تحسن تدريجي بعد جلسات الدعم الإضافية.', noteDate: '2026-06-07', status: 'REVIEWED' }
];

@Injectable({ providedIn: 'root' })
export class AcademicNotesMockService {
  private readonly lookup = inject(AcademicLookupService);
  private readonly departmentScope = inject(DepartmentScopeService);

  getAll(filters?: AcademicNotesFilters): Observable<AcademicNote[]> {
    let data = this.departmentScope.filterByDepartmentScope([...MOCK]);

    if (filters?.subjects?.length) {
      data = data.filter(n => filters.subjects!.includes(n.subject));
    } else if (filters?.subject) {
      data = data.filter(n => n.subject === filters.subject);
    }
    if (filters?.stage) data = data.filter(n => n.stageName === filters.stage);
    if (filters?.className) data = data.filter(n => n.className === filters.className);
    if (filters?.category) data = data.filter(n => n.category === filters.category);
    if (filters?.priority) data = data.filter(n => n.priority === filters.priority);
    if (filters?.status) data = data.filter(n => n.status === filters.status);
    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      data = data.filter(n =>
        n.studentName.toLowerCase().includes(q) ||
        n.teacherName.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
      );
    }

    return of(data).pipe(delay(300));
  }

  getSubjects(): Observable<string[]> {
    const subjects = this.departmentScope.isScoped()
      ? this.departmentScope.subjects()
      : [...new Set(MOCK.map(n => n.subject))];
    return of(subjects).pipe(delay(100));
  }

  getStages(): Observable<string[]> {
    return this.lookup.getStageNames().pipe(delay(100));
  }

  getClasses(stage?: string): Observable<string[]> {
    return this.lookup.getClassNamesByStageName(stage).pipe(delay(100));
  }

  markReviewed(id: number): Observable<void> {
    const note = MOCK.find(n => n.id === id);
    if (note) note.status = 'REVIEWED';
    return of(void 0).pipe(delay(200));
  }
}
