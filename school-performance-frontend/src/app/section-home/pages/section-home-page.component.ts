import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { DashboardCalendarComponent } from '../../calendar/dashboard-calendar/dashboard-calendar.component';
import { SIDEBAR_SECTIONS } from '../../core/constants/sidebar.config';
import { AuthService } from '../../core/services/auth.service';
import { SidebarItem } from '../../core/models';

interface SectionHomeConfig {
  titleKey: string;
  subtitleKey: string;
  welcomeKey: string;
}

const SECTION_HOME_CONFIG: Record<string, SectionHomeConfig> = {
  'section.heads': {
    titleKey: 'sectionHome.heads.title',
    subtitleKey: 'sectionHome.heads.subtitle',
    welcomeKey: 'sectionHome.heads.welcome'
  },
  'section.teachers': {
    titleKey: 'sectionHome.teachers.title',
    subtitleKey: 'sectionHome.teachers.subtitle',
    welcomeKey: 'sectionHome.teachers.welcome'
  },
  'section.system': {
    titleKey: 'sectionHome.system.title',
    subtitleKey: 'sectionHome.system.subtitle',
    welcomeKey: 'sectionHome.system.welcome'
  }
};

@Component({
  selector: 'app-section-home-page',
  standalone: true,
  imports: [RouterModule, MatCardModule, MatIconModule, PageHeaderComponent, TranslatePipe, DashboardCalendarComponent],
  templateUrl: './section-home-page.component.html',
  styleUrl: './section-home-page.component.scss'
})
export class SectionHomePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  config: SectionHomeConfig | null = null;
  quickLinks: SidebarItem[] = [];

  ngOnInit(): void {
    const sectionTitleKey = this.route.snapshot.data['sectionTitleKey'] as string;
    this.config = SECTION_HOME_CONFIG[sectionTitleKey] ?? null;

    const section = SIDEBAR_SECTIONS.find(s => s.titleKey === sectionTitleKey);
    if (!section) return;

    const perms = this.authService.permissions();
    this.quickLinks = section.items.filter(item => {
      if (item.labelKey === 'nav.sectionHome') return false;
      const required = Array.isArray(item.permission) ? item.permission : [item.permission];
      return required.some(p => perms.has(p));
    });
  }
}
