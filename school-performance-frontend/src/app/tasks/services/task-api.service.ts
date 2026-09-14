import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SchoolTask } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class TaskApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tasks`;

  getAll(): Observable<SchoolTask[]> {
    return this.http.get<SchoolTask[]>(this.baseUrl);
  }

  create(t: SchoolTask): Observable<SchoolTask> {
    return this.http.post<SchoolTask>(this.baseUrl, this.toRequest(t));
  }

  update(id: number, t: SchoolTask): Observable<SchoolTask> {
    return this.http.put<SchoolTask>(`${this.baseUrl}/${id}`, this.toRequest(t));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private toRequest(t: SchoolTask) {
    return {
      title: t.title,
      description: t.description || undefined,
      assignee: t.assignee || undefined,
      dueDate: t.dueDate || undefined,
      priority: t.priority,
      status: t.status,
      meetingId: t.meetingId ?? undefined,
      meetingTitle: t.meetingTitle || undefined
    };
  }
}
