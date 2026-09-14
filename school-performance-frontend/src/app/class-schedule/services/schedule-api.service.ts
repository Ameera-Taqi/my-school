import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClassScheduleEntry, ScheduleDay } from '../../core/models';

export interface Subject { id?: number; name: string; code?: string; color?: string; active?: boolean; }

export interface SubjectAssignment {
  id?: number; classId: number; className?: string; subjectId: number; subjectName?: string; subjectColor?: string;
  teacherId: number; teacherName?: string; periodsPerWeek: number; scheduled?: number;
}

export type TeacherConstraintType = 'UNAVAILABLE_DAY' | 'UNAVAILABLE_PERIOD' | 'UNAVAILABLE_SLOT' | 'NO_FIRST_PERIOD' | 'NO_LAST_PERIOD' | 'MAX_PERIODS_PER_DAY';

export interface TeacherConstraint {
  id?: number; teacherId: number; teacherName?: string; type: TeacherConstraintType;
  dayOfWeek?: ScheduleDay | null; period?: number | null; value?: number | null; note?: string | null; description?: string;
}

export interface ScheduleSlotRequest { classId: number; dayOfWeek: ScheduleDay; period: number; assignmentId: number | null; room?: string; locked?: boolean; }

export interface GenerateRequest { classIds?: number[]; keepLocked?: boolean; seed?: number; }

export interface UnplacedLesson { classId: number; className: string; subjectName: string; teacherName: string; missing: number; reason: string; }

export interface GenerateResult {
  success: boolean; requiredLessons: number; placedLessons: number; classesCount: number;
  unplaced: UnplacedLesson[]; warnings: string[]; durationMs: number; attempts: number;
}

export interface ScheduleConflict { type: string; message: string; classId?: number; teacherId?: number; dayOfWeek?: string; period?: number; }
export interface ClassScheduleSummary { classId: number; className: string; stageName: string; required: number; scheduled: number; }
export interface TeacherLoad { teacherId: number; teacherName: string; required: number; scheduled: number; availableSlots: number; }
export interface ScheduleOverview { classes: ClassScheduleSummary[]; teachers: TeacherLoad[]; conflicts: ScheduleConflict[]; }

export const CONSTRAINT_TYPE_LABELS: Record<TeacherConstraintType, string> = {
  UNAVAILABLE_DAY: 'غير متاح في يوم كامل',
  UNAVAILABLE_PERIOD: 'غير متاح في حصة معينة كل يوم',
  UNAVAILABLE_SLOT: 'غير متاح في يوم وحصة محددين',
  NO_FIRST_PERIOD: 'لا يُسند له الحصة الأولى',
  NO_LAST_PERIOD: 'لا يُسند له الحصة الأخيرة',
  MAX_PERIODS_PER_DAY: 'حد أقصى للحصص في اليوم'
};

/** Constraint-based timetable: subjects, class assignments, teacher constraints, generation, and manual edits. */
@Injectable({ providedIn: 'root' })
export class ScheduleApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getSubjects(): Observable<Subject[]> { return this.http.get<Subject[]>(`${this.api}/subjects`); }
  createSubject(s: Subject): Observable<Subject> { return this.http.post<Subject>(`${this.api}/subjects`, s); }
  updateSubject(id: number, s: Subject): Observable<Subject> { return this.http.put<Subject>(`${this.api}/subjects/${id}`, s); }
  deleteSubject(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/subjects/${id}`); }

  getAssignments(classId?: number): Observable<SubjectAssignment[]> {
    const params = classId ? new HttpParams().set('classId', classId) : undefined;
    return this.http.get<SubjectAssignment[]>(`${this.api}/schedule/assignments`, { params });
  }
  createAssignment(a: SubjectAssignment): Observable<SubjectAssignment> { return this.http.post<SubjectAssignment>(`${this.api}/schedule/assignments`, a); }
  updateAssignment(id: number, a: SubjectAssignment): Observable<SubjectAssignment> { return this.http.put<SubjectAssignment>(`${this.api}/schedule/assignments/${id}`, a); }
  deleteAssignment(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/schedule/assignments/${id}`); }

  getConstraints(teacherId?: number): Observable<TeacherConstraint[]> {
    const params = teacherId ? new HttpParams().set('teacherId', teacherId) : undefined;
    return this.http.get<TeacherConstraint[]>(`${this.api}/schedule/constraints`, { params });
  }
  createConstraint(c: TeacherConstraint): Observable<TeacherConstraint> { return this.http.post<TeacherConstraint>(`${this.api}/schedule/constraints`, c); }
  deleteConstraint(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/schedule/constraints/${id}`); }

  getEntries(filter: { classId?: number; teacherId?: number }): Observable<ClassScheduleEntry[]> {
    let params = new HttpParams();
    if (filter.classId) params = params.set('classId', filter.classId);
    if (filter.teacherId) params = params.set('teacherId', filter.teacherId);
    return this.http.get<ClassScheduleEntry[]>(`${this.api}/schedule/entries`, { params });
  }
  setSlot(req: ScheduleSlotRequest): Observable<ClassScheduleEntry | null> { return this.http.put<ClassScheduleEntry | null>(`${this.api}/schedule/entries/slot`, req); }
  deleteEntry(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/schedule/entries/${id}`); }
  clear(classId?: number, includeLocked = false): Observable<{ count: number }> {
    let params = new HttpParams().set('includeLocked', includeLocked);
    if (classId) params = params.set('classId', classId);
    return this.http.delete<{ count: number }>(`${this.api}/schedule/entries`, { params });
  }
  generate(req: GenerateRequest): Observable<GenerateResult> { return this.http.post<GenerateResult>(`${this.api}/schedule/generate`, req); }
  getOverview(): Observable<ScheduleOverview> { return this.http.get<ScheduleOverview>(`${this.api}/schedule/overview`); }
}
