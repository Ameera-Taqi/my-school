import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { SIDEBAR_SECTIONS } from '../constants/sidebar.config';
import { SidebarSection } from '../models';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly authService = inject(AuthService);

  readonly visibleSidebarSections = computed(() => this.buildVisibleSections());

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  getVisibleSidebarSections(): SidebarSection[] {
    return this.buildVisibleSections();
  }

  getDefaultRoute(): string {
    const perms = this.authService.permissions();
    for (const section of SIDEBAR_SECTIONS) {
      for (const item of section.items) {
        if (this.hasAnyPermission(item.permission, perms)) {
          return item.route;
        }
      }
    }

    if (!this.authService.isAuthenticated()) {
      return '/login';
    }

    const roles = this.authService.user()?.roles ?? [];
    if (roles.some(role => role.startsWith('DEPARTMENT_HEAD'))) {
      return '/heads-home';
    }
    if (roles.includes('TEACHER')) {
      return '/teachers-home';
    }
    if (roles.includes('ADMIN') || roles.includes('SCHOOL_MANAGER') || roles.includes('ASSISTANT_MANAGER')) {
      return '/dashboard';
    }

    return '/heads-home';
  }

  private hasAnyPermission(permission: string | string[], perms: Set<string>): boolean {
    const required = Array.isArray(permission) ? permission : [permission];
    return required.some(p => perms.has(p));
  }

  private buildVisibleSections(): SidebarSection[] {
    const perms = this.authService.permissions();
    return SIDEBAR_SECTIONS
      .map(section => ({
        ...section,
        items: section.items.filter(item => this.hasAnyPermission(item.permission, perms))
      }))
      .filter(section => section.items.length > 0);
  }
}
