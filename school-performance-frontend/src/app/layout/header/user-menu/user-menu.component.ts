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
    const roleNames = this.user()?.roleNames ?? [];
    if (roleNames.length) return roleNames[0];
    const roles = this.user()?.roles ?? [];
    if (!roles.length) return this.lang.translate('role.default');
    const roleKey = roles[0];
    if (roleKey.startsWith('DEPARTMENT_HEAD')) {
      const label = this.lang.translate(`role.${roleKey}`);
      return label === `role.${roleKey}` ? this.lang.translate('role.DEPARTMENT_HEAD') : label;
    }
    return this.lang.translate(`role.${roleKey}`);
  });

  readonly roleLine = computed(() => {
    const dept = this.user()?.departmentName ?? '';
    return dept ? `${this.primaryRoleLabel()} · ${dept}` : this.primaryRoleLabel();
  });

  readonly greetingLine = computed(() => {
    const h = new Date().getHours();
    const salute = this.lang.isEnglish()
      ? (h < 12 ? 'Good morning' : 'Good evening')
      : (h < 12 ? 'صباح الخير' : 'مساء الخير');
    const name = this.fullName().trim().replace(/^أ\.\s*/, '').split(/\s+/)[0]
      || this.primaryRoleLabel();
    return `${salute}، ${name}`;
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
