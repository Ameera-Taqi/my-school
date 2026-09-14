import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SchoolClass } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class SchoolClassApiService {
  constructor(private readonly http: HttpClient) {}

  getByStage(stageId: number): Observable<SchoolClass[]> {
    return this.http.get<SchoolClass[]>(`${environment.apiUrl}/academic-stages/${stageId}/classes`);
  }

  getById(classId: number): Observable<SchoolClass> {
    return this.http.get<SchoolClass>(`${environment.apiUrl}/classes/${classId}`);
  }

  create(stageId: number, schoolClass: SchoolClass): Observable<SchoolClass> {
    return this.http.post<SchoolClass>(`${environment.apiUrl}/academic-stages/${stageId}/classes`, schoolClass);
  }

  update(classId: number, schoolClass: SchoolClass): Observable<SchoolClass> {
    return this.http.put<SchoolClass>(`${environment.apiUrl}/classes/${classId}`, schoolClass);
  }

  delete(classId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/classes/${classId}`);
  }
}
