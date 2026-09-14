import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { InternalRequest } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-internal-request-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatDialogModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل طلب' : 'طلب داخلي جديد' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>نوع الطلب</mat-label>
          <mat-select formControlName="requestType" cdkFocusInitial>
            <mat-option value="MAINTENANCE">طلب صيانة</mat-option>
            <mat-option value="DEVICES">طلب أجهزة</mat-option>
            <mat-option value="SUPPLIES">طلب مستلزمات</mat-option>
            <mat-option value="TEACHER_LEAVE">طلب إجازة معلم</mat-option>
            <mat-option value="SCHOOL_ACTIVITY">طلب نشاط مدرسي</mat-option>
            <mat-option value="OTHER">أخرى</mat-option>
          </mat-select>
          <mat-error>نوع الطلب مطلوب</mat-error>
        </mat-form-field>

        @if (isOtherType) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>حدد نوع الطلب</mat-label>
            <input matInput formControlName="customRequestType" placeholder="مثال: طلب زيارة ميدانية" autocomplete="off">
            @if (form.controls.customRequestType.hasError('required')) { <mat-error>يرجى إدخال نوع الطلب</mat-error> }
            @if (form.controls.customRequestType.hasError('minlength')) { <mat-error>حرفان على الأقل</mat-error> }
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>مقدم الطلب</mat-label>
          <input matInput formControlName="requesterName" readonly>
          <mat-icon matSuffix>person</mat-icon>
          <mat-hint>يُسجَّل تلقائياً باسم المستخدم الحالي</mat-hint>
          <mat-error>مقدم الطلب مطلوب</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>الوصف</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
          <mat-error>الوصف مطلوب</mat-error>
        </mat-form-field>
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>الأولوية</mat-label>
            <mat-select formControlName="priority">
              <mat-option value="LOW">منخفضة</mat-option>
              <mat-option value="MEDIUM">متوسطة</mat-option>
              <mat-option value="HIGH">عالية</mat-option>
            </mat-select>
            <mat-error>الأولوية مطلوبة</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>الحالة</mat-label>
            <mat-select formControlName="status">
              <mat-option value="NEW">جديد</mat-option>
              <mat-option value="IN_REVIEW">قيد المراجعة</mat-option>
              <mat-option value="APPROVED">معتمد</mat-option>
              <mat-option value="REJECTED">مرفوض</mat-option>
              <mat-option value="COMPLETED">مكتمل</mat-option>
            </mat-select>
            <mat-error>الحالة مطلوبة</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>التاريخ</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="requestDate">
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
          <mat-error>التاريخ مطلوب</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <mat-icon>check</mat-icon> {{ data ? 'حفظ التعديلات' : 'إرسال الطلب' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 0.35rem; padding-top: 0.5rem; min-width: 0; direction: rtl; }
    .full-width { width: 100%; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 .75rem; }
    @media (max-width: 599px) { .two-col { grid-template-columns: 1fr; } }
    mat-dialog-content { max-height: 70vh; }
  `]
})
export class InternalRequestFormDialogComponent {
  readonly data: InternalRequest | null = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<InternalRequestFormDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  form = this.fb.nonNullable.group({
    requestType: ['MAINTENANCE' as InternalRequest['requestType'], Validators.required],
    customRequestType: [''],
    requesterName: ['', Validators.required],
    description: ['', Validators.required],
    priority: ['MEDIUM' as InternalRequest['priority'], Validators.required],
    status: ['NEW' as InternalRequest['status'], Validators.required],
    requestDate: [new Date(), Validators.required]
  });

  constructor() {
    this.form.controls.requestType.valueChanges.subscribe(type => this.updateCustomTypeValidation(type));

    if (this.data) {
      this.form.patchValue({
        ...this.data,
        customRequestType: this.data.customRequestType ?? '',
        requestDate: new Date(this.data.requestDate)
      });
      this.updateCustomTypeValidation(this.data.requestType);
    } else {
      this.form.patchValue({ requesterName: this.authService.fullName() });
    }
  }

  get isOtherType(): boolean {
    return this.form.controls.requestType.value === 'OTHER';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const requestDate = v.requestDate instanceof Date ? v.requestDate.toISOString().slice(0, 10) : String(v.requestDate);
    this.dialogRef.close({
      ...this.data,
      requestType: v.requestType,
      customRequestType: v.requestType === 'OTHER' ? v.customRequestType.trim() : undefined,
      requesterName: this.data?.requesterName ?? this.authService.fullName(),
      description: v.description,
      priority: v.priority,
      status: v.status,
      requestDate
    } as InternalRequest);
  }

  private updateCustomTypeValidation(type: InternalRequest['requestType']): void {
    const custom = this.form.controls.customRequestType;
    if (type === 'OTHER') {
      custom.setValidators([Validators.required, Validators.minLength(2)]);
    } else {
      custom.clearValidators();
      custom.setValue('');
    }
    custom.updateValueAndValidity();
  }
}
