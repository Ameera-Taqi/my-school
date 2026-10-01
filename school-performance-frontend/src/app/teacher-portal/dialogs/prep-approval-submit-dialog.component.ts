import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { PrepApprovalAuthority } from '../../core/models';

export interface PrepApprovalSubmitData {
  title: string;
  pending: PrepApprovalAuthority[];
}

export interface PrepApprovalSubmitResult {
  authority: PrepApprovalAuthority;
  note: string;
}

@Component({
  selector: 'app-prep-approval-submit-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="sheet">
      <h2 mat-dialog-title class="sheet__title">إرسال التحضير للاعتماد</h2>
      <p class="sheet__lesson">{{ data.title }}</p>

      <p class="sheet__label">جهة الاعتماد</p>
      <div class="sheet__options" role="radiogroup" aria-label="جهة الاعتماد">
        <button type="button" class="option" role="radio" [attr.aria-checked]="authority === 'DEPARTMENT'" [class.is-on]="authority === 'DEPARTMENT'" [disabled]="pending('DEPARTMENT')" (click)="pick('DEPARTMENT')">
          <span class="option__mark"></span>
          <span class="option__text">
            <strong>رئيس الشعبة</strong>
            @if (pending('DEPARTMENT')) { <small>طلب قائم</small> }
          </span>
        </button>
        <button type="button" class="option" role="radio" [attr.aria-checked]="authority === 'ADMINISTRATION'" [class.is-on]="authority === 'ADMINISTRATION'" [disabled]="pending('ADMINISTRATION')" (click)="pick('ADMINISTRATION')">
          <span class="option__mark"></span>
          <span class="option__text">
            <strong>الإدارة المدرسية</strong>
            @if (pending('ADMINISTRATION')) { <small>طلب قائم</small> }
          </span>
        </button>
      </div>

      <label class="sheet__note">
        <span>ملاحظة</span>
        <textarea rows="3" maxlength="500" [(ngModel)]="note" placeholder="اختياري"></textarea>
      </label>

      <div class="sheet__actions">
        <button mat-stroked-button type="button" mat-dialog-close>إلغاء</button>
        <button mat-flat-button color="primary" type="button" [disabled]="!authority" (click)="send()">إرسال</button>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .sheet {
      display: flex;
      flex-direction: column;
      padding: 1.35rem 1.4rem 1.15rem;
    }
    .sheet__title {
      margin: 0 !important;
      padding: 0 !important;
      font-size: 1.2rem !important;
      line-height: 1.4 !important;
    }
    .sheet__lesson {
      margin: 0.55rem 0 0;
      padding: 0.55rem 0.8rem;
      border-radius: 0.75rem;
      background: #f8fafc;
      color: var(--sp-text, #0f172a);
      font-size: 0.95rem;
      font-weight: 800;
      line-height: 1.5;
    }
    .sheet__label {
      margin: 1.05rem 0 0.5rem;
      color: var(--sp-primary, #312e81);
      font-size: 0.88rem;
      font-weight: 800;
    }
    .sheet__options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem;
    }
    .option {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-height: 3.4rem;
      padding: 0.7rem 0.8rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.85rem;
      background: #fff;
      color: var(--sp-text, #0f172a);
      text-align: start;
      cursor: pointer;
    }
    .option.is-on {
      border-color: var(--sp-primary-mid, #4f46e5);
      background: var(--sp-primary-bg, #eef2ff);
    }
    .option:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .option__mark {
      flex: 0 0 auto;
      width: 1.05rem;
      height: 1.05rem;
      border: 2px solid #cbd5e1;
      border-radius: 999px;
      background: #fff;
    }
    .option.is-on .option__mark {
      border-color: var(--sp-primary-mid, #4f46e5);
      box-shadow: inset 0 0 0 3px #fff, inset 0 0 0 8px var(--sp-primary-mid, #4f46e5);
    }
    .option__text {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-width: 0;
    }
    .option__text strong { font-size: 0.92rem; font-weight: 800; }
    .option__text small { color: var(--sp-muted, #64748b); font-size: 0.75rem; font-weight: 700; }
    .sheet__note {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-top: 1rem;
    }
    .sheet__note span {
      color: var(--sp-primary, #312e81);
      font-size: 0.88rem;
      font-weight: 800;
    }
    .sheet__note textarea {
      width: 100%;
      min-height: 5.5rem;
      resize: vertical;
      box-sizing: border-box;
      padding: 0.7rem 0.8rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.85rem;
      background: #fff;
      color: var(--sp-text, #0f172a);
      font: inherit;
      line-height: 1.6;
    }
    .sheet__note textarea:focus {
      outline: 2px solid var(--sp-primary-mid, #4f46e5);
      outline-offset: 1px;
    }
    .sheet__actions {
      display: flex;
      gap: 0.65rem;
      margin-top: 1.15rem;
    }
    .sheet__actions button {
      flex: 1 1 0;
      min-height: 42px;
    }
    @media (max-width: 520px) {
      .sheet__options { grid-template-columns: 1fr; }
    }
  `
})
export class PrepApprovalSubmitDialogComponent {
  readonly data = inject<PrepApprovalSubmitData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PrepApprovalSubmitDialogComponent, PrepApprovalSubmitResult | undefined>);

  authority: PrepApprovalAuthority | null = this.data.pending.includes('DEPARTMENT')
    ? (this.data.pending.includes('ADMINISTRATION') ? null : 'ADMINISTRATION')
    : 'DEPARTMENT';
  note = '';

  pending(authority: PrepApprovalAuthority): boolean {
    return this.data.pending.includes(authority);
  }

  pick(authority: PrepApprovalAuthority): void {
    if (this.pending(authority)) return;
    this.authority = authority;
  }

  send(): void {
    if (!this.authority) return;
    this.dialogRef.close({ authority: this.authority, note: this.note });
  }
}
