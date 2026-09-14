import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { TeacherNote } from '../../core/models';

@Component({
  selector: 'app-teacher-note-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatDialogModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل ملاحظة' : 'ملاحظة جديدة' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>اسم الطالب</mat-label>
            <input matInput formControlName="studentName" cdkFocusInitial autocomplete="off">
            <mat-error>اسم الطالب مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>الفصل</mat-label>
            <input matInput formControlName="className" autocomplete="off">
            <mat-error>الفصل مطلوب</mat-error>
          </mat-form-field>
        </div>
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>نوع الملاحظة</mat-label>
            <mat-select formControlName="noteType">
              <mat-option value="ACADEMIC">أكاديمية</mat-option>
              <mat-option value="BEHAVIOR">سلوكية</mat-option>
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
          <mat-label>الملاحظة</mat-label>
          <textarea matInput formControlName="content" rows="3"></textarea>
          <mat-error>نص الملاحظة مطلوب</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()"><mat-icon>check</mat-icon> حفظ</button>
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
export class TeacherNoteFormDialogComponent {
  readonly data: TeacherNote | null = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TeacherNoteFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    studentName: ['', Validators.required],
    className: ['', Validators.required],
    noteType: ['ACADEMIC' as TeacherNote['noteType'], Validators.required],
    noteDate: [new Date(), Validators.required],
    content: ['', Validators.required]
  });

  constructor() {
    if (this.data) this.form.patchValue({ ...this.data, noteDate: new Date(this.data.noteDate) });
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
