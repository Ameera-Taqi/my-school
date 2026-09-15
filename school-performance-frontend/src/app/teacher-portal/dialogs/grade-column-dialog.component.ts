import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { GradeSheetColumn } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

export interface GradeColumnDialogData {
  column?: GradeSheetColumn;
}

@Component({
  selector: 'app-grade-column-dialog',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.column ? 'تعديل العمود' : 'إضافة عمود درجات' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>عنوان العمود</mat-label>
          <input matInput formControlName="title" cdkFocusInitial autocomplete="off" placeholder="مثال: اختبار قصير، واجب، مشروع">
          <mat-error>عنوان العمود مطلوب</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>الدرجة الكاملة</mat-label>
          <input matInput type="number" formControlName="maxScore" min="1">
          <mat-hint>الدرجة out of كم؟</mat-hint>
          @if (form.controls.maxScore.hasError('required')) { <mat-error>الدرجة الكاملة مطلوبة</mat-error> }
          @if (form.controls.maxScore.hasError('min')) { <mat-error>الدرجة الكاملة يجب أن تكون 1 على الأقل</mat-error> }
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
    .full-width { width: 100%; }
  `]
})
export class GradeColumnDialogComponent {
  readonly data: GradeColumnDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<GradeColumnDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    maxScore: [20, [Validators.required, Validators.min(1)]]
  });

  constructor() {
    if (this.data.column) {
      this.form.patchValue({
        title: this.data.column.title,
        maxScore: this.data.column.maxScore
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      id: this.data.column?.id,
      title: v.title.trim(),
      maxScore: v.maxScore
    });
  }
}
