import { Component, computed, inject, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LayoutService } from '../../shared/services/layout.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [UiIconComponent, MatMenuModule, MatDividerModule, MatButtonModule, MatTooltipModule, RouterLink, TranslatePipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  readonly langService = inject(LanguageService);
  readonly layout = inject(LayoutService);

  readonly user = this.authService.user;
  readonly fullName = this.authService.fullName;
  readonly username = computed(() => this.user()?.username ?? '');
  readonly roles = computed(() => this.user()?.roles ?? []);
  readonly departmentName = computed(() => this.user()?.departmentName ?? '');
  readonly canOpenSettings = computed(() => this.authService.hasPermission('settings.view'));
  readonly canViewAlerts = computed(() => this.authService.hasPermission('alerts.view'));
  readonly alertsBadge = computed(() => this.canViewAlerts());
  readonly menuPosition = computed(() => this.langService.direction() === 'rtl' ? 'before' : 'after');

  readonly initials = computed(() => {
    const name = this.fullName().trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length === 1) return parts[0].charAt(0);
      return parts[0].charAt(0) + parts[1].charAt(0);
    }
    const username = this.username().trim();
    return username ? username.charAt(0).toUpperCase() : '؟';
  });

  readonly primaryRoleLabel = computed(() => {
    const roleNames = this.user()?.roleNames ?? [];
    if (roleNames.length) return roleNames[0];

    const roles = this.roles();
    if (!roles.length) return this.langService.translate('role.default');
    const roleKey = roles[0];
    if (roleKey.startsWith('DEPARTMENT_HEAD')) {
      const label = this.langService.translate(`role.${roleKey}`);
      return label === `role.${roleKey}`
        ? this.langService.translate('role.DEPARTMENT_HEAD')
        : label;
    }
    return this.langService.translate(`role.${roleKey}`);
  });

  /** Role, plus department for department heads: "رئيس شعبة · شعبة الرياضيات". */
  readonly roleLine = computed(() => {
    const dept = this.departmentName();
    return dept ? `${this.primaryRoleLabel()} · ${dept}` : this.primaryRoleLabel();
  });

  readonly greetingLine = computed(() => {
    const h = new Date().getHours();
    const salute = this.langService.isEnglish()
      ? (h < 12 ? 'Good morning' : 'Good evening')
      : (h < 12 ? 'صباح الخير' : 'مساء الخير');
    const name = this.fullName().trim().replace(/^أ\.\s*/, '').split(/\s+/)[0]
      || this.primaryRoleLabel();
    return `${salute}، ${name}`;
  });

  onLanguageToggle(isEnglish: boolean): void {
    this.langService.setEnglish(isEnglish);
  }

  goToDashboard(): void {
    this.router.navigate(['/home']);
  }

  logout(): void {
    this.confirm.confirmed({
      title: this.langService.translate('menu.logoutConfirm.title'),
      message: this.langService.translate('menu.logoutConfirm.message'),
      confirmText: this.langService.translate('menu.logoutConfirm.confirm'),
      cancelText: this.langService.translate('common.cancel'),
      icon: 'logout',
      danger: true
    }).subscribe(() => this.authService.logout());
  }
}
