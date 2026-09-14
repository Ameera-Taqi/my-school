import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

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
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm" [class.danger]="data.danger">
      <div class="confirm-icon">
        <mat-icon>{{ data.icon || (data.danger ? 'delete_forever' : 'help_outline') }}</mat-icon>
      </div>
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content>
        <p class="message">{{ data.message }}</p>
        @if (data.itemName) {
          <p class="item-name">{{ data.itemName }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="ref.close(false)">{{ data.cancelText || 'إلغاء' }}</button>
        <button mat-flat-button type="button" [color]="data.danger ? 'warn' : 'primary'" cdkFocusInitial (click)="ref.close(true)">
          {{ data.confirmText || (data.danger ? 'حذف' : 'تأكيد') }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm { padding: 0.5rem 0.25rem 0; min-width: 320px; max-width: 440px; }
    .confirm-icon {
      display: flex; align-items: center; justify-content: center;
      width: 56px; height: 56px; border-radius: 50%;
      margin: 0.5rem auto 0; background: var(--sp-primary-light); color: var(--sp-primary-mid);
      mat-icon { font-size: 30px; width: 30px; height: 30px; }
    }
    .danger .confirm-icon { background: var(--sp-danger-bg); color: var(--sp-danger); }
    h2 { text-align: center; margin: 0.5rem 0 0; }
    .message { margin: 0; text-align: center; color: var(--sp-text-muted); line-height: 1.7; }
    .item-name {
      margin: 0.75rem auto 0; text-align: center; font-weight: 700; color: var(--sp-text);
      background: #f3f4f8; border-radius: 8px; padding: 0.4rem 0.75rem; display: inline-block; max-width: 100%;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    mat-dialog-content { display: flex; flex-direction: column; align-items: center; }
    mat-dialog-actions { padding: 0.75rem 1rem 1rem; gap: 0.5rem; }
  `]
})
export class ConfirmDialogComponent {
  readonly data: ConfirmDialogData = inject(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<ConfirmDialogComponent>);
}
