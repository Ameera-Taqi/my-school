import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/services/toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toast = inject(ToastService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      // An expired or invalid token means the session is gone: clear it and go back to login.
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.includes('/auth/login')) {
        authService.logout();
      }
      // The server enforces permissions; tell the user instead of failing silently.
      if (error instanceof HttpErrorResponse && error.status === 403) {
        toast.error(error.error?.message || 'ليس لديك صلاحية لتنفيذ هذا الإجراء');
      }
      return throwError(() => error);
    })
  );
};
