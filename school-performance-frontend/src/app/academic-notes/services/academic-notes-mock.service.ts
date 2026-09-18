import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { AcademicNote, Teacher, TeacherNote, BehaviorNote } from '../../core/models';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { DepartmentScopeService } from '../../core/services/department-scope.service';
import { TeacherPortalMockService } from '../../teacher-portal/services/teacher-portal-mock.service';
import { BehaviorMockService } from '../../behavior/services/behavior-mock.service';

export interface AcademicNotesFilters {
  subjects?: string[];
  subject?: string;
  noteType?: string;
  stage?: string;
  className?: string;
  category?: string;
  priority?: string;
  status?: string;
  search?: string;
}

const ACADEMIC_TEXTS = [
  'انخفاض ملحوظ في نتائج الاختبارات القصيرة خلال الأسبوعين الماضيين.',
  'مشاركة جيدة في حل المسائل على السبورة.',
  'تأخر متكرر في تسليم الواجبات المنزلية.',
  'أداء ممتاز في اختبار الوحدة الأخيرة.',
  'يحتاج مراجعة الدروس الأساسية قبل الاختبار النهائي.',
  'تحسن تدريجي بعد جلسات الدعم الإضافية.'
];

const BEHAVIOR_TEXTS = [
  'مشاركة متميزة وتعاون مع زملائه داخل الحصة.',
  'تأخر متكرر عن بداية الحصة.',
  'التزام جيد بأنظمة الصف والحصة.',
  'يحتاج متابعة في الانضباط أثناء العمل الجماعي.'
];

const CATEGORIES: AcademicNote['category'][] = ['PERFORMANCE', 'PARTICIPATION', 'HOMEWORK', 'ASSESSMENT', 'GENERAL'];
const PRIORITIES: AcademicNote['priority'][] = ['HIGH', 'MEDIUM', 'LOW'];
const STATUSES: AcademicNote['status'][] = ['OPEN', 'REVIEWED', 'RESOLVED'];

@Injectable({ providedIn: 'root' })
export class AcademicNotesMockService {
  private readonly lookup = inject(AcademicLookupService);
  private readonly departmentScope = inject(DepartmentScopeService);
  private readonly teacherPortal = inject(TeacherPortalMockService);
  private readonly behaviorService = inject(BehaviorMockService);
  private readonly statusOverrides = new Map<number, AcademicNote['status']>();

  getAll(filters?: AcademicNotesFilters): Observable<AcademicNote[]> {
    return forkJoin({
      students: this.lookup.getAllStudents(),
      teachers: this.lookup.getAllTeachers(),
      portalNotes: this.teacherPortal.getNotes(),
      behaviorNotes: this.behaviorService.getAll()
    }).pipe(
      map(({ students, teachers, portalNotes, behaviorNotes }) => {
        const deptTeachers = this.departmentTeachers(teachers);
        if (this.departmentScope.isScoped() && !deptTeachers.length) {
          return [];
        }

        const generated = students.length && deptTeachers.length
          ? this.fromRoster(students, deptTeachers)
          : [];
        const fromTeachers = this.fromPortalNotes(portalNotes, deptTeachers);
        const fromBehavior = this.fromBehaviorNotes(behaviorNotes, deptTeachers);
        const merged = this.mergeNotes([...generated, ...fromTeachers, ...fromBehavior]);
        return this.applyFilters(merged, filters);
      }),
      delay(250)
    );
  }

  getSubjects(): Observable<string[]> {
    if (this.departmentScope.isScoped()) {
      return of(this.departmentScope.subjects()).pipe(delay(100));
    }
    return this.lookup.getAllTeachers().pipe(
      map(teachers => [...new Set(
        teachers.map(t => t.specialization).filter((s): s is string => !!s)
      )]),
      delay(100)
    );
  }

  getStages(): Observable<string[]> {
    return this.lookup.getStageNames().pipe(delay(100));
  }

  getClasses(stage?: string): Observable<string[]> {
    return this.lookup.getClassNamesByStageName(stage).pipe(delay(100));
  }

  markReviewed(id: number): Observable<void> {
    this.statusOverrides.set(id, 'REVIEWED');
    return of(void 0).pipe(delay(200));
  }

  private departmentTeachers(teachers: Teacher[]): Teacher[] {
    const active = teachers.filter(t => t.active !== false);
    if (!this.departmentScope.isScoped()) {
      return active;
    }
    const id = this.departmentScope.departmentId();
    const name = this.departmentScope.departmentName();
    return active.filter(t =>
      (id != null && t.departmentId === id) ||
      (!!name && t.departmentName === name)
    );
  }

  private fromRoster(
    students: { id?: number; fullName: string; className?: string; academicStageName?: string }[],
    teachers: Teacher[]
  ): AcademicNote[] {
    const rows: AcademicNote[] = [];
    teachers.forEach((teacher, teacherIndex) => {
      const subject = teacher.specialization || '—';
      for (let n = 0; n < 3; n++) {
        const student = students[(teacherIndex * 3 + n) % students.length];
        const seed = this.seed(teacher.fullName, student.fullName, n);
        const isBehavior = n === 2;
        rows.push(this.withStatus({
          id: seed,
          studentName: student.fullName,
          className: student.className || '—',
          stageName: student.academicStageName || '—',
          subject,
          teacherName: teacher.fullName,
          noteType: isBehavior ? 'BEHAVIOR' : 'ACADEMIC',
          category: isBehavior ? 'GENERAL' : CATEGORIES[seed % CATEGORIES.length],
          priority: PRIORITIES[seed % PRIORITIES.length],
          content: isBehavior
            ? BEHAVIOR_TEXTS[seed % BEHAVIOR_TEXTS.length]
            : ACADEMIC_TEXTS[seed % ACADEMIC_TEXTS.length],
          noteDate: this.noteDate(seed),
          status: STATUSES[seed % STATUSES.length]
        }));
      }
    });
    return rows;
  }

  private fromPortalNotes(notes: TeacherNote[], teachers: Teacher[]): AcademicNote[] {
    return notes.flatMap(note => {
      const teacher = this.matchTeacher(teachers, note.teacherName);
      if (!teacher) return [];
      const seed = this.seed('portal', note.id ?? note.content, note.noteDate);
      return [this.withStatus({
        id: 10_000 + (note.id ?? seed % 9_000),
        studentName: note.studentName,
        className: note.className,
        stageName: '—',
        subject: teacher.specialization || '—',
        teacherName: teacher.fullName,
        noteType: note.noteType,
        category: 'GENERAL',
        priority: 'MEDIUM',
        content: note.content,
        noteDate: note.noteDate,
        status: 'OPEN'
      })];
    });
  }

  private fromBehaviorNotes(notes: BehaviorNote[], teachers: Teacher[]): AcademicNote[] {
    return notes.flatMap(note => {
      const teacher = this.matchTeacher(teachers, note.recordedBy);
      if (!teacher) return [];
      const seed = this.seed('behavior', note.id ?? note.description, note.noteDate);
      return [this.withStatus({
        id: 20_000 + (note.id ?? seed % 9_000),
        studentName: note.studentName,
        className: '—',
        stageName: '—',
        subject: teacher.specialization || '—',
        teacherName: teacher.fullName,
        noteType: 'BEHAVIOR',
        category: 'GENERAL',
        priority: note.type === 'WARNING' || note.type === 'NEGATIVE' ? 'HIGH' : 'LOW',
        content: note.description,
        noteDate: note.noteDate,
        status: 'OPEN'
      })];
    });
  }

  private mergeNotes(notes: AcademicNote[]): AcademicNote[] {
    const seen = new Set<string>();
    return notes.filter(note => {
      const key = `${note.teacherName}|${note.studentName}|${note.noteDate}|${note.content}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => b.noteDate.localeCompare(a.noteDate) || a.studentName.localeCompare(b.studentName, 'ar'));
  }

  private applyFilters(rows: AcademicNote[], filters?: AcademicNotesFilters): AcademicNote[] {
    let data = rows;
    if (filters?.subjects?.length) {
      data = data.filter(n => filters.subjects!.includes(n.subject));
    } else if (filters?.subject) {
      data = data.filter(n => n.subject === filters.subject);
    }
    if (filters?.noteType) data = data.filter(n => n.noteType === filters.noteType);
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
    return data;
  }

  private matchTeacher(teachers: Teacher[], name?: string): Teacher | undefined {
    const needle = this.normalizeName(name);
    if (!needle) return undefined;
    return teachers.find(t => {
      const full = this.normalizeName(t.fullName);
      return full === needle || full.includes(needle) || needle.includes(full);
    });
  }

  private normalizeName(name?: string): string {
    return (name ?? '')
      .replace(/^أ\.\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private withStatus(note: AcademicNote): AcademicNote {
    const status = note.id != null ? this.statusOverrides.get(note.id) : undefined;
    return status ? { ...note, status } : note;
  }

  private seed(a: string | number, b: string | number, c: string | number): number {
    const text = `${a}|${b}|${c}`;
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) || 1;
  }

  private noteDate(seed: number): string {
    const day = 5 + (seed % 14);
    return `2026-06-${String(day).padStart(2, '0')}`;
  }
}
