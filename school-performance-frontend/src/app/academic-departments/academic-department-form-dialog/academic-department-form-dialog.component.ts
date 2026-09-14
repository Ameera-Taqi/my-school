import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AcademicDepartment } from '../../core/models';

@Component({
  selector: 'app-academic-department-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل قسم' : 'إضافة قسم دراسي' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>اسم القسم</mat-label>
          <input matInput formControlName="name" cdkFocusInitial autocomplete="off">
          <mat-error>اسم القسم مطلوب</mat-error>
        </mat-form-field>
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>رئيس القسم</mat-label>
            <input matInput formControlName="headName" autocomplete="off">
            <mat-error>رئيس القسم مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>عدد المعلمين</mat-label>
            <input matInput type="number" formControlName="teacherCount" min="0">
            <mat-error>عدد المعلمين مطلوب</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>المواد التابعة</mat-label>
          <textarea matInput formControlName="subjects" rows="2" placeholder="مثال: رياضيات، إحصاء"></textarea>
          <mat-hint>افصل بين المواد بفاصلة</mat-hint>
          <mat-error>المواد التابعة مطلوبة</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <mat-icon>check</mat-icon> {{ data ? 'حفظ التعديلات' : 'إضافة القسم' }}
      </button>
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
export class AcademicDepartmentFormDialogComponent {
  readonly data: AcademicDepartment | null = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AcademicDepartmentFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    headName: ['', Validators.required],
    teacherCount: [0, Validators.required],
    subjects: ['', Validators.required]
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
