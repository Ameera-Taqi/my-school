import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { SubjectStudentResult } from '../../core/models';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { DepartmentScopeService } from '../../core/services/department-scope.service';

export interface SubjectResultsFilters {
  subject?: string;
  subjects?: string[];
  stage?: string;
  className?: string;
  term?: string;
  search?: string;
}

const ALL_RESULTS: SubjectStudentResult[] = [
  { id: 1, studentName: 'محمد العتيبي', className: '10-أ', stageName: 'العاشر', subject: 'رياضيات', teacherName: 'أ. سالم الحربي', score: 92, maxScore: 100, percentage: 92, term: 'الفصل الثاني', gradeLevel: 'EXCELLENT', examDate: '2026-06-10' },
  { id: 2, studentName: 'سارة القحطاني', className: '10-أ', stageName: 'العاشر', subject: 'رياضيات', teacherName: 'أ. سالم الحربي', score: 78, maxScore: 100, percentage: 78, term: 'الفصل الثاني', gradeLevel: 'GOOD', examDate: '2026-06-10' },
  { id: 3, studentName: 'عبدالله الشمري', className: '10-ب', stageName: 'العاشر', subject: 'رياضيات', teacherName: 'أ. سالم الحربي', score: 55, maxScore: 100, percentage: 55, term: 'الفصل الثاني', gradeLevel: 'FAIL', examDate: '2026-06-10', notes: 'يحتاج دعم إضافي' },
  { id: 4, studentName: 'نورة الدوسري', className: '10-ب', stageName: 'العاشر', subject: 'رياضيات', teacherName: 'أ. سالم الحربي', score: 88, maxScore: 100, percentage: 88, term: 'الفصل الثاني', gradeLevel: 'VERY_GOOD', examDate: '2026-06-10' },
  { id: 5, studentName: 'فهد المطيري', className: '11-أ', stageName: 'الحادي عشر', subject: 'رياضيات', teacherName: 'أ. فهد الدوسري', score: 72, maxScore: 100, percentage: 72, term: 'الفصل الثاني', gradeLevel: 'PASS', examDate: '2026-06-12' },
  { id: 6, studentName: 'ريم الحربي', className: '11-أ', stageName: 'الحادي عشر', subject: 'رياضيات', teacherName: 'أ. فهد الدوسري', score: 95, maxScore: 100, percentage: 95, term: 'الفصل الثاني', gradeLevel: 'EXCELLENT', examDate: '2026-06-12' },
  { id: 7, studentName: 'خالد العنزي', className: '10-أ', stageName: 'العاشر', subject: 'أحياء', teacherName: 'أ. مريم العتيبي', score: 84, maxScore: 100, percentage: 84, term: 'الفصل الثاني', gradeLevel: 'VERY_GOOD', examDate: '2026-06-11' },
  { id: 8, studentName: 'لمى السبيعي', className: '10-أ', stageName: 'العاشر', subject: 'أحياء', teacherName: 'أ. مريم العتيبي', score: 91, maxScore: 100, percentage: 91, term: 'الفصل الثاني', gradeLevel: 'EXCELLENT', examDate: '2026-06-11' },
  { id: 9, studentName: 'أحمد الزهراني', className: '12-أ', stageName: 'الثاني عشر', subject: 'لغة عربية', teacherName: 'أ. يوسف القحطاني', score: 76, maxScore: 100, percentage: 76, term: 'الفصل الثاني', gradeLevel: 'GOOD', examDate: '2026-06-14' },
  { id: 10, studentName: 'هند الغامدي', className: '12-أ', stageName: 'الثاني عشر', subject: 'لغة عربية', teacherName: 'أ. يوسف القحطاني', score: 68, maxScore: 100, percentage: 68, term: 'الفصل الثاني', gradeLevel: 'PASS', examDate: '2026-06-14' },
  { id: 11, studentName: 'سلمان البلوي', className: '11-ب', stageName: 'الحادي عشر', subject: 'إنجليزي', teacherName: 'أ. نورة الشمري', score: 82, maxScore: 100, percentage: 82, term: 'الفصل الثاني', gradeLevel: 'VERY_GOOD', examDate: '2026-06-13' },
  { id: 12, studentName: 'دانة الرشيدي', className: '11-ب', stageName: 'الحادي عشر', subject: 'إنجليزي', teacherName: 'أ. نورة الشمري', score: 49, maxScore: 100, percentage: 49, term: 'الفصل الثاني', gradeLevel: 'FAIL', examDate: '2026-06-13', notes: 'إعادة اختبار' },
  { id: 13, studentName: 'ياسر الفيصل', className: '10-ب', stageName: 'العاشر', subject: 'إحصاء', teacherName: 'أ. فهد الدوسري', score: 87, maxScore: 100, percentage: 87, term: 'الفصل الثاني', gradeLevel: 'VERY_GOOD', examDate: '2026-06-09' },
  { id: 14, studentName: 'مها العسيري', className: '12-ب', stageName: 'الثاني عشر', subject: 'إحصاء', teacherName: 'أ. فهد الدوسري', score: 93, maxScore: 100, percentage: 93, term: 'الفصل الثاني', gradeLevel: 'EXCELLENT', examDate: '2026-06-09' }
];

@Injectable({ providedIn: 'root' })
export class SubjectResultsMockService {
  private readonly lookup = inject(AcademicLookupService);
  private readonly departmentScope = inject(DepartmentScopeService);

  getSubjects(): Observable<string[]> {
    const subjects = this.departmentScope.isScoped()
      ? this.departmentScope.subjects()
      : [...new Set(ALL_RESULTS.map(r => r.subject))];
    return of(subjects).pipe(delay(100));
  }

  getStages(): Observable<string[]> {
    return this.lookup.getStageNames().pipe(delay(100));
  }

  getClasses(stage?: string): Observable<string[]> {
    return this.lookup.getClassNamesByStageName(stage).pipe(delay(100));
  }

  getTerms(): Observable<string[]> {
    const terms = [...new Set(ALL_RESULTS.map(r => r.term))];
    return of(terms).pipe(delay(100));
  }

  search(filters: SubjectResultsFilters): Observable<SubjectStudentResult[]> {
    let data = this.departmentScope.filterByDepartmentScope(ALL_RESULTS);

    if (filters.subjects?.length) {
      data = data.filter(r => filters.subjects!.includes(r.subject));
    } else if (filters.subject) {
      data = data.filter(r => r.subject === filters.subject);
    }

    if (filters.stage) {
      data = data.filter(r => r.stageName === filters.stage);
    }
    if (filters.className) {
      data = data.filter(r => r.className === filters.className);
    }
    if (filters.term) {
      data = data.filter(r => r.term === filters.term);
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      data = data.filter(r => r.studentName.toLowerCase().includes(q));
    }

    return of([...data]).pipe(delay(300));
  }
}
