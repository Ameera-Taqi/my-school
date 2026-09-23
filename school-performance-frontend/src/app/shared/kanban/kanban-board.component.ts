import { Component, Input } from '@angular/core';
import { KanbanStage } from './kanban.models';
import { KanbanColumnComponent } from './kanban-column.component';

/** Horizontal board. Column count and titles come from the stages input. */
@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [KanbanColumnComponent],
  template: `
    <section class="kanban-board" role="region" [attr.aria-label]="label">
      <div class="kanban-columns" [style.--kanban-columns]="stages.length || 1">
        @for (stage of stages; track stage.id) {
          <app-kanban-column [stage]="stage" [emptyLabel]="emptyLabel"></app-kanban-column>
        }
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      margin-bottom: 20px;
    }
    .kanban-board {
      width: 100%;
      padding: 20px;
      overflow-x: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sp-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-sp);
    }
    .kanban-columns {
      display: grid;
      direction: rtl;
      grid-template-columns: repeat(var(--kanban-columns), minmax(12rem, 1fr));
      gap: 16px;
      align-items: stretch;
    }
  `]
})
export class KanbanBoardComponent {
  @Input() stages: KanbanStage[] = [];
  @Input() label = '';
  @Input() emptyLabel = '';
}
