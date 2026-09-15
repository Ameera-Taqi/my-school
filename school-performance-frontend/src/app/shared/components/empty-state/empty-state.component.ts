import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { UiIconComponent } from '../../icons/ui-icon.component';

/** Friendly empty state with optional action slot: <app-empty-state icon="..." title="..."><button>…</button></app-empty-state> */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [UiIconComponent, NgClass],
  template: `
    <div
      class="empty-state flex flex-col items-center justify-center gap-3 px-4 text-center text-muted"
      [ngClass]="compact ? 'py-7' : 'py-12'"
    >
      <div
        class="flex items-center justify-center rounded-full bg-primary-bg text-primary-mid"
        [ngClass]="compact ? 'size-14' : 'size-[72px]'"
      >
        <app-ui-icon
          [name]="icon"
          [ngClass]="compact ? '!size-7 !text-[28px]' : '!size-9 !text-[36px]'"
        ></app-ui-icon>
      </div>
      <h3 class="mt-1 mb-0 text-[1.05rem] font-bold text-text">{{ title }}</h3>
      @if (description) {
        <p class="m-0 max-w-[420px] leading-relaxed">{{ description }}</p>
      }
      <div class="mt-2 flex flex-wrap justify-center gap-2 empty:hidden">
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'لا توجد بيانات';
  @Input() description = '';
  @Input() compact = false;
}
