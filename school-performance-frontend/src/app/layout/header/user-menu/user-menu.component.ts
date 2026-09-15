import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { UiIconComponent } from '../../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [RouterLink, TranslatePipe, UiIconComponent],
  host: {
    class: 'relative inline-flex'
  },
  styles: [`
    .um-item {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border: 0;
      background: transparent;
      color: #1e293b;
      font: inherit;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      text-align: start;
      transition: background 0.15s;
    }
    .um-item:hover { background: #f8fafc; }
    .um-item--danger { color: #c62828; }
    .um-item--danger:hover { background: #fff5f5; }
  `],
  templateUrl: './user-menu.component.html'
})
export class UserMenuComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly lang = inject(LanguageService);

  readonly open = signal(false);

  readonly user = this.auth.user;
  readonly fullName = this.auth.fullName;
  readonly username = computed(() => this.user()?.username ?? '');
  readonly canOpenSettings = computed(() => this.auth.hasPermission('settings.view'));

  readonly displayName = computed(() => {
    const name = this.fullName().trim();
    return name || this.username() || this.lang.translate('role.default');
  });

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

  readonly identityLine = computed(() => {
    const dept = this.user()?.departmentName?.trim();
    return dept || this.primaryRoleLabel();
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  toggle(event: Event): void {
    event.stopPropagation();
    this.open.update(v => !v);
  }

  close(): void {
    this.open.set(false);
  }

  goToDashboard(): void {
    this.close();
    this.router.navigate(['/home']);
  }

  logout(): void {
    this.close();
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
