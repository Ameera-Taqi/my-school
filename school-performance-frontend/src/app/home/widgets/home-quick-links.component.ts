import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PermissionService } from '../../core/services/permission.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

/** Every page the user may open, grouped like the sidebar. Built from the permission-filtered sidebar config. */
@Component({
  selector: 'app-home-quick-links',
  standalone: true,
  imports: [RouterLink, MatIconModule, TranslatePipe],
  template: `
    @for (section of sections(); track section.titleKey) {
      <section class="links-section">
        <h3>{{ section.titleKey | translate }}</h3>
        <div class="links-grid">
          @for (item of section.items; track item.route) {
            <a [routerLink]="item.route" class="link-card"><mat-icon>{{ item.icon }}</mat-icon><span>{{ item.labelKey | translate }}</span></a>
          }
        </div>
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .links-section { margin-bottom: 1.25rem; h3 { margin: 0 0 0.6rem; font-size: 0.85rem; font-weight: 700; color: var(--sp-text-muted); } }
    .links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; }
    .link-card {
      display: flex; align-items: center; gap: 0.6rem; padding: 0.75rem 0.9rem;
      background: var(--sp-surface); border: 1px solid var(--sp-border); border-radius: 12px; box-shadow: var(--sp-shadow);
      color: var(--sp-text); text-decoration: none; font-weight: 600; font-size: 0.88rem; transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
      mat-icon { color: var(--sp-primary-mid); flex-shrink: 0; }
      &:hover { transform: translateY(-2px); box-shadow: var(--sp-shadow-md); border-color: #c5cae9; }
    }
  `]
})
export class HomeQuickLinksComponent {
  private readonly permissions = inject(PermissionService);
  readonly sections = computed(() => this.permissions.visibleSidebarSections().filter(s => s.titleKey !== 'section.home'));
}
