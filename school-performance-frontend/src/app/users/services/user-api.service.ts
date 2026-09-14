import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppUser } from '../../core/models';

interface UserDto {
  id?: number;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  active?: boolean;
  roleIds?: number[];
  roleNames?: string[];
  departmentId?: number;
  departmentName?: string;
}

interface UserRequest {
  username: string;
  password?: string;
  fullName: string;
  email?: string;
  phone?: string;
  active?: boolean;
  roleIds?: number[];
  departmentId?: number;
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly baseUrl = `${environment.apiUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<AppUser[]> {
    return this.http.get<UserDto[]>(this.baseUrl).pipe(map(users => users.map(u => this.toAppUser(u))));
  }

  create(user: AppUser): Observable<AppUser> {
    return this.http.post<UserDto>(this.baseUrl, this.toRequest(user, true)).pipe(map(u => this.toAppUser(u)));
  }

  update(id: number, user: AppUser): Observable<AppUser> {
    return this.http.put<UserDto>(`${this.baseUrl}/${id}`, this.toRequest(user, false)).pipe(map(u => this.toAppUser(u)));
  }

  toggleActive(user: AppUser): Observable<AppUser> {
    return this.update(user.id!, { ...user, active: !user.active });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private toAppUser(dto: UserDto): AppUser {
    const roleIds = dto.roleIds ? [...dto.roleIds] : [];
    return {
      id: dto.id,
      fullName: dto.fullName,
      email: dto.email ?? '',
      username: dto.username,
      phone: dto.phone,
      roleId: roleIds[0],
      roleIds,
      roleName: dto.roleNames?.join('، ') ?? '',
      roleNames: dto.roleNames,
      departmentId: dto.departmentId,
      departmentName: dto.departmentName,
      active: dto.active ?? true
    };
  }

  private toRequest(user: AppUser, isCreate: boolean): UserRequest {
    const roleIds = user.roleIds?.length ? user.roleIds : (user.roleId != null ? [user.roleId] : []);
    const request: UserRequest = {
      username: user.username,
      fullName: user.fullName,
      email: user.email || undefined,
      phone: user.phone || undefined,
      active: user.active,
      roleIds,
      departmentId: user.departmentId
    };
    if (isCreate || user.password) {
      request.password = user.password;
    }
    return request;
  }
}
