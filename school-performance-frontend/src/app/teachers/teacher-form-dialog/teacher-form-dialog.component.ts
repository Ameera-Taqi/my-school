import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Teacher } from '../../core/models';

export interface TeacherFormDialogData {
  teacher?: Teacher;
  departmentName: string;
}

@Component({
  selector: 'app-teacher-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatDialogModule, MatDatepickerModule, MatIconModule, MatSlideToggleModule,
    MatCheckboxModule, MatTooltipModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.teacher ? 'تعديل معلم' : 'إضافة معلم' }}</h2>
    <mat-dialog-content>
      <p class="context-hint">الشعبة: <strong>{{ data.departmentName }}</strong></p>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>اسم المعلم</mat-label>
          <input matInput formControlName="fullName" cdkFocusInitial autocomplete="off">
          <mat-error>اسم المعلم مطلوب</mat-error>
        </mat-form-field>
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>رقم الموظف</mat-label>
            <input matInput formControlName="employeeNumber" [readonly]="!!data.teacher" dir="ltr" autocomplete="off">
            <mat-error>رقم الموظف مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>التخصص</mat-label>
            <input matInput formControlName="specialization" autocomplete="off">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>البريد الإلكتروني</mat-label>
            <input matInput type="email" formControlName="email" dir="ltr" autocomplete="off">
            <mat-error>صيغة البريد غير صحيحة</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>رقم الجوال</mat-label>
            <input matInput formControlName="phone" dir="ltr" autocomplete="off">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>تاريخ التعيين</mat-label>
            <input matInput [matDatepicker]="hirePicker" formControlName="hireDate" placeholder="اختر التاريخ">
            <mat-datepicker-toggle matIconSuffix [for]="hirePicker">
              <mat-icon matDatepickerToggleIcon>calendar_today</mat-icon>
            </mat-datepicker-toggle>
            <mat-datepicker #hirePicker></mat-datepicker>
          </mat-form-field>
          <div class="toggle-row">
            <mat-slide-toggle formControlName="active">نشط</mat-slide-toggle>
            <mat-checkbox class="department-head-check" formControlName="departmentHead">رئيس شعبة</mat-checkbox>
            <mat-checkbox class="department-head-check" formControlName="wingSupervisor" matTooltip="يمنحه قائمة «مشرف الجناح» وصلاحية تسجيل حضور الطلاب">مشرف جناح</mat-checkbox>
          </div>
        </div>
        @if (!data.teacher) {
          <div class="info-banner compact">
            <mat-icon>info</mat-icon>
            <span>سيُنشأ حساب دخول تلقائياً بدور <strong>{{ form.controls.departmentHead.value ? 'رئيس شعبة' : 'معلم' }}</strong>، وستظهر بيانات الدخول بعد الحفظ.</span>
          </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <mat-icon>check</mat-icon> {{ data.teacher ? 'حفظ التعديلات' : 'إضافة المعلم' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; direction: rtl; gap: 0.25rem; padding-top: 0.5rem; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 0.75rem; }
    @media (max-width: 599px) { .two-col { grid-template-columns: 1fr; } }
    .full-width { width: 100%; }
    .context-hint { margin: 0 0 0.5rem; color: var(--sp-text-muted); font-size: 0.9rem; }
    .toggle-row { display: flex; align-items: center; gap: 1.25rem; padding-bottom: 1rem; flex-wrap: wrap; }
    .info-banner.compact { margin: 0.25rem 0 0; font-size: 0.85rem; }
    mat-dialog-content { max-height: 70vh; }
  `]
})
export class TeacherFormDialogComponent {
  readonly data: TeacherFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TeacherFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    employeeNumber: ['', Validators.required],
    fullName: ['', Validators.required],
    specialization: [''],
    email: ['', Validators.email],
    phone: [''],
    hireDate: [null as Date | null],
    active: [true],
    departmentHead: [false],
    wingSupervisor: [false]
  });

  constructor() {
    if (this.data.teacher) {
      const { hireDate, ...rest } = this.data.teacher;
      this.form.patchValue({
        ...rest,
        hireDate: this.parseDate(hireDate),
        departmentHead: this.data.teacher.departmentHead ?? this.data.teacher.roleKey?.startsWith('DEPARTMENT_HEAD') === true,
        wingSupervisor: this.data.teacher.wingSupervisor === true
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload: Teacher = {
      id: this.data.teacher?.id,
      employeeNumber: raw.employeeNumber!.trim(),
      fullName: raw.fullName!.trim(),
      specialization: raw.specialization?.trim() || undefined,
      email: raw.email?.trim() || undefined,
      phone: raw.phone?.trim() || undefined,
      hireDate: raw.hireDate ? this.formatDate(raw.hireDate) : undefined,
      active: raw.active ?? true,
      departmentHead: raw.departmentHead === true,
      wingSupervisor: raw.wingSupervisor === true
    };
    this.dialogRef.close(payload);
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
