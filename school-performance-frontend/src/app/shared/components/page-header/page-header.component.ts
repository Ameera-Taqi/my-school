import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="sp-hero mb-4">
      <div class="sp-hero__glow" aria-hidden="true"></div>
      <div class="sp-hero__fade" aria-hidden="true"></div>
      <div class="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h1 class="sp-hero__title">{{ title }}</h1>
          @if (subtitle) {
            <p class="sp-hero__subtitle">
              <span class="sp-hero__dot" aria-hidden="true"></span>
              {{ subtitle }}
            </p>
          }
        </div>
        <div class="flex shrink-0 flex-wrap items-center gap-2">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
