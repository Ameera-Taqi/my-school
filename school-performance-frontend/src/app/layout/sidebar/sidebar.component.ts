import { Component, Input, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SidebarSection } from '../../core/models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LayoutService } from '../../shared/services/layout.service';
import { LanguageService } from '../../core/services/language.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [UiIconComponent, RouterModule, MatTooltipModule, TranslatePipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Input() sections: SidebarSection[] = [];
  @Input() mini = false;

  readonly layout = inject(LayoutService);
  readonly lang = inject(LanguageService);
  private readonly router = inject(Router);

  isOpen(section: SidebarSection): boolean {
    if (section.titleKey === 'section.home') return true;
    // Never hide the section that contains the current page.
    if (this.containsActive(section)) return true;
    return this.layout.isSectionOpen(section.titleKey);
  }

  toggle(section: SidebarSection): void {
    if (this.mini) return;
    // Keep the active section visible so the current page stays findable.
    if (this.containsActive(section) && this.layout.isSectionOpen(section.titleKey)) return;
    this.layout.toggleSection(section.titleKey);
  }

  containsActive(section: SidebarSection): boolean {
    const url = this.router.url.split('?')[0];
    return section.items.some(item => url === item.route || url.startsWith(item.route + '/'));
  }

  tooltipPosition(): 'left' | 'right' {
    return this.lang.direction() === 'rtl' ? 'left' : 'right';
  }
}
