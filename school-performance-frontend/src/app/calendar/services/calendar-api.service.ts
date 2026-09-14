import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CalendarEvent } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class CalendarApiService {
  constructor(private readonly http: HttpClient) {}

  getEvents(month?: string): Observable<CalendarEvent[]> {
    let params = new HttpParams();
    if (month) {
      params = params.set('month', month);
    }
    return this.http.get<CalendarEvent[]>(`${environment.apiUrl}/calendar/events`, { params });
  }

  create(event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.post<CalendarEvent>(`${environment.apiUrl}/calendar/events`, event);
  }

  update(id: number, event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.put<CalendarEvent>(`${environment.apiUrl}/calendar/events/${id}`, event);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/calendar/events/${id}`);
  }
}
