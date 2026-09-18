import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { SubjectStudentResult, Teacher } from '../../core/models';
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

const FALLBACK_RESULTS: SubjectStudentResult[] = [
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

const TERM = 'الفصل الثاني';

@Injectable({ providedIn: 'root' })
export class SubjectResultsMockService {
  private readonly lookup = inject(AcademicLookupService);
  private readonly departmentScope = inject(DepartmentScopeService);

  getSubjects(): Observable<string[]> {
    const subjects = this.departmentSubjects();
    if (subjects.length) {
      return of(subjects).pipe(delay(100));
    }
    return of([...new Set(FALLBACK_RESULTS.map(r => r.subject))]).pipe(delay(100));
  }

  getStages(): Observable<string[]> {
    return this.lookup.getStageNames().pipe(delay(100));
  }

  getClasses(stage?: string): Observable<string[]> {
    return this.lookup.getClassNamesByStageName(stage).pipe(delay(100));
  }

  getTerms(): Observable<string[]> {
    return of([TERM]).pipe(delay(100));
  }

  search(filters: SubjectResultsFilters): Observable<SubjectStudentResult[]> {
    const subjects = this.resolveSubjects(filters);
    if (!subjects.length) {
      return of([]).pipe(delay(150));
    }

    return forkJoin({
      students: this.lookup.getAllStudents(),
      teachers: this.lookup.getAllTeachers()
    }).pipe(
      map(({ students, teachers }) => {
        const rows = students.length
          ? this.fromRoster(students, teachers, subjects, filters)
          : this.fromFallback(subjects, filters);
        return this.sortByClass(this.applyFilters(rows, filters));
      }),
      delay(250)
    );
  }

  private departmentSubjects(): string[] {
    return this.departmentScope.isScoped() ? this.departmentScope.subjects() : [];
  }

  private resolveSubjects(filters: SubjectResultsFilters): string[] {
    const scoped = this.departmentSubjects();
    if (scoped.length) {
      if (filters.subject) {
        return scoped.includes(filters.subject) ? [filters.subject] : [];
      }
      if (filters.subjects?.length) {
        return filters.subjects.filter(s => scoped.includes(s));
      }
      return scoped;
    }
    if (filters.subjects?.length) return filters.subjects;
    if (filters.subject) return [filters.subject];
    return [];
  }

  private fromRoster(
    students: { id?: number; fullName: string; className?: string; academicStageName?: string }[],
    teachers: Teacher[],
    subjects: string[],
    filters: SubjectResultsFilters
  ): SubjectStudentResult[] {
    const deptName = this.departmentScope.departmentName();
    const deptTeachers = this.departmentScope.isScoped()
      ? teachers.filter(t => t.departmentId === this.departmentScope.departmentId() || t.departmentName === deptName)
      : teachers;

    const rows: SubjectStudentResult[] = [];
    for (const student of students) {
      const className = student.className || '—';
      const stageName = student.academicStageName || '—';
      if (filters.stage && stageName !== filters.stage) continue;
      if (filters.className && className !== filters.className) continue;

      for (const subject of subjects) {
        const seed = this.seed(student.id ?? student.fullName, subject);
        const score = 48 + (seed % 53);
        rows.push({
          id: seed,
          studentName: student.fullName,
          className,
          stageName,
          subject,
          teacherName: this.teacherFor(deptTeachers, subject),
          score,
          maxScore: 100,
          percentage: score,
          term: filters.term || TERM,
          gradeLevel: this.gradeLevel(score),
          examDate: this.examDate(seed)
        });
      }
    }
    return rows;
  }

  private fromFallback(subjects: string[], filters: SubjectResultsFilters): SubjectStudentResult[] {
    return FALLBACK_RESULTS.filter(r => subjects.includes(r.subject));
  }

  private applyFilters(rows: SubjectStudentResult[], filters: SubjectResultsFilters): SubjectStudentResult[] {
    let data = rows;
    if (filters.stage) data = data.filter(r => r.stageName === filters.stage);
    if (filters.className) data = data.filter(r => r.className === filters.className);
    if (filters.term) data = data.filter(r => r.term === filters.term);
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      data = data.filter(r => r.studentName.toLowerCase().includes(q));
    }
    return data;
  }

  private sortByClass(rows: SubjectStudentResult[]): SubjectStudentResult[] {
    return [...rows].sort((a, b) =>
      a.className.localeCompare(b.className, 'ar')
      || a.studentName.localeCompare(b.studentName, 'ar')
      || a.subject.localeCompare(b.subject, 'ar')
    );
  }

  private teacherFor(teachers: Teacher[], subject: string): string {
    return teachers.find(t => t.specialization === subject)?.fullName
      || teachers[0]?.fullName
      || '—';
  }

  private seed(id: number | string, subject: string): number {
    const text = `${id}|${subject}`;
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  private gradeLevel(score: number): SubjectStudentResult['gradeLevel'] {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'VERY_GOOD';
    if (score >= 70) return 'GOOD';
    if (score >= 50) return 'PASS';
    return 'FAIL';
  }

  private examDate(seed: number): string {
    const day = 8 + (seed % 10);
    return `2026-06-${String(day).padStart(2, '0')}`;
  }
}
