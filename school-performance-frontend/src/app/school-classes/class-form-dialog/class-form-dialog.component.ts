import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SchoolClass } from '../../core/models';

export interface ClassFormDialogData {
  schoolClass?: SchoolClass;
  stageName: string;
}

@Component({
  selector: 'app-class-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.schoolClass ? 'تعديل فصل' : 'إضافة فصل' }}</h2>
    <mat-dialog-content>
      @if (data.stageName) {
        <p class="stage-hint">
          <mat-icon>school</mat-icon>
          <span>المرحلة: <strong>{{ data.stageName }}</strong></span>
        </p>
      }
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>اسم الفصل</mat-label>
            <input matInput formControlName="name" placeholder="10-1" cdkFocusInitial autocomplete="off">
            <mat-error>اسم الفصل مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>الطاقة الاستيعابية</mat-label>
            <input matInput type="number" formControlName="capacity" min="1">
            <mat-icon matSuffix>event_seat</mat-icon>
            @if (form.controls.capacity.hasError('required')) { <mat-error>الطاقة الاستيعابية مطلوبة</mat-error> }
            @if (form.controls.capacity.hasError('min')) { <mat-error>يجب أن تكون 1 على الأقل</mat-error> }
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>ملاحظات</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <mat-icon>check</mat-icon> {{ data.schoolClass ? 'حفظ التعديلات' : 'إضافة الفصل' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 0.35rem; padding-top: 0.5rem; min-width: 0; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 0.75rem; }
    @media (max-width: 599px) { .two-col { grid-template-columns: 1fr; } }
    .full-width { width: 100%; }
    .stage-hint {
      display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.5rem;
      padding: 0.6rem 0.85rem; border-radius: 8px;
      background: var(--sp-primary-light); color: var(--sp-primary-mid); font-size: 0.9rem;
      mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    }
    mat-dialog-content { max-height: 70vh; }
  `]
})
export class ClassFormDialogComponent {
  readonly data: ClassFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ClassFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    capacity: [30, [Validators.required, Validators.min(1)]],
    notes: ['']
  });

  constructor() {
    if (this.data.schoolClass) {
      this.form.patchValue(this.data.schoolClass);
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({ ...this.data.schoolClass, ...this.form.getRawValue() });
  }
}
