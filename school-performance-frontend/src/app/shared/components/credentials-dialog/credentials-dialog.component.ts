import { Component, inject } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastService } from '../../services/toast.service';
import { UiIconComponent } from '../../icons/ui-icon.component';

export interface CredentialsDialogData {
  title?: string;
  personName: string;
  username: string;
  password: string;
}

/** Shows an auto-generated login once, with copy buttons. */
@Component({
  selector: 'app-credentials-dialog',
  standalone: true,
  imports: [UiIconComponent, MatDialogModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="cred">
      <div class="cred-icon"><app-ui-icon name="key"></app-ui-icon></div>
      <h2 mat-dialog-title>{{ data.title || 'تم إنشاء حساب الدخول' }}</h2>
      <mat-dialog-content>
        <p class="lead">بيانات الدخول الخاصة بـ <strong>{{ data.personName }}</strong>. سلّمها للمستخدم واطلب منه تغيير كلمة المرور بعد أول دخول.</p>
        <div class="field">
          <span class="label">اسم المستخدم</span>
          <code>{{ data.username }}</code>
          <button mat-icon-button type="button" matTooltip="نسخ" (click)="copy(data.username)"><app-ui-icon name="content_copy"></app-ui-icon></button>
        </div>
        <div class="field">
          <span class="label">كلمة المرور</span>
          <code>{{ data.password }}</code>
          <button mat-icon-button type="button" matTooltip="نسخ" (click)="copy(data.password)"><app-ui-icon name="content_copy"></app-ui-icon></button>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" (click)="copy(data.username + ' / ' + data.password)"><app-ui-icon name="content_copy"></app-ui-icon> نسخ الكل</button>
        <button mat-flat-button color="primary" type="button" (click)="ref.close()">تم</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .cred { min-width: 340px; max-width: 460px; }
    .cred-icon {
      width: 56px; height: 56px; border-radius: 50%; margin: 1rem auto 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--sp-success-bg); color: var(--sp-success);
      app-ui-icon { font-size: 30px; width: 30px; height: 30px; }
    }
    h2 { text-align: center; }
    .lead { margin: 0 0 1rem; color: var(--sp-text-muted); line-height: 1.7; text-align: center; }
    .field {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem;
      border: 1px solid var(--sp-border); border-radius: 10px; margin-bottom: 0.5rem; background: #fafbfe;
      .label { flex: 1; color: var(--sp-text-muted); font-size: 0.85rem; }
      code { font-size: 1rem; }
    }
    mat-dialog-actions { gap: 0.5rem; }
  `]
})
export class CredentialsDialogComponent {
  readonly data: CredentialsDialogData = inject(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<CredentialsDialogComponent>);
  private readonly clipboard = inject(Clipboard);
  private readonly toast = inject(ToastService);

  copy(value: string): void {
    this.clipboard.copy(value);
    this.toast.success('تم النسخ');
  }
}
