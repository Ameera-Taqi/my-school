import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AttendanceRecord } from '../../core/models';

export interface TeacherAttendanceScope {
  scope: 'ALL' | 'DEPARTMENT' | 'SELF' | 'NONE';
  departmentId?: number | null;
  departmentName?: string | null;
  teacherId?: number | null;
  teacherName?: string | null;
  canRecord: boolean;
  teachersCount: number;
}

export interface AttendanceSummary {
  date: string;
  studentsTotal: number;
  recorded: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  /** null when nothing has been recorded for that day */
  rate: number | null;
}

/** Daily attendance for students (by class) and teachers, stored in the database. */
@Injectable({ providedIn: 'root' })
export class AttendanceApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/attendance`;

  getStudentAttendance(_stageId: number, classId: number, date: string): Observable<AttendanceRecord[]> {
    const params = new HttpParams().set('classId', classId).set('date', date);
    return this.http.get<AttendanceRecord[]>(`${this.baseUrl}/students`, { params });
  }

  getTeacherAttendance(date: string): Observable<AttendanceRecord[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<AttendanceRecord[]>(`${this.baseUrl}/teachers`, { params });
  }

  saveStudentAttendance(records: AttendanceRecord[]): Observable<void> {
    return this.http.put(`${this.baseUrl}/students`, records).pipe(map(() => void 0));
  }

  saveTeacherAttendance(records: AttendanceRecord[]): Observable<void> {
    return this.http.put(`${this.baseUrl}/teachers`, records).pipe(map(() => void 0));
  }

  /** Who the current user may see on the teacher attendance page. */
  getTeacherScope(): Observable<TeacherAttendanceScope> {
    return this.http.get<TeacherAttendanceScope>(`${this.baseUrl}/teachers/scope`);
  }

  /** Saved teacher records for a month (yyyy-MM), limited to the user's scope. */
  getTeacherHistory(month: string): Observable<AttendanceRecord[]> {
    const params = new HttpParams().set('month', month);
    return this.http.get<AttendanceRecord[]>(`${this.baseUrl}/teachers/history`, { params });
  }

  getSummary(date?: string): Observable<AttendanceSummary> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http.get<AttendanceSummary>(`${this.baseUrl}/summary`, { params });
  }
}
