import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { SchoolTask } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-task-form-dialog',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل مهمة' : 'مهمة جديدة' }}</h2>
    <mat-dialog-content class="max-h-[70vh]">
      <form [formGroup]="form" class="flex min-w-0 flex-col gap-[0.35rem] pt-2" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>عنوان المهمة</mat-label>
          <input matInput formControlName="title" cdkFocusInitial autocomplete="off">
          <mat-error>عنوان المهمة مطلوب</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>الوصف</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>المسؤول</mat-label>
            <input matInput formControlName="assignee" autocomplete="off">
            <app-ui-icon name="person" matSuffix></app-ui-icon>
            <mat-error>المسؤول مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>تاريخ الاستحقاق</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="dueDate">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error>تاريخ الاستحقاق مطلوب</mat-error>
          </mat-form-field>
        </div>
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
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
              <mat-option value="NEW">جديدة</mat-option>
              <mat-option value="IN_PROGRESS">قيد التنفيذ</mat-option>
              <mat-option value="COMPLETED">مكتملة</mat-option>
              <mat-option value="OVERDUE">متأخرة</mat-option>
            </mat-select>
            <mat-error>الحالة مطلوبة</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>ربط باجتماع (اختياري)</mat-label>
          <input matInput formControlName="meetingTitle" placeholder="اسم الاجتماع" autocomplete="off">
          <app-ui-icon name="groups" matSuffix></app-ui-icon>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <app-ui-icon name="check"></app-ui-icon> {{ data ? 'حفظ التعديلات' : 'إضافة المهمة' }}
      </button>
    </mat-dialog-actions>
  `
})
export class TaskFormDialogComponent {
  readonly data: SchoolTask | null = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TaskFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    assignee: ['', Validators.required],
    dueDate: [new Date(), Validators.required],
    priority: ['MEDIUM' as SchoolTask['priority'], Validators.required],
    status: ['NEW' as SchoolTask['status'], Validators.required],
    meetingTitle: ['']
  });

  constructor() {
    if (this.data) this.form.patchValue({ ...this.data, dueDate: new Date(this.data.dueDate) });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const dueDate = v.dueDate instanceof Date ? v.dueDate.toISOString().slice(0, 10) : String(v.dueDate);
    this.dialogRef.close({ ...this.data, ...v, dueDate });
  }
}
