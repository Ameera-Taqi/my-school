import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Department } from '../../core/models';

@Component({
  selector: 'app-department-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل شعبة' : 'إضافة شعبة' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>رمز الشعبة</mat-label>
            <input matInput formControlName="code" placeholder="MATH" [readonly]="!!data" cdkFocusInitial autocomplete="off" dir="ltr">
            <mat-error>رمز الشعبة مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>اسم الشعبة</mat-label>
            <input matInput formControlName="name" placeholder="شعبة الرياضيات" autocomplete="off">
            <mat-error>اسم الشعبة مطلوب</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>الوصف</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <mat-icon>check</mat-icon> {{ data ? 'حفظ التعديلات' : 'إضافة الشعبة' }}
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
export class DepartmentFormDialogComponent {
  readonly data: Department | null = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<DepartmentFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    description: ['']
  });

  constructor() {
    if (this.data) {
      this.form.patchValue(this.data);
      this.form.controls.code.disable();
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({ ...this.data, ...this.form.getRawValue(), active: true });
  }
}
