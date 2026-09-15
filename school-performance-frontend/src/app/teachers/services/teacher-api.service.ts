import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Teacher } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class TeacherApiService {
  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Teacher[]> {
    return this.http.get<Teacher[]>(`${environment.apiUrl}/teachers`);
  }

  getByDepartment(departmentId: number): Observable<Teacher[]> {
    return this.http.get<Teacher[]>(`${environment.apiUrl}/departments/${departmentId}/teachers`);
  }

  getById(teacherId: number): Observable<Teacher> {
    return this.http.get<Teacher>(`${environment.apiUrl}/teachers/${teacherId}`);
  }

  create(departmentId: number, teacher: Teacher): Observable<Teacher> {
    return this.http.post<Teacher>(`${environment.apiUrl}/departments/${departmentId}/teachers`, this.sanitize(teacher));
  }

  update(teacherId: number, teacher: Teacher): Observable<Teacher> {
    return this.http.put<Teacher>(`${environment.apiUrl}/teachers/${teacherId}`, this.sanitize(teacher));
  }

  delete(teacherId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/teachers/${teacherId}`);
  }

  private sanitize(teacher: Teacher): Omit<Teacher, 'id' | 'departmentId' | 'departmentName' | 'roleKey' | 'roleName' | 'username'> {
    return {
      employeeNumber: teacher.employeeNumber,
      fullName: teacher.fullName,
      email: teacher.email || undefined,
      phone: teacher.phone || undefined,
      specialization: teacher.specialization || undefined,
      hireDate: teacher.hireDate || undefined,
      active: teacher.active ?? true,
      departmentHead: teacher.departmentHead === true,
      wingSupervisor: teacher.wingSupervisor === true
    };
  }
}
