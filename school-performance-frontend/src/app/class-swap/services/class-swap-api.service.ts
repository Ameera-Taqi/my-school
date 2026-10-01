import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClassSwapSide {
  teacherName: string;
  period: number;
  periodTime: string;
  subject: string;
  className: string;
  cancelled?: boolean;
}

export type ClassSwapKind = 'Exchange' | 'TakeOnly';

export interface ClassSwapPreview {
  valid: boolean;
  kind?: ClassSwapKind | string;
  kindLabel?: string;
  errors: string[];
  beforeRequester?: ClassSwapSide | null;
  beforeCounterparty?: ClassSwapSide | null;
  afterRequester?: ClassSwapSide | null;
  afterCounterparty?: ClassSwapSide | null;
}

export interface ClassSwapLesson {
  entryId: number;
  period: number;
  periodTime: string;
  subject: string;
  className: string;
  teacherId: number;
  teacherName: string;
  swapped: boolean;
}

export interface ClassSwapTeacherOption {
  id: number;
  fullName: string;
  departmentName?: string | null;
}

export interface ClassSwapListItem {
  id: number;
  number: string;
  date: string;
  dayLabel: string;
  kind: ClassSwapKind | string;
  kindLabel: string;
  requesterTeacher: string;
  requesterPeriod: number;
  requesterSubject: string;
  requesterClassName: string;
  counterpartyTeacher: string;
  counterpartyPeriod: number;
  counterpartySubject: string;
  counterpartyClassName: string;
  departments?: string | null;
  status: string;
  statusLabel: string;
  createdAt: string;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  canExecute: boolean;
}

export interface ClassSwapListResponse {
  perspective: 'teacher' | 'department' | 'administration';
  summary: { pending: number; approved: number; rejected: number; executed: number };
  items: ClassSwapListItem[];
}

export interface ClassSwapApproval {
  stage: string;
  stageLabel: string;
  departmentName?: string | null;
  decision: string;
  decisionLabel: string;
  actedBy?: string | null;
  actedAt?: string | null;
  comment?: string | null;
}

export interface ClassSwapHistoryItem {
  action: string;
  actionLabel: string;
  userName: string;
  roleLabel: string;
  at: string;
  comment?: string | null;
}

export interface ClassSwapDetail extends ClassSwapListItem {
  reason?: string | null;
  requesterDepartment: string;
  counterpartyDepartment: string;
  beforeRequester: ClassSwapSide;
  beforeCounterparty: ClassSwapSide;
  afterRequester: ClassSwapSide;
  afterCounterparty: ClassSwapSide;
  approvals: ClassSwapApproval[];
  history: ClassSwapHistoryItem[];
}

export interface ClassSwapNotice {
  id: number;
  requestId: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ClassSwapApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/class-swaps`;

  list(view?: string): Observable<ClassSwapListResponse> {
    const params = view ? new HttpParams().set('view', view) : undefined;
    return this.http.get<ClassSwapListResponse>(this.base, { params });
  }

  detail(id: number): Observable<ClassSwapDetail> {
    return this.http.get<ClassSwapDetail>(`${this.base}/${id}`);
  }

  teachers(): Observable<ClassSwapTeacherOption[]> {
    return this.http.get<ClassSwapTeacherOption[]>(`${this.base}/teachers`);
  }

  timetable(date: string, teacherId: number): Observable<ClassSwapLesson[]> {
    const params = new HttpParams().set('date', date).set('teacherId', teacherId);
    return this.http.get<ClassSwapLesson[]>(`${this.base}/timetable`, { params });
  }

  validate(body: { date: string; kind?: ClassSwapKind; myEntryId: number; otherTeacherId: number; otherEntryId: number; reason?: string }): Observable<ClassSwapPreview> {
    return this.http.post<ClassSwapPreview>(`${this.base}/validate`, body);
  }

  create(body: { date: string; kind?: ClassSwapKind; myEntryId: number; otherTeacherId: number; otherEntryId: number; reason?: string }): Observable<ClassSwapDetail> {
    return this.http.post<ClassSwapDetail>(this.base, body);
  }

  approve(id: number, comment?: string): Observable<ClassSwapDetail> {
    return this.http.post<ClassSwapDetail>(`${this.base}/${id}/approve`, { comment: comment || null });
  }

  reject(id: number, comment?: string): Observable<ClassSwapDetail> {
    return this.http.post<ClassSwapDetail>(`${this.base}/${id}/reject`, { comment: comment || null });
  }

  cancel(id: number): Observable<ClassSwapDetail> {
    return this.http.post<ClassSwapDetail>(`${this.base}/${id}/cancel`, {});
  }

  executionPreview(id: number): Observable<ClassSwapPreview> {
    return this.http.get<ClassSwapPreview>(`${this.base}/${id}/execution-preview`);
  }

  execute(id: number): Observable<ClassSwapDetail> {
    return this.http.post<ClassSwapDetail>(`${this.base}/${id}/execute`, {});
  }

  notices(): Observable<ClassSwapNotice[]> {
    return this.http.get<ClassSwapNotice[]>(`${this.base}/notices`);
  }

  markRead(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/notices/${id}/read`, {});
  }
}
