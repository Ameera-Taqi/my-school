import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const permissionService = inject(PermissionService);
  const router = inject(Router);
  const requiredPermission = route.data['permission'] as string | string[];

  if (!requiredPermission) {
    return true;
  }

  const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
  const hasAccess = permissions.some(p => authService.hasPermission(p));

  if (hasAccess) {
    return true;
  }

  const fallback = permissionService.getDefaultRoute();
  const currentPath = route.routeConfig?.path ? `/${route.routeConfig.path}` : '';
  if (currentPath === fallback) {
    authService.logout();
    return router.createUrlTree(['/login']);
  }

  return router.parseUrl(fallback);
};
