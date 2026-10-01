import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KanbanStage, KanbanTask } from './kanban.models';
import { KanbanTaskCardComponent } from './kanban-task-card.component';

/** One workflow column. The stage title always comes from the stage input. */
@Component({
  selector: 'app-kanban-column',
  standalone: true,
  imports: [KanbanTaskCardComponent],
  template: `
    <section class="column" [attr.data-stage-id]="stage.id" [attr.aria-labelledby]="headingId">
      <header class="column-header">
        <h2 class="column-title" [id]="headingId">{{ stage.title }}</h2>
      </header>
      <div class="column-body" role="list">
        @for (task of stage.tasks; track task.id) {
          <div role="listitem">
            <app-kanban-task-card [task]="task" (activate)="taskOpen.emit($event)"></app-kanban-task-card>
          </div>
        } @empty {
          @if (emptyLabel) {
            <p class="column-empty">{{ emptyLabel }}</p>
          }
        }
      </div>
    </section>
  `,
  styles: [`
    :host {
      --col: var(--color-primary);
      display: flex;
      min-width: 0;
      min-height: 500px;
    }
    :host(:nth-child(5n + 2)) { --col: var(--color-warning); }
    :host(:nth-child(5n + 3)) { --col: var(--color-success); }
    :host(:nth-child(5n + 4)) { --col: var(--color-primary-mid); }
    :host(:nth-child(5n + 5)) { --col: var(--color-danger); }
    .column {
      display: flex;
      flex: 1;
      flex-direction: column;
      width: 100%;
      overflow: hidden;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sp);
      background: var(--color-app-bg);
    }
    .column-header {
      display: flex;
      flex: 0 0 56px;
      align-items: center;
      justify-content: center;
      height: 56px;
      padding: 0 16px;
      background: var(--col, var(--color-primary));
    }
    .column-title {
      margin: 0;
      color: var(--color-surface);
      font-size: 15px;
      font-weight: 600;
      line-height: 1.4;
      text-align: center;
    }
    .column-body {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
    }
    .column-empty {
      margin: 0;
      color: var(--color-faint);
      font-size: 13px;
      font-weight: 500;
      text-align: center;
    }
  `]
})
export class KanbanColumnComponent {
  @Input({ required: true }) stage!: KanbanStage;
  @Input() emptyLabel = '';
  @Output() taskOpen = new EventEmitter<KanbanTask>();

  get headingId(): string {
    return `kanban-col-${this.stage.id}`;
  }
}
