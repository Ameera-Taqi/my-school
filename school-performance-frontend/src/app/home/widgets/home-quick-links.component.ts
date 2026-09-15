import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PermissionService } from '../../core/services/permission.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

/** Every page the user may open, grouped like the sidebar. Built from the permission-filtered sidebar config. */
@Component({
  selector: 'app-home-quick-links',
  standalone: true,
  imports: [UiIconComponent, RouterLink, TranslatePipe],
  host: { class: 'block' },
  template: `
    @for (section of sections(); track section.titleKey) {
      <section class="mb-5">
        <h3 class="mb-[0.6rem] text-[0.85rem] font-bold text-muted">{{ section.titleKey | translate }}</h3>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          @for (item of section.items; track item.route) {
            <a
              [routerLink]="item.route"
              class="flex items-center gap-[0.6rem] rounded-sp-sm border border-border bg-white/90 px-[0.9rem] py-3 text-[0.88rem] font-semibold text-text no-underline shadow-sp transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sp-md">
              <app-ui-icon [name]="item.icon" class="shrink-0 text-primary-mid"></app-ui-icon>
              <span>{{ item.labelKey | translate }}</span>
            </a>
          }
        </div>
      </section>
    }
  `
})
export class HomeQuickLinksComponent {
  private readonly permissions = inject(PermissionService);
  readonly sections = computed(() => this.permissions.visibleSidebarSections().filter(s => s.titleKey !== 'section.home'));
}
