import { NgClass } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs';
import { SidebarSection } from '../../core/models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LayoutService } from '../../shared/services/layout.service';
import { LanguageService } from '../../core/services/language.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgClass, UiIconComponent, RouterModule, MatTooltipModule, TranslatePipe],
  host: { class: 'block h-full' },
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent implements OnInit {
  @Input() sections: SidebarSection[] = [];
  @Input() mini = false;

  readonly layout = inject(LayoutService);
  readonly lang = inject(LanguageService);
  private readonly router = inject(Router);

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(() => this.revealActiveSection());
  }

  ngOnInit(): void {
    this.revealActiveSection();
  }

  isOpen(section: SidebarSection): boolean {
    if (section.titleKey === 'section.home') return true;
    return this.layout.isSectionOpen(section.titleKey);
  }

  toggle(section: SidebarSection, event?: Event): void {
    event?.preventDefault();
    if (this.mini || section.titleKey === 'section.home') return;
    this.layout.toggleSection(section.titleKey);
  }

  containsActive(section: SidebarSection): boolean {
    const url = this.router.url.split('?')[0];
    return section.items.some(item => this.routeMatches(url, item.route));
  }

  tooltipPosition(): 'left' | 'right' {
    return this.lang.direction() === 'rtl' ? 'left' : 'right';
  }

  /** After navigation, expand the section that contains the current page. */
  private revealActiveSection(): void {
    for (const section of this.sections) {
      if (section.titleKey !== 'section.home' && this.containsActive(section)) {
        this.layout.ensureSectionOpen(section.titleKey);
      }
    }
  }

  private routeMatches(url: string, route: string): boolean {
    return url === route || url.startsWith(route + '/');
  }
}
