import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RolePermission } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class RolePermissionApiService {
  private readonly baseUrl = `${environment.apiUrl}/role-permissions`;

  constructor(private readonly http: HttpClient) {}

  getByRole(roleId: number): Observable<RolePermission> {
    return this.http.get<RolePermission>(`${this.baseUrl}/${roleId}`);
  }

  save(roleId: number, permissionIds: number[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(this.baseUrl, { roleId, permissionIds });
  }
}
