import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TeacherMonitoringRecord } from '../../core/models';

export interface TeacherMonitoringFilters {
  status?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class TeacherMonitoringApiService {
  constructor(private readonly http: HttpClient) {}

  getAll(filters?: TeacherMonitoringFilters): Observable<TeacherMonitoringRecord[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search?.trim()) params = params.set('search', filters.search.trim());

    return this.http.get<TeacherMonitoringRecord[]>(`${environment.apiUrl}/teacher-monitoring`, { params });
  }
}
