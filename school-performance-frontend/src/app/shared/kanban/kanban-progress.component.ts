import { Component, Input } from '@angular/core';

/** Thin progress track with a percentage. Width comes from the task, not from CSS. */
@Component({
  selector: 'app-kanban-progress',
  standalone: true,
  template: `
    <div class="progress-row">
      <span class="progress-value">{{ clamped }}%</span>
      <div
        class="progress-track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-valuenow]="clamped"
        [attr.aria-label]="clamped + '%'">
        <div class="progress-fill" [style.width.%]="clamped"></div>
      </div>
    </div>
  `,
  styles: [`
    .progress-row {
      display: flex;
      direction: rtl;
      align-items: center;
      gap: 8px;
    }
    .progress-track {
      flex: 1;
      height: 6px;
      overflow: hidden;
      border-radius: 999px;
      background: var(--color-border);
      direction: rtl;
    }
    .progress-fill {
      height: 100%;
      border-radius: 999px;
      background: var(--col, var(--color-primary));
      transition: width 200ms ease;
    }
    .progress-value {
      flex: 0 0 auto;
      color: var(--color-muted);
      font-size: 12px;
      font-weight: 500;
      line-height: 1;
    }
  `]
})
export class KanbanProgressComponent {
  @Input() progress = 0;

  get clamped(): number {
    return Math.max(0, Math.min(100, Math.round(this.progress)));
  }
}
