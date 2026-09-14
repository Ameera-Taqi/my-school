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

  /** Every signed-in user lands on the unified home page; its widgets adapt to permissions. */
  getDefaultRoute(): string {
    return this.authService.isAuthenticated() ? '/home' : '/login';
  }

  private hasAnyPermission(permission: string | string[], perms: Set<string>): boolean {
    const required = Array.isArray(permission) ? permission : [permission];
    return required.some(p => p === '*' || perms.has(p));
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
