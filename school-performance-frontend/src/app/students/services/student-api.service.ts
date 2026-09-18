import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Student, StudentImportItem, StudentImportResult } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class StudentApiService {
  constructor(private readonly http: HttpClient) {}

  getByClass(classId: number): Observable<Student[]> {
    return this.http.get<Student[]>(`${environment.apiUrl}/classes/${classId}/students`);
  }

  getById(studentId: number): Observable<Student> {
    return this.http.get<Student>(`${environment.apiUrl}/students/${studentId}`);
  }

  create(classId: number, student: Student): Observable<Student> {
    return this.http.post<Student>(`${environment.apiUrl}/classes/${classId}/students`, this.sanitize(student));
  }

  import(classId: number, students: StudentImportItem[]): Observable<StudentImportResult> {
    return this.http.post<StudentImportResult>(`${environment.apiUrl}/classes/${classId}/students/import`, { students });
  }

  update(studentId: number, student: Student): Observable<Student> {
    return this.http.put<Student>(`${environment.apiUrl}/students/${studentId}`, this.sanitize(student));
  }

  private sanitize(student: Student): Student {
    return {
      ...student,
      birthDate: student.birthDate || undefined,
      guardianPhone: student.guardianPhone || undefined,
      notes: student.notes || undefined
    };
  }

  delete(studentId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/students/${studentId}`);
  }
}
