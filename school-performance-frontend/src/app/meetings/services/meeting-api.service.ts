import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Meeting } from '../../core/models';

/** Meetings API. Calendar events for targeted roles are created by the server. */
@Injectable({ providedIn: 'root' })
export class MeetingApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/meetings`;

  getAll(): Observable<Meeting[]> {
    return this.http.get<Meeting[]>(this.baseUrl);
  }

  create(m: Meeting): Observable<Meeting> {
    return this.http.post<Meeting>(this.baseUrl, this.toRequest(m));
  }

  update(id: number, m: Meeting): Observable<Meeting> {
    return this.http.put<Meeting>(`${this.baseUrl}/${id}`, this.toRequest(m));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private toRequest(m: Meeting) {
    return {
      title: m.title,
      meetingDate: m.meetingDate,
      attendees: m.attendees || undefined,
      agenda: m.agenda || undefined,
      minutes: m.minutes || undefined,
      followUpTasks: m.followUpTasks || undefined,
      targetRoleKeys: m.targetRoleKeys ?? []
    };
  }
}
