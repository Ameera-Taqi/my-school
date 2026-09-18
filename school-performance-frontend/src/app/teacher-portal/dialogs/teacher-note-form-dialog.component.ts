import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { TeacherNote } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-teacher-note-form-dialog',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل ملاحظة' : 'ملاحظة جديدة' }}</h2>
    <mat-dialog-content class="max-h-[70vh]">
      <form [formGroup]="form" class="flex min-w-0 flex-col gap-[0.35rem] pt-2" (ngSubmit)="save()">
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
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
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
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
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>الملاحظة</mat-label>
          <textarea matInput formControlName="content" rows="3"></textarea>
          <mat-error>نص الملاحظة مطلوب</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()"><app-ui-icon name="check"></app-ui-icon> حفظ</button>
    </mat-dialog-actions>
  `
})
export class TeacherNoteFormDialogComponent {
  readonly data: TeacherNote | null = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TeacherNoteFormDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

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
    this.dialogRef.close({
      ...this.data,
      ...v,
      noteDate,
      teacherName: this.data?.teacherName || this.auth.fullName()
    });
  }
}
