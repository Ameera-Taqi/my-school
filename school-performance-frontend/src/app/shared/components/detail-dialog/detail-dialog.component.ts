import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

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
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="detail-head">
      <div class="detail-icon"><mat-icon>{{ data.icon || 'info' }}</mat-icon></div>
      <div>
        <h2 mat-dialog-title>{{ data.title }}</h2>
        @if (data.subtitle) { <p class="subtitle">{{ data.subtitle }}</p> }
      </div>
    </div>
    <mat-dialog-content>
      <dl class="detail-grid">
        @for (f of data.fields; track f.label) {
          <dt>{{ f.label }}</dt>
          <dd>
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
  `,
  styles: [`
    .detail-head { display: flex; align-items: center; gap: 0.85rem; padding: 1.25rem 1.5rem 0; }
    .detail-head h2 { padding: 0; margin: 0; font-size: 1.15rem; }
    .detail-head h2::before { display: none; }
    .subtitle { margin: 0.1rem 0 0; color: var(--sp-text-muted); font-size: 0.85rem; }
    .detail-icon {
      width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--sp-primary-light); color: var(--sp-primary-mid);
    }
    .detail-grid {
      display: grid; grid-template-columns: max-content 1fr; gap: 0.6rem 1.25rem;
      margin: 0.75rem 0 0; min-width: 320px;
    }
    dt { color: var(--sp-text-muted); font-size: 0.85rem; padding-top: 2px; }
    dd { margin: 0; font-weight: 600; word-break: break-word; }
    @media (max-width: 599px) { .detail-grid { grid-template-columns: 1fr; min-width: 0; } dt { margin-top: 0.4rem; } }
  `]
})
export class DetailDialogComponent {
  readonly data: DetailDialogData = inject(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<DetailDialogComponent>);

  display(f: DetailField): string {
    return f.value === null || f.value === undefined || f.value === '' ? '—' : String(f.value);
  }
}
