import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterModule],
  template: `
    <nav class="mb-4 flex flex-wrap items-center gap-1.5 text-[0.9rem] text-muted" aria-label="مسار التنقل">
      @for (item of items; track item.label; let last = $last) {
        @if (!last && item.route) {
          <a class="text-primary no-underline hover:underline" [routerLink]="item.route">{{ item.label }}</a>
          <span class="text-faint">/</span>
        } @else {
          <span class="font-semibold text-text">{{ item.label }}</span>
        }
      }
    </nav>
  `
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}
