import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { LessonPlan } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-lesson-plan-form-dialog',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل خطة' : 'خطة درس جديدة' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>المادة</mat-label>
            <input matInput formControlName="subject" cdkFocusInitial autocomplete="off">
            <mat-error>المادة مطلوبة</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>المعلم</mat-label>
            <input matInput formControlName="teacherName" autocomplete="off">
            <mat-error>اسم المعلم مطلوب</mat-error>
          </mat-form-field>
        </div>
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>المرحلة</mat-label>
            <input matInput formControlName="stageName" autocomplete="off">
            <mat-error>المرحلة مطلوبة</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>الفصل</mat-label>
            <input matInput formControlName="className" autocomplete="off">
            <mat-error>الفصل مطلوب</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>عنوان الخطة</mat-label>
          <input matInput formControlName="title" autocomplete="off">
          <mat-error>عنوان الخطة مطلوب</mat-error>
        </mat-form-field>
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>الأسبوع الدراسي</mat-label>
            <input matInput type="number" formControlName="weekNumber">
            <mat-error>الأسبوع الدراسي مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>الحالة</mat-label>
            <mat-select formControlName="status">
              <mat-option value="DRAFT">مسودة</mat-option>
              <mat-option value="APPROVED">معتمدة</mat-option>
              <mat-option value="NEEDS_REVISION">تحتاج تعديل</mat-option>
            </mat-select>
            <mat-error>الحالة مطلوبة</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>ملف مرفق (اختياري)</mat-label>
          <input matInput formControlName="attachmentName" placeholder="اسم الملف" autocomplete="off">
          <app-ui-icon name="attach_file" matSuffix></app-ui-icon>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()"><app-ui-icon name="check"></app-ui-icon> حفظ</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 0.35rem; padding-top: 0.5rem; min-width: 0; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 0.75rem; }
    @media (max-width: 599px) { .two-col { grid-template-columns: 1fr; } }
    .full-width { width: 100%; }
    mat-dialog-content { max-height: 70vh; }
  `]
})
export class LessonPlanFormDialogComponent {
  readonly data: LessonPlan | null = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<LessonPlanFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    subject: ['', Validators.required],
    teacherName: ['', Validators.required],
    stageName: ['', Validators.required],
    className: ['', Validators.required],
    title: ['', Validators.required],
    weekNumber: [1, Validators.required],
    attachmentName: [''],
    status: ['DRAFT' as LessonPlan['status'], Validators.required]
  });

  constructor() {
    if (this.data) this.form.patchValue(this.data);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({ ...this.data, ...this.form.getRawValue() });
  }
}
