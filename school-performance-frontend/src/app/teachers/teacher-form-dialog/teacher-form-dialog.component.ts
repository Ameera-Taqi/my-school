import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Department, Teacher } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

export interface TeacherFormDialogData {
  teacher?: Teacher;
  departmentName?: string;
  /** Pre-check «رئيس شعبة» when creating a new teacher. */
  asHead?: boolean;
  /** When set, show a department picker (all-teachers page). */
  departments?: Department[];
  departmentId?: number;
}

@Component({
  selector: 'app-teacher-form-dialog',
  standalone: true,
  imports: [
    UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatDialogModule, MatDatepickerModule, MatSlideToggleModule, MatCheckboxModule, MatTooltipModule
  ],
  template: `
    <div class="sp-dialog-head">
      <h2 mat-dialog-title>{{ data.teacher ? 'تعديل معلم' : 'إضافة معلم' }}</h2>
      @if (!showDepartmentSelect && subtitle) {
        <p class="sp-dialog-subtitle">الشعبة: {{ subtitle }}</p>
      }
    </div>

    <mat-dialog-content class="sp-dialog-body">
      <form [formGroup]="form" class="sp-dialog-form" (ngSubmit)="save()">
        @if (showDepartmentSelect) {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>الشعبة</mat-label>
            <mat-select formControlName="departmentId">
              @for (dept of data.departments; track dept.id) {
                <mat-option [value]="dept.id">{{ dept.name }}</mat-option>
              }
            </mat-select>
            <mat-error>الشعبة مطلوبة</mat-error>
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>اسم المعلم</mat-label>
          <input matInput formControlName="fullName" cdkFocusInitial autocomplete="off">
          <mat-error>اسم المعلم مطلوب</mat-error>
        </mat-form-field>

        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
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
              <app-ui-icon name="calendar_today" matDatepickerToggleIcon></app-ui-icon>
            </mat-datepicker-toggle>
            <mat-datepicker #hirePicker></mat-datepicker>
          </mat-form-field>
          <div class="flex flex-col gap-3 pb-4 pt-1">
            <mat-slide-toggle formControlName="active">نشط</mat-slide-toggle>
            <mat-checkbox class="department-head-check" formControlName="departmentHead">رئيس شعبة</mat-checkbox>
            <mat-checkbox class="department-head-check" formControlName="wingSupervisor" matTooltip="يمنحه قائمة «مشرف الجناح» وصلاحية تسجيل حضور الطلاب">مشرف جناح</mat-checkbox>
          </div>
        </div>

        @if (!data.teacher) {
          <div class="info-banner mt-1 mb-0 text-[0.85rem]">
            <app-ui-icon name="info"></app-ui-icon>
            <span>سيُنشأ حساب دخول تلقائياً بدور <strong>{{ form.controls.departmentHead.value ? 'رئيس شعبة' : 'معلم' }}</strong>، وستظهر بيانات الدخول بعد الحفظ.</span>
          </div>
        }
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="sp-dialog-actions">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <app-ui-icon name="check"></app-ui-icon> {{ data.teacher ? 'حفظ التعديلات' : 'إضافة المعلم' }}
      </button>
    </mat-dialog-actions>
  `
})
export class TeacherFormDialogComponent {
  readonly data: TeacherFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TeacherFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly showDepartmentSelect = !this.data.teacher && (this.data.departments?.length ?? 0) > 0;

  get subtitle(): string {
    return this.data.departmentName
      || this.data.teacher?.departmentName
      || '';
  }

  form = this.fb.group({
    departmentId: [this.data.departmentId ?? null as number | null],
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
    if (this.showDepartmentSelect) {
      this.form.controls.departmentId.setValidators(Validators.required);
      this.form.controls.departmentId.updateValueAndValidity();
    }

    if (this.data.teacher) {
      const { hireDate, ...rest } = this.data.teacher;
      this.form.patchValue({
        ...rest,
        departmentId: this.data.teacher.departmentId ?? null,
        hireDate: this.parseDate(hireDate),
        departmentHead: this.data.teacher.departmentHead ?? this.data.teacher.roleKey?.startsWith('DEPARTMENT_HEAD') === true,
        wingSupervisor: this.data.teacher.wingSupervisor === true
      });
    } else if (this.data.asHead) {
      this.form.patchValue({ departmentHead: true });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload: Teacher & { departmentId?: number } = {
      id: this.data.teacher?.id,
      employeeNumber: raw.employeeNumber!.trim(),
      fullName: raw.fullName!.trim(),
      specialization: raw.specialization?.trim() || undefined,
      email: raw.email?.trim() || undefined,
      phone: raw.phone?.trim() || undefined,
      hireDate: raw.hireDate ? this.formatDate(raw.hireDate) : undefined,
      active: raw.active ?? true,
      departmentHead: raw.departmentHead === true,
      wingSupervisor: raw.wingSupervisor === true,
      departmentId: raw.departmentId ?? this.data.departmentId ?? this.data.teacher?.departmentId
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
