import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Permission } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class PermissionApiService {
  private readonly baseUrl = `${environment.apiUrl}/permissions`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Permission[]> {
    return this.http.get<Permission[]>(this.baseUrl);
  }

  create(permission: Permission): Observable<Permission> {
    return this.http.post<Permission>(this.baseUrl, permission);
  }

  update(id: number, permission: Permission): Observable<Permission> {
    return this.http.put<Permission>(`${this.baseUrl}/${id}`, permission);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
