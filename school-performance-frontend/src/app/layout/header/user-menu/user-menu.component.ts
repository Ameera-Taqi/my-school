import { Component, computed, inject, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { UiIconComponent } from '../../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [MatMenuModule, MatDividerModule, MatButtonModule, RouterLink, TranslatePipe, UiIconComponent],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class UserMenuComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  readonly lang = inject(LanguageService);

  readonly user = this.auth.user;
  readonly fullName = this.auth.fullName;
  readonly username = computed(() => this.user()?.username ?? '');
  readonly canOpenSettings = computed(() => this.auth.hasPermission('settings.view'));
  readonly menuPosition = computed(() => (this.lang.direction() === 'rtl' ? 'before' : 'after'));

  readonly initials = computed(() => {
    const name = this.fullName().trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length === 1) return parts[0].charAt(0);
      return parts[0].charAt(0) + parts[1].charAt(0);
    }
    const u = this.username().trim();
    return u ? u.charAt(0).toUpperCase() : '؟';
  });

  readonly primaryRoleLabel = computed(() => {
    const roles = this.user()?.roles ?? [];
    const names = this.user()?.roleNames ?? [];
    if (roles.length) return this.lang.roleLabel(roles[0], names[0]);
    if (names.length) return this.lang.roleLabel(names[0], names[0]);
    return this.lang.translate('role.default');
  });

  readonly roleLine = computed(() => {
    const dept = this.user()?.departmentName ?? '';
    return dept ? `${this.primaryRoleLabel()} · ${dept}` : this.primaryRoleLabel();
  });

  readonly greetingLine = computed(() => {
    const h = new Date().getHours();
    const saluteKey = h < 12 ? 'menu.greeting.morning' : 'menu.greeting.evening';
    const salute = this.lang.translate(saluteKey);
    const raw = this.fullName().trim().replace(/^أ\.\s*/, '');
    const first = raw.split(/\s+/).filter(Boolean)[0];
    // Prefer a real person name; avoid repeating the role title in the greeting.
    const name = first && first !== this.primaryRoleLabel() ? first : this.primaryRoleLabel();
    const sep = this.lang.isEnglish() ? ', ' : '، ';
    return `${salute}${sep}${name}`;
  });

  goToDashboard(): void {
    this.router.navigate(['/home']);
  }

  logout(): void {
    this.confirm.confirmed({
      title: this.lang.translate('menu.logoutConfirm.title'),
      message: this.lang.translate('menu.logoutConfirm.message'),
      confirmText: this.lang.translate('menu.logoutConfirm.confirm'),
      cancelText: this.lang.translate('common.cancel'),
      icon: 'logout',
      danger: true
    }).subscribe(() => this.auth.logout());
  }
}
