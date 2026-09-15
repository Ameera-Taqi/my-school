import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { BehaviorNote } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-behavior-form-dialog',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل ملاحظة' : 'تسجيل ملاحظة سلوكية' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>اسم الطالب</mat-label>
          <input matInput formControlName="studentName" cdkFocusInitial autocomplete="off">
          <app-ui-icon name="school" matSuffix></app-ui-icon>
          <mat-error>اسم الطالب مطلوب</mat-error>
        </mat-form-field>
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>نوع الملاحظة</mat-label>
            <mat-select formControlName="type">
              <mat-option value="POSITIVE">إيجابية</mat-option>
              <mat-option value="NEGATIVE">سلبية</mat-option>
              <mat-option value="WARNING">إنذار</mat-option>
            </mat-select>
            <mat-error>نوع الملاحظة مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>التاريخ</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="noteDate">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error>التاريخ مطلوب</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>الوصف</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
          <mat-error>الوصف مطلوب</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>المعلم / المسؤول</mat-label>
          <input matInput formControlName="recordedBy" autocomplete="off">
          <app-ui-icon name="person" matSuffix></app-ui-icon>
          <mat-error>اسم المسجل مطلوب</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <app-ui-icon name="check"></app-ui-icon> {{ data ? 'حفظ التعديلات' : 'تسجيل الملاحظة' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 0.35rem; padding-top: 0.5rem; min-width: 0; }
    .full-width { width: 100%; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 .75rem; }
    @media (max-width: 599px) { .two-col { grid-template-columns: 1fr; } }
    mat-dialog-content { max-height: 70vh; }
  `]
})
export class BehaviorFormDialogComponent {
  readonly data: BehaviorNote | null = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<BehaviorFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    studentId: [1],
    studentName: ['', Validators.required],
    type: ['POSITIVE' as BehaviorNote['type'], Validators.required],
    description: ['', Validators.required],
    noteDate: [new Date(), Validators.required],
    recordedBy: ['', Validators.required]
  });

  constructor() {
    if (this.data) {
      this.form.patchValue({ ...this.data, noteDate: new Date(this.data.noteDate) });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const noteDate = v.noteDate instanceof Date ? v.noteDate.toISOString().slice(0, 10) : String(v.noteDate);
    this.dialogRef.close({ ...this.data, ...v, noteDate });
  }
}
