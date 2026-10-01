import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssignableUser, SchoolTask, TaskListResponse, TaskNotice } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class TaskApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tasks`;

  list(view = 'mine', q = '', status = '', priority = ''): Observable<TaskListResponse> {
    let params = new HttpParams().set('view', view);
    if (q) params = params.set('q', q);
    if (status) params = params.set('status', status);
    if (priority) params = params.set('priority', priority);
    return this.http.get<TaskListResponse>(this.baseUrl, { params });
  }

  /** Dashboard widget: active tasks assigned to me. */
  getAll(): Observable<SchoolTask[]> {
    return this.http.get<SchoolTask[]>(`${this.baseUrl}/dashboard`);
  }

  detail(id: number): Observable<SchoolTask> {
    return this.http.get<SchoolTask>(`${this.baseUrl}/${id}`);
  }

  assignableUsers(): Observable<AssignableUser[]> {
    return this.http.get<AssignableUser[]>(`${this.baseUrl}/assignable-users`);
  }

  create(t: SchoolTask): Observable<SchoolTask> {
    return this.http.post<SchoolTask>(this.baseUrl, this.toRequest(t));
  }

  update(id: number, t: SchoolTask): Observable<SchoolTask> {
    return this.http.put<SchoolTask>(`${this.baseUrl}/${id}`, this.toRequest(t));
  }

  start(id: number): Observable<SchoolTask> {
    return this.http.post<SchoolTask>(`${this.baseUrl}/${id}/start`, {});
  }

  complete(id: number, comment = ''): Observable<SchoolTask> {
    return this.http.post<SchoolTask>(`${this.baseUrl}/${id}/complete`, { comment });
  }

  cancel(id: number, comment = ''): Observable<SchoolTask> {
    return this.http.post<SchoolTask>(`${this.baseUrl}/${id}/cancel`, { comment });
  }

  comment(id: number, comment: string): Observable<SchoolTask> {
    return this.http.post<SchoolTask>(`${this.baseUrl}/${id}/comments`, { comment });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  notices(): Observable<TaskNotice[]> {
    return this.http.get<TaskNotice[]>(`${this.baseUrl}/notices`);
  }

  readNotice(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/notices/${id}/read`, {});
  }

  private toRequest(t: SchoolTask) {
    return {
      title: t.title,
      description: t.description || '',
      assigneeIds: t.assigneeIds,
      dueDate: t.dueDate || undefined,
      priority: t.priority,
      notes: t.notes || undefined,
      meetingId: t.meetingId ?? undefined,
      meetingTitle: t.meetingTitle || undefined
    };
  }
}
