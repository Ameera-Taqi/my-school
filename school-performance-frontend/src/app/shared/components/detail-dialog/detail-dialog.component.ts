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
  /** Span the full content width (description, notes, long text). */
  wide?: boolean;
  /** Optional icon shown beside the field label. */
  icon?: string;
}

export interface DetailDialogData {
  title: string;
  subtitle?: string;
  icon?: string;
  /** Optional portrait shown instead of the header icon. */
  photoUrl?: string | null;
  /** Status/priority chips shown in the header. */
  badges?: { label: string; chip?: string }[];
  fields: DetailField[];
}

/** Read-only key/value viewer. Replaces the old alert() detail popups. */
@Component({
  selector: 'app-detail-dialog',
  standalone: true,
  imports: [UiIconComponent, MatDialogModule, MatButtonModule],
  styles: `
    :host { display: block; }
    .detail-head {
      display: flex;
      align-items: flex-start;
      gap: 0.95rem;
      padding: 1.35rem 1.5rem 0.85rem;
    }
    .detail-head__icon {
      display: flex;
      width: 3rem;
      height: 3rem;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 0.9rem;
      background: var(--color-primary-bg, #eef2ff);
      color: var(--color-primary-mid, #3949ab);
    }
    .detail-head__photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .detail-head__text { min-width: 0; flex: 1; }
    .detail-head__title {
      margin: 0;
      padding: 0;
      font-size: 1.15rem;
      font-weight: 800;
      line-height: 1.35;
      color: var(--color-text);
    }
    .detail-head__title::before { display: none; }
    .detail-head__sub {
      margin: 0.35rem 0 0;
      color: var(--color-muted);
      font-size: 0.85rem;
      line-height: 1.45;
    }
    .detail-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-top: 0.65rem;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
      margin: 0;
      padding: 0.25rem 0 0.35rem;
    }
    @media (max-width: 559px) {
      .detail-grid { grid-template-columns: 1fr; }
    }
    .detail-card {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 0.35rem;
      margin: 0;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 0.85rem;
      background: #f8fafc;
      padding: 0.85rem 0.95rem;
    }
    .detail-card--wide { grid-column: 1 / -1; background: #fff; }
    .detail-card__label {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0;
      color: var(--color-muted);
      font-size: 0.75rem;
      font-weight: 700;
    }
    .detail-card__value {
      margin: 0;
      color: var(--color-text);
      font-size: 0.95rem;
      font-weight: 700;
      line-height: 1.55;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .detail-card__value code {
      font-size: 0.88rem;
      font-weight: 600;
    }
    .detail-actions {
      margin: 0 !important;
      padding: 0.85rem 1.5rem 1.25rem !important;
      border-top: 1px solid #eef2f7;
    }
  `,
  template: `
    <div class="detail-head">
      <div class="detail-head__icon" aria-hidden="true">
        @if (data.photoUrl) {
          <img class="detail-head__photo" [src]="data.photoUrl" alt="">
        } @else {
          <app-ui-icon [name]="data.icon || 'info'" class="size-6 text-[24px]"></app-ui-icon>
        }
      </div>
      <div class="detail-head__text">
        <h2 mat-dialog-title class="detail-head__title">{{ data.title }}</h2>
        @if (data.subtitle) {
          <p class="detail-head__sub">{{ data.subtitle }}</p>
        }
        @if (data.badges?.length) {
          <div class="detail-badges">
            @for (badge of data.badges; track badge.label) {
              <span class="chip" [class]="'chip ' + (badge.chip || 'neutral')">{{ badge.label }}</span>
            }
          </div>
        }
      </div>
    </div>

    <mat-dialog-content>
      <dl class="detail-grid">
        @for (f of visibleFields; track f.label + $index) {
          <div class="detail-card" [class.detail-card--wide]="f.wide">
            <dt class="detail-card__label">
              @if (f.icon) {
                <app-ui-icon [name]="f.icon" class="size-3.5 text-[14px]"></app-ui-icon>
              }
              {{ f.label }}
            </dt>
            <dd class="detail-card__value">
              @if (f.chip) {
                <span class="chip" [class]="'chip ' + f.chip">{{ display(f) }}</span>
              } @else if (f.mono) {
                <code>{{ display(f) }}</code>
              } @else {
                {{ display(f) }}
              }
            </dd>
          </div>
        }
      </dl>
    </mat-dialog-content>

    <mat-dialog-actions class="detail-actions" align="end">
      <button mat-flat-button color="primary" type="button" (click)="ref.close()">إغلاق</button>
    </mat-dialog-actions>
  `
})
export class DetailDialogComponent {
  readonly data: DetailDialogData = inject(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<DetailDialogComponent>);

  get visibleFields(): DetailField[] {
    return this.data.fields.filter(f => f.value !== null && f.value !== undefined && f.value !== '');
  }

  display(f: DetailField): string {
    return f.value === null || f.value === undefined || f.value === '' ? '—' : String(f.value);
  }
}
