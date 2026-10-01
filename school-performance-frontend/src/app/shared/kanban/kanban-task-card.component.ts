import { NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KanbanTask } from './kanban.models';
import { KanbanProgressComponent } from './kanban-progress.component';

/** One task: stage accent, title, and progress. */
@Component({
  selector: 'app-kanban-task-card',
  standalone: true,
  imports: [KanbanProgressComponent, NgTemplateOutlet, RouterLink],
  template: `
    <ng-template #cardBody>
      <span class="task-accent" aria-hidden="true"></span>
      <h3 class="task-title">{{ task.title }}</h3>
      <app-kanban-progress [progress]="task.progress"></app-kanban-progress>
    </ng-template>

    @if (task.link) {
      <a class="task-card task-card--link" [routerLink]="task.link" [attr.aria-label]="task.title" [attr.data-task-id]="task.id" [attr.data-status]="task.status">
        <ng-container [ngTemplateOutlet]="cardBody"></ng-container>
      </a>
    } @else {
      <button type="button" class="task-card" [class.task-card--selected]="task.selected" [attr.aria-pressed]="task.selected" [attr.data-task-id]="task.id" [attr.data-status]="task.status" (click)="activate.emit(task)">
        <ng-container [ngTemplateOutlet]="cardBody"></ng-container>
      </button>
    }
  `,
  styles: [`
    .task-card {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      min-height: 100px;
      padding: 16px 24px 16px 16px;
      overflow: hidden;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sp-sm);
      background: var(--color-surface);
      box-shadow: var(--shadow-sp);
      direction: rtl;
      cursor: default;
      transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
    }
    .task-card--link {
      color: inherit;
      text-decoration: none;
      cursor: pointer;
    }
    button.task-card {
      width: 100%;
      color: inherit;
      font: inherit;
      text-align: inherit;
      cursor: pointer;
    }
    .task-card--selected {
      border-color: var(--col, var(--color-primary));
      box-shadow: var(--shadow-sp-md);
    }
    .task-card:hover {
      transform: translateY(-1px);
      border-color: var(--color-primary-light);
      box-shadow: var(--shadow-sp-md);
    }
    .task-card:focus-visible {
      outline: 2px solid var(--color-primary-mid);
      outline-offset: 2px;
    }
    .task-accent {
      position: absolute;
      top: 0;
      bottom: 0;
      inset-inline-start: 0;
      width: 5px;
      background: var(--col, var(--color-primary));
    }
    .task-title {
      margin: 0;
      color: var(--color-text);
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
      text-align: right;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class KanbanTaskCardComponent {
  @Input({ required: true }) task!: KanbanTask;
  @Output() activate = new EventEmitter<KanbanTask>();
}
