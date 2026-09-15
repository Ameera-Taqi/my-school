import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { SchoolClass } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

export interface ClassFormDialogData {
  schoolClass?: SchoolClass;
  stageName: string;
}

@Component({
  selector: 'app-class-form-dialog',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.schoolClass ? 'تعديل فصل' : 'إضافة فصل' }}</h2>
    <mat-dialog-content class="max-h-[70vh]">
      @if (data.stageName) {
        <p class="mb-2 flex items-center gap-2 rounded-sp-sm bg-primary-light px-[0.85rem] py-[0.6rem] text-[0.9rem] text-primary-mid">
          <app-ui-icon name="school" class="size-5 shrink-0 text-xl"></app-ui-icon>
          <span>المرحلة: <strong>{{ data.stageName }}</strong></span>
        </p>
      }
      <form [formGroup]="form" class="flex min-w-0 flex-col gap-[0.35rem] pt-2" (ngSubmit)="save()">
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>اسم الفصل</mat-label>
            <input matInput formControlName="name" placeholder="10-1" cdkFocusInitial autocomplete="off">
            <mat-error>اسم الفصل مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>الطاقة الاستيعابية</mat-label>
            <input matInput type="number" formControlName="capacity" min="1">
            <app-ui-icon name="event_seat" matSuffix></app-ui-icon>
            @if (form.controls.capacity.hasError('required')) { <mat-error>الطاقة الاستيعابية مطلوبة</mat-error> }
            @if (form.controls.capacity.hasError('min')) { <mat-error>يجب أن تكون 1 على الأقل</mat-error> }
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>ملاحظات</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <app-ui-icon name="check"></app-ui-icon> {{ data.schoolClass ? 'حفظ التعديلات' : 'إضافة الفصل' }}
      </button>
    </mat-dialog-actions>
  `
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
