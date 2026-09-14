import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { SchoolTask } from '../../core/models';

@Component({
  selector: 'app-task-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatDialogModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل مهمة' : 'مهمة جديدة' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>عنوان المهمة</mat-label>
          <input matInput formControlName="title" cdkFocusInitial autocomplete="off">
          <mat-error>عنوان المهمة مطلوب</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>الوصف</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>المسؤول</mat-label>
            <input matInput formControlName="assignee" autocomplete="off">
            <mat-icon matSuffix>person</mat-icon>
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
              <mat-option value="NEW">جديدة</mat-option>
              <mat-option value="IN_PROGRESS">قيد التنفيذ</mat-option>
              <mat-option value="COMPLETED">مكتملة</mat-option>
              <mat-option value="OVERDUE">متأخرة</mat-option>
            </mat-select>
            <mat-error>الحالة مطلوبة</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>ربط باجتماع (اختياري)</mat-label>
          <input matInput formControlName="meetingTitle" placeholder="اسم الاجتماع" autocomplete="off">
          <mat-icon matSuffix>groups</mat-icon>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <mat-icon>check</mat-icon> {{ data ? 'حفظ التعديلات' : 'إضافة المهمة' }}
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
