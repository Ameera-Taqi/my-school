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
    <nav class="breadcrumb" aria-label="مسار التنقل">
      @for (item of items; track item.label; let last = $last) {
        @if (!last && item.route) {
          <a [routerLink]="item.route">{{ item.label }}</a>
          <span class="sep">/</span>
        } @else {
          <span class="current">{{ item.label }}</span>
        }
      }
    </nav>
  `,
  styles: [`
    .breadcrumb {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
      color: #666;
    }
    a {
      color: #1a237e;
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
    .sep { color: #bbb; }
    .current { color: #333; font-weight: 600; }
  `]
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}
