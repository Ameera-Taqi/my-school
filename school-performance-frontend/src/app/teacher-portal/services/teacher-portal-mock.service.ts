import { Injectable, inject } from '@angular/core';
import { Observable, of, switchMap, map } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  ClassAttendanceRow, GradeSheet, StudentGrade, TeacherAssignment, TeacherMyClass,
  TeacherMyStudent, TeacherNote
} from '../../core/models';
import { createMockStore } from '../../core/utils/mock-persistence';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { SchoolClassApiService } from '../../school-classes/services/school-class-api.service';

interface TeacherClassMeta {
  classId: number;
  subject: string;
  schedule?: string;
}

interface TeacherPortalState {
  assignmentId: number;
  assignments: TeacherAssignment[];
  gradeId: number;
  grades: StudentGrade[];
  gradeSheets: GradeSheet[];
  noteId: number;
  notes: TeacherNote[];
  attendance: ClassAttendanceRow[];
  classMeta: TeacherClassMeta[];
}

const DEFAULT_CLASS_META: Record<string, { subject: string; schedule?: string }> = {
  '10-أ': { subject: 'رياضيات', schedule: 'الأحد - الثلاثاء' },
  '10-ب': { subject: 'رياضيات', schedule: 'الإثنين - الأربعاء' },
  '11-أ': { subject: 'إحصاء', schedule: 'الأحد - الخميس' }
};

const INITIAL_STATE: TeacherPortalState = {
  assignmentId: 10,
  assignments: [
    { id: 1, title: 'واجب المعادلات', className: '10-أ', subject: 'رياضيات', dueDate: '2026-06-25', status: 'OPEN', description: 'حل تمارين الصفحة 45' },
    { id: 2, title: 'تقرير الإحصاء', className: '11-أ', subject: 'إحصاء', dueDate: '2026-06-28', status: 'OPEN' }
  ],
  gradeId: 10,
  grades: [],
  gradeSheets: [],
  noteId: 10,
  notes: [],
  attendance: [],
  classMeta: []
};

const store = createMockStore<TeacherPortalState>('demo_teacher_portal', INITIAL_STATE);

@Injectable({ providedIn: 'root' })
export class TeacherPortalMockService {
  private readonly lookup = inject(AcademicLookupService);
  private readonly classApi = inject(SchoolClassApiService);

  private s(): TeacherPortalState {
    return store.get();
  }

  private save(state: TeacherPortalState): void {
    store.set(state);
  }

  private metaFor(classId: number, className: string, state: TeacherPortalState): TeacherClassMeta | undefined {
    const saved = state.classMeta.find(m => m.classId === classId);
    if (saved) return saved;
    const defaults = DEFAULT_CLASS_META[className];
    if (!defaults) return undefined;
    return { classId, subject: defaults.subject, schedule: defaults.schedule };
  }

  getMyClasses(): Observable<TeacherMyClass[]> {
    return this.lookup.getAllClasses().pipe(
      map(classes => {
        const state = this.s();
        return classes.map(c => {
          const meta = this.metaFor(c.id!, c.name, state);
          return {
            id: c.id!,
            name: c.name,
            stageName: c.academicStageName ?? '',
            subject: meta?.subject ?? '—',
            studentCount: c.studentCount ?? 0,
            schedule: meta?.schedule
          };
        });
      }),
      delay(200)
    );
  }

  saveMyClass(c: TeacherMyClass): Observable<TeacherMyClass> {
    if (c.id) {
      return this.classApi.update(c.id, {
        id: c.id,
        name: c.name,
        capacity: c.studentCount,
        academicStageName: c.stageName
      }).pipe(
        switchMap(() => {
          const state = this.s();
          const idx = state.classMeta.findIndex(m => m.classId === c.id);
          const existing = idx >= 0 ? state.classMeta[idx] : undefined;
          const meta: TeacherClassMeta = {
            classId: c.id,
            subject: c.subject ?? existing?.subject ?? '—',
            schedule: c.schedule ?? existing?.schedule
          };
          if (idx >= 0) state.classMeta[idx] = meta;
          else state.classMeta.push(meta);
          this.save(state);
          this.lookup.invalidate();
          return of({ ...c });
        }),
        delay(200)
      );
    }

    return this.lookup.findStageByName(c.stageName).pipe(
      switchMap(stage => {
        if (!stage?.id) {
          return of(c).pipe(delay(200));
        }
        return this.classApi.create(stage.id, {
          name: c.name,
          capacity: c.studentCount,
          academicStageId: stage.id,
          academicStageName: c.stageName
        }).pipe(
          switchMap(created => {
            const state = this.s();
            if (c.subject || c.schedule) {
              state.classMeta.push({
                classId: created.id!,
                subject: c.subject ?? '—',
                schedule: c.schedule
              });
              this.save(state);
            }
            return this.lookup.refreshAfterMutation().pipe(
              map(() => ({
                id: created.id!,
                name: created.name,
                stageName: c.stageName,
                studentCount: c.studentCount,
                subject: c.subject,
                schedule: c.schedule
              }))
            );
          })
        );
      }),
      delay(200)
    );
  }

  getMyStudents(searchName?: string, classId?: number): Observable<TeacherMyStudent[]> {
    const source$ = classId != null
      ? this.lookup.getStudentsByClassId(classId)
      : this.lookup.getAllStudents();

    return source$.pipe(
      map(students => {
        let data = students.map(s => ({
          id: s.id!,
          fullName: s.fullName,
          className: s.className ?? '',
          stageName: s.academicStageName ?? '',
          guardianPhone: s.guardianPhone,
          status: s.status
        }));
        if (searchName) {
          const q = searchName.toLowerCase();
          data = data.filter(s => s.fullName.toLowerCase().includes(q));
        }
        return data;
      }),
      delay(200)
    );
  }

  getMyStudentsByClassId(classId: number): Observable<TeacherMyStudent[]> {
    return this.getMyStudents(undefined, classId);
  }

  getClassNames(): Observable<string[]> {
    return this.lookup.getClassNames().pipe(delay(100));
  }

  getAttendance(className: string): Observable<ClassAttendanceRow[]> {
    return this.lookup.findClassByName(className).pipe(
      switchMap(schoolClass => {
        if (!schoolClass?.id) return of([] as ClassAttendanceRow[]);
        return this.lookup.getStudentsByClassId(schoolClass.id).pipe(
          map(students => {
            const state = this.s();
            return students.map(s => {
              const existing = state.attendance.find(a => a.id === s.id);
              return existing ?? { id: s.id!, studentName: s.fullName, status: 'PRESENT' as const };
            });
          })
        );
      }),
      delay(200)
    );
  }

  saveAttendance(rows: ClassAttendanceRow[]): Observable<void> {
    const state = this.s();
    rows.forEach(r => {
      const idx = state.attendance.findIndex(a => a.id === r.id);
      if (idx >= 0) state.attendance[idx] = r;
      else state.attendance.push(r);
    });
    this.save(state);
    return of(void 0).pipe(delay(200));
  }

  getAssignments(): Observable<TeacherAssignment[]> {
    return of([...this.s().assignments]).pipe(delay(200));
  }

  saveAssignment(a: TeacherAssignment): Observable<TeacherAssignment> {
    const state = this.s();
    if (a.id) {
      state.assignments = state.assignments.map(x => x.id === a.id ? a : x);
      this.save(state);
      return of(a).pipe(delay(200));
    }
    const created = { ...a, id: ++state.assignmentId };
    state.assignments = [created, ...state.assignments];
    this.save(state);
    return of(created).pipe(delay(200));
  }

  deleteAssignment(id: number): Observable<void> {
    const state = this.s();
    state.assignments = state.assignments.filter(a => a.id !== id);
    this.save(state);
    return of(void 0).pipe(delay(200));
  }

  getGrades(): Observable<StudentGrade[]> {
    return of([...this.s().grades]).pipe(delay(200));
  }

  getGradeSheet(className: string, subject: string, term: string): Observable<GradeSheet> {
    return this.lookup.findClassByName(className).pipe(
      switchMap(schoolClass => {
        const state = this.s();
        const existing = state.gradeSheets.find(s =>
          s.className === className && s.subject === subject && s.term === term
        );

        const buildSheet = (students: TeacherMyStudent[]) => {
          const entries = students.map(s => {
            const existingEntry = existing?.entries.find(e => e.studentId === s.id);
            return {
              studentId: s.id,
              studentName: s.fullName,
              className: s.className,
              scores: { ...(existingEntry?.scores ?? {}) }
            };
          });
          return {
            className,
            subject,
            term,
            columns: existing?.columns.map(c => ({ ...c })) ?? [],
            entries
          };
        };

        if (!schoolClass?.id) {
          return of(buildSheet([]));
        }

        return this.lookup.getStudentsByClassId(schoolClass.id).pipe(
          map(students => buildSheet(students.map(s => ({
            id: s.id!,
            fullName: s.fullName,
            className: s.className ?? className,
            stageName: s.academicStageName ?? ''
          }))))
        );
      }),
      delay(200)
    );
  }

  saveGradeSheet(sheet: GradeSheet): Observable<void> {
    const state = this.s();
    const idx = state.gradeSheets.findIndex(s =>
      s.className === sheet.className && s.subject === sheet.subject && s.term === sheet.term
    );
    const copy: GradeSheet = {
      ...sheet,
      columns: sheet.columns.map(c => ({ ...c })),
      entries: sheet.entries.map(e => ({ ...e, scores: { ...e.scores } }))
    };
    if (idx >= 0) state.gradeSheets[idx] = copy;
    else state.gradeSheets.push(copy);

    state.grades = state.grades.filter(g =>
      !(g.className === sheet.className && g.subject === sheet.subject && g.term === sheet.term)
    );

    sheet.entries.forEach(entry => {
      sheet.columns.forEach(col => {
        const score = entry.scores[col.id];
        if (score == null || Number.isNaN(score)) return;
        state.grades.push({
          id: ++state.gradeId,
          studentName: entry.studentName,
          className: entry.className,
          subject: sheet.subject,
          term: sheet.term,
          score,
          maxScore: col.maxScore,
          assessmentName: col.title
        });
      });
    });

    this.save(state);
    return of(void 0).pipe(delay(200));
  }

  getSubjects(): Observable<string[]> {
    return this.getMyClasses().pipe(
      map(classes => [...new Set(
        classes.map(c => c.subject).filter((s): s is string => !!s && s !== '—')
      )])
    );
  }

  getTerms(): Observable<string[]> {
    return of(['الفصل الأول', 'الفصل الثاني', 'الفصل الثالث']).pipe(delay(100));
  }

  saveGrade(g: StudentGrade): Observable<StudentGrade> {
    const state = this.s();
    if (g.id) {
      state.grades = state.grades.map(x => x.id === g.id ? g : x);
      this.save(state);
      return of(g).pipe(delay(200));
    }
    const created = { ...g, id: ++state.gradeId };
    state.grades = [created, ...state.grades];
    this.save(state);
    return of(created).pipe(delay(200));
  }

  deleteGrade(id: number): Observable<void> {
    const state = this.s();
    state.grades = state.grades.filter(g => g.id !== id);
    this.save(state);
    return of(void 0).pipe(delay(200));
  }

  getNotes(): Observable<TeacherNote[]> {
    return of([...this.s().notes]).pipe(delay(200));
  }

  saveNote(n: TeacherNote): Observable<TeacherNote> {
    const state = this.s();
    if (n.id) {
      state.notes = state.notes.map(x => x.id === n.id ? n : x);
      this.save(state);
      return of(n).pipe(delay(200));
    }
    const created = { ...n, id: ++state.noteId };
    state.notes = [created, ...state.notes];
    this.save(state);
    return of(created).pipe(delay(200));
  }

  deleteNote(id: number): Observable<void> {
    const state = this.s();
    state.notes = state.notes.filter(n => n.id !== id);
    this.save(state);
    return of(void 0).pipe(delay(200));
  }
}
