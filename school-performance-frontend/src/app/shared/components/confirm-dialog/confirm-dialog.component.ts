import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { UiIconComponent } from '../../icons/ui-icon.component';

export interface ConfirmDialogData {
  title: string;
  message: string;
  /** Highlighted name of the item being acted on, shown under the message. */
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [UiIconComponent, MatDialogModule, MatButtonModule],
  template: `
    <div class="confirm">
      <div class="confirm__icon" [class.is-danger]="data.danger">
        <app-ui-icon [name]="data.icon || (data.danger ? 'delete_forever' : 'help_outline')"></app-ui-icon>
      </div>
      <h2 mat-dialog-title class="confirm__title">{{ data.title }}</h2>
      <p class="confirm__message">{{ data.message }}</p>
      @if (data.itemName) {
        <p class="confirm__item">{{ data.itemName }}</p>
      }
      <div class="confirm__actions">
        <button mat-stroked-button type="button" (click)="ref.close(false)">{{ data.cancelText || 'إلغاء' }}</button>
        <button mat-flat-button type="button" [color]="data.danger ? 'warn' : 'primary'" cdkFocusInitial (click)="ref.close(true)">
          {{ data.confirmText || (data.danger ? 'حذف' : 'تأكيد') }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .confirm {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1.35rem 1.35rem 1.15rem;
    }
    .confirm__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 999px;
      background: var(--sp-primary-bg, #eef2ff);
      color: var(--sp-primary-mid, #4f46e5);
      font-size: 1.35rem;
    }
    .confirm__icon.is-danger {
      background: var(--sp-danger-bg, #fff1f2);
      color: var(--sp-danger, #e11d48);
    }
    .confirm__title {
      margin: 0.85rem 0 0 !important;
      max-width: 18rem;
    }
    .confirm__message {
      margin: 0.45rem 0 0;
      max-width: 20rem;
      color: var(--sp-muted, #64748b);
      font-size: 0.95rem;
      font-weight: 500;
      line-height: 1.75;
    }
    .confirm__item {
      margin: 0.75rem 0 0;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0.35rem 0.75rem;
      border-radius: 0.65rem;
      background: #f8fafc;
      color: var(--sp-text, #0f172a);
      font-weight: 800;
    }
    .confirm__actions {
      display: flex;
      gap: 0.65rem;
      width: 100%;
      margin-top: 1.15rem;
    }
    .confirm__actions button {
      flex: 1 1 0;
      min-height: 42px;
    }
  `]
})
export class ConfirmDialogComponent {
  readonly data: ConfirmDialogData = inject(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<ConfirmDialogComponent>);
}
