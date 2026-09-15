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
    <div class="max-w-[460px] min-w-[340px]">
      <div class="mx-auto mt-4 flex size-14 items-center justify-center rounded-full bg-success-bg text-success">
        <app-ui-icon name="key" class="!size-[30px] !text-[30px]"></app-ui-icon>
      </div>
      <h2 mat-dialog-title class="text-center">{{ data.title || 'تم إنشاء حساب الدخول' }}</h2>
      <mat-dialog-content>
        <p class="mb-4 text-center leading-relaxed text-muted">
          بيانات الدخول الخاصة بـ <strong>{{ data.personName }}</strong>. سلّمها للمستخدم واطلب منه تغيير كلمة المرور بعد أول دخول.
        </p>
        <div class="mb-2 flex items-center gap-2 rounded-[10px] border border-border bg-[#fafbfe] px-3 py-2">
          <span class="flex-1 text-[0.85rem] text-muted">اسم المستخدم</span>
          <code class="text-base">{{ data.username }}</code>
          <button mat-icon-button type="button" matTooltip="نسخ" (click)="copy(data.username)"><app-ui-icon name="content_copy"></app-ui-icon></button>
        </div>
        <div class="mb-2 flex items-center gap-2 rounded-[10px] border border-border bg-[#fafbfe] px-3 py-2">
          <span class="flex-1 text-[0.85rem] text-muted">كلمة المرور</span>
          <code class="text-base">{{ data.password }}</code>
          <button mat-icon-button type="button" matTooltip="نسخ" (click)="copy(data.password)"><app-ui-icon name="content_copy"></app-ui-icon></button>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="gap-2">
        <button mat-stroked-button type="button" (click)="copy(data.username + ' / ' + data.password)"><app-ui-icon name="content_copy"></app-ui-icon> نسخ الكل</button>
        <button mat-flat-button color="primary" type="button" (click)="ref.close()">تم</button>
      </mat-dialog-actions>
    </div>
  `
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
