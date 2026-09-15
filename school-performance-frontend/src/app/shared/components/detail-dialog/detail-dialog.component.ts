import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { UiIconComponent } from '../../icons/ui-icon.component';

export interface DetailField {
  label: string;
  value?: string | number | null;
  /** Optional chip class: success | warning | danger | info | neutral */
  chip?: string;
  mono?: boolean;
}

export interface DetailDialogData {
  title: string;
  subtitle?: string;
  icon?: string;
  fields: DetailField[];
}

/** Read-only key/value viewer. Replaces the old alert() detail popups. */
@Component({
  selector: 'app-detail-dialog',
  standalone: true,
  imports: [UiIconComponent, MatDialogModule, MatButtonModule],
  template: `
    <div class="flex items-center gap-[0.85rem] px-6 pt-5">
      <div class="flex size-[46px] shrink-0 items-center justify-center rounded-sp-sm bg-primary-light text-primary-mid">
        <app-ui-icon [name]="data.icon || 'info'"></app-ui-icon>
      </div>
      <div>
        <h2 mat-dialog-title class="m-0 p-0 text-[1.15rem] before:hidden">{{ data.title }}</h2>
        @if (data.subtitle) {
          <p class="mt-0.5 mb-0 text-[0.85rem] text-muted">{{ data.subtitle }}</p>
        }
      </div>
    </div>
    <mat-dialog-content>
      <dl class="mt-3 mb-0 grid min-w-80 grid-cols-[max-content_1fr] gap-x-5 gap-y-[0.6rem] max-sm:min-w-0 max-sm:grid-cols-1">
        @for (f of data.fields; track f.label) {
          <dt class="pt-0.5 text-[0.85rem] text-muted max-sm:mt-1.5">{{ f.label }}</dt>
          <dd class="m-0 font-semibold break-words">
            @if (f.chip) {
              <span class="chip" [class]="'chip ' + f.chip">{{ display(f) }}</span>
            } @else if (f.mono) {
              <code>{{ display(f) }}</code>
            } @else {
              {{ display(f) }}
            }
          </dd>
        }
      </dl>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" type="button" (click)="ref.close()">إغلاق</button>
    </mat-dialog-actions>
  `
})
export class DetailDialogComponent {
  readonly data: DetailDialogData = inject(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<DetailDialogComponent>);

  display(f: DetailField): string {
    return f.value === null || f.value === undefined || f.value === '' ? '—' : String(f.value);
  }
}
