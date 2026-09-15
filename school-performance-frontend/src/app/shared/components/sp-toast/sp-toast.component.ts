import { Component, NgZone, ViewEncapsulation } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Toast, ToastPackage, ToastrService } from 'ngx-toastr';
import { UiIconComponent } from '../../icons/ui-icon.component';

@Component({
  selector: '[sp-toast]',
  standalone: true,
  imports: [UiIconComponent],
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'sp-toast',
    '[class]': 'toastClasses',
    '[@flyInOut]': '_state',
    '[style.display]': 'displayStyle',
    '(click)': 'tapToast()',
    '(mouseenter)': 'stickAround()',
    '(mouseleave)': 'delayedHideToast()'
  },
  animations: [
    trigger('flyInOut', [
      state('inactive', style({ opacity: 0, transform: 'translateY(-8px) scale(0.98)' })),
      state('active', style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
      state('removed', style({ opacity: 0, transform: 'translateY(-6px) scale(0.98)' })),
      transition('inactive => active', animate('{{ easeTime }}ms {{ easing }}')),
      transition('active => removed', animate('{{ easeTime }}ms {{ easing }}'))
    ])
  ],
  template: `
    <div class="sp-toast__icon" aria-hidden="true">
      <span class="sp-toast__badge">
        <app-ui-icon [name]="iconName"></app-ui-icon>
      </span>
    </div>

    <div class="sp-toast__body">
      @if (title) {
        <div class="sp-toast__title" [attr.aria-label]="title">
          {{ title }}
          @if (duplicatesCount) {
            <span class="sp-toast__dup">[{{ duplicatesCount + 1 }}]</span>
          }
        </div>
      }
      @if (message) {
        <div class="sp-toast__message" role="alert" [attr.aria-label]="message">{{ message }}</div>
      }
    </div>

    @if (options.closeButton) {
      <button type="button" class="sp-toast__close" (click)="remove(); $event.stopPropagation()" [attr.aria-label]="'إغلاق'">
        <app-ui-icon name="close"></app-ui-icon>
      </button>
    }

    @if (options.progressBar) {
      <div class="sp-toast__progress" [style.width.%]="width()"></div>
    }
  `
})
export class SpToastComponent extends Toast {
  constructor(toastrService: ToastrService, toastPackage: ToastPackage, ngZone?: NgZone) {
    super(toastrService, toastPackage, ngZone);
  }

  get iconName(): string {
    switch (this.kind) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'check';
    }
  }

  get kind(): 'success' | 'error' | 'info' | 'warning' {
    const type = this.toastPackage.toastType || '';
    if (type.includes('error')) return 'error';
    if (type.includes('warning')) return 'warning';
    if (type.includes('info')) return 'info';
    return 'success';
  }
}
