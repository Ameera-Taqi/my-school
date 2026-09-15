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
    <div class="min-w-[320px] max-w-[440px] px-1 pt-2">
      <div
        class="mx-auto mt-2 flex size-14 items-center justify-center rounded-full text-2xl"
        [class.bg-danger-bg]="data.danger"
        [class.text-danger]="data.danger"
        [class.bg-primary-light]="!data.danger"
        [class.text-primary-mid]="!data.danger"
      >
        <app-ui-icon [name]="data.icon || (data.danger ? 'delete_forever' : 'help_outline')"></app-ui-icon>
      </div>
      <h2 mat-dialog-title class="mt-2 mb-0 text-center">{{ data.title }}</h2>
      <mat-dialog-content class="flex flex-col items-center">
        <p class="m-0 text-center leading-relaxed text-muted">{{ data.message }}</p>
        @if (data.itemName) {
          <p class="mx-auto mt-3 mb-0 inline-block max-w-full truncate rounded-lg bg-app-bg px-3 py-1.5 text-center font-bold text-text">
            {{ data.itemName }}
          </p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="gap-2 px-4 pb-4 pt-3">
        <button mat-button type="button" (click)="ref.close(false)">{{ data.cancelText || 'إلغاء' }}</button>
        <button mat-flat-button type="button" [color]="data.danger ? 'warn' : 'primary'" cdkFocusInitial (click)="ref.close(true)">
          {{ data.confirmText || (data.danger ? 'حذف' : 'تأكيد') }}
        </button>
      </mat-dialog-actions>
    </div>
  `
})
export class ConfirmDialogComponent {
  readonly data: ConfirmDialogData = inject(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<ConfirmDialogComponent>);
}
