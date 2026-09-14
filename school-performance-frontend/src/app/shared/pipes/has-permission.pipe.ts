import { Pipe, PipeTransform, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Pipe({ name: 'hasPermission', standalone: true, pure: false })
export class HasPermissionPipe implements PipeTransform {
  private readonly authService = inject(AuthService);

  transform(permission: string | string[]): boolean {
    if (Array.isArray(permission)) {
      return permission.some(p => this.authService.hasPermission(p));
    }
    return this.authService.hasPermission(permission);
  }
}
