import { Component, computed, inject, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LayoutService } from '../../shared/services/layout.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';
import { UserMenuComponent } from './user-menu/user-menu.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [UiIconComponent, MatButtonModule, MatTooltipModule, RouterLink, TranslatePipe, UserMenuComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  readonly langService = inject(LanguageService);
  readonly layout = inject(LayoutService);

  readonly canViewAlerts = computed(() => this.authService.hasPermission('alerts.view'));
  readonly alertsBadge = computed(() => this.canViewAlerts());

  onLanguageToggle(isEnglish: boolean): void {
    this.langService.setEnglish(isEnglish);
  }
}
