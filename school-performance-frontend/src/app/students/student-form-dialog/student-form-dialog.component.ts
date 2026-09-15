import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Student } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

export interface StudentFormDialogData {
  student?: Student;
  stageName: string;
  className: string;
}

@Component({
  selector: 'app-student-form-dialog',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>{{ data.student ? 'تعديل طالب' : 'إضافة طالب' }}</h2>
    <mat-dialog-content class="max-h-[70vh]">
      <p class="mb-2 flex items-center gap-2 rounded-lg bg-primary-light px-[0.85rem] py-[0.6rem] text-[0.9rem] text-primary-mid">
        <app-ui-icon name="school" class="size-5 shrink-0 text-xl"></app-ui-icon>
        <span>{{ data.stageName }} — فصل <strong>{{ data.className }}</strong></span>
      </p>
      <form [formGroup]="form" class="flex min-w-0 flex-col gap-[0.35rem] pt-2" (ngSubmit)="save()">
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>الرقم المدني</mat-label>
            <input matInput formControlName="civilId" [readonly]="!!data.student" cdkFocusInitial autocomplete="off" dir="ltr">
            <app-ui-icon name="badge" matSuffix></app-ui-icon>
            <mat-error>الرقم المدني مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>اسم الطالب</mat-label>
            <input matInput formControlName="fullName" autocomplete="off">
            <mat-error>اسم الطالب مطلوب</mat-error>
          </mat-form-field>
        </div>
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>تاريخ الميلاد</mat-label>
            <input matInput [matDatepicker]="birthPicker" formControlName="birthDate" placeholder="اختر التاريخ">
            <mat-datepicker-toggle matIconSuffix [for]="birthPicker">
              <app-ui-icon name="calendar_today" matDatepickerToggleIcon></app-ui-icon>
            </mat-datepicker-toggle>
            <mat-datepicker #birthPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>الجنس</mat-label>
            <mat-select formControlName="gender">
              <mat-option value="MALE">ذكر</mat-option>
              <mat-option value="FEMALE">أنثى</mat-option>
            </mat-select>
            <mat-error>الجنس مطلوب</mat-error>
          </mat-form-field>
        </div>
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>رقم ولي الأمر</mat-label>
            <input matInput formControlName="guardianPhone" autocomplete="off" dir="ltr">
            <app-ui-icon name="phone" matSuffix></app-ui-icon>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>الحالة</mat-label>
            <mat-select formControlName="status">
              <mat-option value="ACTIVE">نشط</mat-option>
              <mat-option value="TRANSFERRED">منقول</mat-option>
              <mat-option value="SUSPENDED">موقوف</mat-option>
            </mat-select>
            <mat-error>الحالة مطلوبة</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>ملاحظات</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <app-ui-icon name="check"></app-ui-icon> {{ data.student ? 'حفظ التعديلات' : 'إضافة الطالب' }}
      </button>
    </mat-dialog-actions>
  `
})
export class StudentFormDialogComponent {
  readonly data: StudentFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<StudentFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    civilId: ['', Validators.required],
    fullName: ['', Validators.required],
    birthDate: [null as Date | null],
    gender: ['MALE', Validators.required],
    guardianPhone: [''],
    status: ['ACTIVE', Validators.required],
    notes: ['']
  });

  constructor() {
    if (this.data.student) {
      const { birthDate, ...rest } = this.data.student;
      this.form.patchValue({
        ...rest,
        birthDate: this.parseDate(birthDate)
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      ...this.data.student,
      ...raw,
      birthDate: raw.birthDate ? this.formatDate(raw.birthDate) : undefined
    });
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
