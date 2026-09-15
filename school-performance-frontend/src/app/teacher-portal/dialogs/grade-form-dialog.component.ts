import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { StudentGrade } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-grade-form-dialog',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل درجة' : 'إضافة درجة' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex min-w-0 flex-col gap-[0.35rem] pt-2" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>اسم الطالب</mat-label>
          <input matInput formControlName="studentName" cdkFocusInitial autocomplete="off">
          <mat-error>اسم الطالب مطلوب</mat-error>
        </mat-form-field>
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>الفصل</mat-label>
            <input matInput formControlName="className" autocomplete="off">
            <mat-error>الفصل مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>المادة</mat-label>
            <input matInput formControlName="subject" autocomplete="off">
            <mat-error>المادة مطلوبة</mat-error>
          </mat-form-field>
        </div>
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>الدرجة</mat-label>
            <input matInput type="number" formControlName="score">
            <mat-error>الدرجة مطلوبة</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>الدرجة الكاملة</mat-label>
            <input matInput type="number" formControlName="maxScore">
            <mat-error>الدرجة الكاملة مطلوبة</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>الفصل الدراسي</mat-label>
          <input matInput formControlName="term" autocomplete="off">
          <mat-error>الفصل الدراسي مطلوب</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()"><app-ui-icon name="check"></app-ui-icon> حفظ</button>
    </mat-dialog-actions>
  `
})
export class GradeFormDialogComponent {
  readonly data: StudentGrade | null = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<GradeFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    studentName: ['', Validators.required],
    className: ['', Validators.required],
    subject: ['', Validators.required],
    score: [0, Validators.required],
    maxScore: [20, Validators.required],
    term: ['الفصل الثاني', Validators.required]
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
