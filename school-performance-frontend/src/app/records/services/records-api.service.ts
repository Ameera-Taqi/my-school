import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RecordCategory {
  id: number;
  name: string;
}

export interface RecordItem {
  id: number;
  number: string;
  name: string;
  categoryName: string;
  categoryId: number;
  description?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  canPreview: boolean;
  uploadedAt: string;
  updatedAt: string;
  status: string;
  statusLabel: string;
  authorityLabel?: string | null;
  ownerName: string;
  canEdit: boolean;
  canDelete: boolean;
  canSubmit: boolean;
  canCancel: boolean;
  canDecide: boolean;
  rowVersion: string;
}

export interface RecordEvent {
  action: string;
  actionLabel: string;
  userName: string;
  roleLabel: string;
  at: string;
  comment?: string | null;
}

export interface RecordDetail extends RecordItem {
  events: RecordEvent[];
}

export interface RecordListResponse {
  items: RecordItem[];
  summary: { total: number; pending: number; approved: number; returned: number };
}

export interface RecordNotice {
  id: number;
  recordId: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class RecordsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/records`;

  categories(): Observable<RecordCategory[]> {
    return this.http.get<RecordCategory[]>(`${this.base}/categories`);
  }

  list(view: string, q = '', status = '', categoryId: number | null = null): Observable<RecordListResponse> {
    let params = new HttpParams().set('view', view);
    if (q) params = params.set('q', q);
    if (status) params = params.set('status', status);
    if (categoryId) params = params.set('categoryId', categoryId);
    return this.http.get<RecordListResponse>(this.base, { params });
  }

  detail(id: number): Observable<RecordDetail> {
    return this.http.get<RecordDetail>(`${this.base}/${id}`);
  }

  file(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/file`, { responseType: 'blob' });
  }

  save(body: { id?: number; name: string; categoryId: number; description: string; rowVersion?: string; file?: File }): Observable<RecordDetail> {
    const data = new FormData();
    data.set('name', body.name);
    data.set('categoryId', String(body.categoryId));
    data.set('description', body.description);
    if (body.rowVersion) data.set('rowVersion', body.rowVersion);
    if (body.file) data.set('file', body.file);
    return body.id
      ? this.http.put<RecordDetail>(`${this.base}/${body.id}`, data)
      : this.http.post<RecordDetail>(this.base, data);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  submit(id: number): Observable<RecordDetail> {
    return this.http.post<RecordDetail>(`${this.base}/${id}/submit`, {});
  }

  approve(id: number, comment: string): Observable<RecordDetail> {
    return this.http.post<RecordDetail>(`${this.base}/${id}/approve`, { comment });
  }

  reject(id: number, comment: string): Observable<RecordDetail> {
    return this.http.post<RecordDetail>(`${this.base}/${id}/reject`, { comment });
  }

  returnForEdit(id: number, comment: string): Observable<RecordDetail> {
    return this.http.post<RecordDetail>(`${this.base}/${id}/return`, { comment });
  }

  cancel(id: number): Observable<RecordDetail> {
    return this.http.post<RecordDetail>(`${this.base}/${id}/cancel`, {});
  }

  notices(): Observable<RecordNotice[]> {
    return this.http.get<RecordNotice[]>(`${this.base}/notices`);
  }

  readNotice(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/notices/${id}/read`, {});
  }
}
