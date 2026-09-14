import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models';

const TOKEN_KEY = 'sp_token';
const USER_KEY = 'sp_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUser = signal<LoginResponse | null>(this.loadUser());

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser()?.token);
  readonly permissions = computed(() => new Set(this.currentUser()?.permissions ?? []));
  readonly fullName = computed(() => this.currentUser()?.fullName ?? '');

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(response => this.setSession(response))
    );
  }

  refreshCurrentUser(): Observable<LoginResponse> {
    return this.http.get<LoginResponse>(`${environment.apiUrl}/auth/me`).pipe(
      tap(response => {
        const token = this.getToken();
        this.setSession({ ...response, token: token ?? undefined });
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  hasPermission(permission: string): boolean {
    return this.permissions().has(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    const userPerms = this.permissions();
    return permissions.some(p => userPerms.has(p));
  }

  private setSession(response: LoginResponse): void {
    if (response.token) {
      localStorage.setItem(TOKEN_KEY, response.token);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(response));
    this.currentUser.set(response);
  }

  private loadUser(): LoginResponse | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      const user = JSON.parse(raw) as LoginResponse;
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        user.token = token;
      }
      return user;
    } catch {
      return null;
    }
  }
}
