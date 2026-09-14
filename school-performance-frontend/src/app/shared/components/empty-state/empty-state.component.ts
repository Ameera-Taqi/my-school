import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Friendly empty state with optional action slot: <app-empty-state icon="..." title="..."><button>…</button></app-empty-state> */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="empty-state" [class.compact]="compact">
      <div class="icon-wrap"><mat-icon>{{ icon }}</mat-icon></div>
      <h3>{{ title }}</h3>
      @if (description) {
        <p>{{ description }}</p>
      }
      <div class="actions"><ng-content></ng-content></div>
    </div>
  `,
  styles: [`
    .empty-state { padding: 3rem 1rem; }
    .empty-state.compact { padding: 1.75rem 1rem; }
    .icon-wrap {
      width: 72px; height: 72px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: var(--sp-primary-bg); color: var(--sp-primary-mid);
      mat-icon { font-size: 36px; width: 36px; height: 36px; }
    }
    .compact .icon-wrap { width: 56px; height: 56px; mat-icon { font-size: 28px; width: 28px; height: 28px; } }
    h3 { margin: 0.25rem 0 0; font-size: 1.05rem; color: var(--sp-text); font-weight: 700; }
    p { margin: 0; max-width: 420px; line-height: 1.7; }
    .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; margin-top: 0.5rem; }
    .actions:empty { display: none; }
  `]
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'لا توجد بيانات';
  @Input() description = '';
  @Input() compact = false;
}
