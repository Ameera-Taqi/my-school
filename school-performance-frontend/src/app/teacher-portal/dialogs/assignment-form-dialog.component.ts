import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { TeacherAssignment } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

export interface AssignmentDialogData {
  item?: TeacherAssignment | null;
  stageName: string;
  classes: string[];
  subjects: string[];
}

@Component({
  selector: 'app-assignment-form-dialog',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'تعديل واجب' : 'واجب جديد' }}</h2>
    <mat-dialog-content class="max-h-[70vh]">
      <form [formGroup]="form" class="flex min-w-0 flex-col gap-[0.35rem] pt-2" (ngSubmit)="save()">
        <p class="m-0 mb-2 text-[0.9rem] font-semibold text-primary">{{ data.stageName }}</p>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>العنوان</mat-label>
          <input matInput formControlName="title" cdkFocusInitial autocomplete="off">
          <mat-error>العنوان مطلوب</mat-error>
        </mat-form-field>
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>الفصل</mat-label>
            <mat-select formControlName="className">
              @for (name of data.classes; track name) {
                <mat-option [value]="name">{{ name }}</mat-option>
              }
            </mat-select>
            <mat-error>الفصل مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>المادة</mat-label>
            <mat-select formControlName="subject">
              @for (name of data.subjects; track name) {
                <mat-option [value]="name">{{ name }}</mat-option>
              }
            </mat-select>
            <mat-error>المادة مطلوبة</mat-error>
          </mat-form-field>
        </div>
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>تاريخ التسليم</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="dueDate">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error>تاريخ التسليم مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>الحالة</mat-label>
            <mat-select formControlName="status">
              <mat-option value="OPEN">مفتوح</mat-option>
              <mat-option value="CLOSED">مغلق</mat-option>
            </mat-select>
            <mat-error>الحالة مطلوبة</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>الوصف</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()"><app-ui-icon name="check"></app-ui-icon> حفظ</button>
    </mat-dialog-actions>
  `
})
export class AssignmentFormDialogComponent {
  readonly data: AssignmentDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AssignmentFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    className: [this.data.item?.className || this.data.classes[0] || '', Validators.required],
    subject: [this.data.item?.subject || this.data.subjects[0] || '', Validators.required],
    dueDate: [new Date(), Validators.required],
    status: ['OPEN' as TeacherAssignment['status'], Validators.required],
    description: ['']
  });

  constructor() {
    if (this.data.item) this.form.patchValue({ ...this.data.item, dueDate: new Date(this.data.item.dueDate) });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const dueDate = v.dueDate instanceof Date ? v.dueDate.toISOString().slice(0, 10) : String(v.dueDate);
    this.dialogRef.close({ ...this.data.item, ...v, dueDate, stageName: this.data.stageName });
  }
}
