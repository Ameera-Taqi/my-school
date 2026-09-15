import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { Permission } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-permission-form-dialog',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل صلاحية' : 'إضافة صلاحية' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>مفتاح الصلاحية (permissionKey)</mat-label>
          <input matInput formControlName="permissionKey" placeholder="students.view" [readonly]="!!data" cdkFocusInitial autocomplete="off" dir="ltr">
          <app-ui-icon name="key" matSuffix></app-ui-icon>
          <mat-error>مفتاح الصلاحية مطلوب</mat-error>
        </mat-form-field>
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>اسم الصلاحية</mat-label>
            <input matInput formControlName="permissionName" placeholder="عرض الطلاب" autocomplete="off">
            <mat-error>اسم الصلاحية مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>اسم الوحدة (moduleName)</mat-label>
            <input matInput formControlName="moduleName" placeholder="الطلاب" autocomplete="off">
            <mat-error>اسم الوحدة مطلوب</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>الوصف</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
        <mat-slide-toggle formControlName="active" class="active-toggle">نشط</mat-slide-toggle>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <app-ui-icon name="check"></app-ui-icon> {{ data ? 'حفظ التعديلات' : 'إضافة الصلاحية' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 0.35rem; padding-top: 0.5rem; min-width: 0; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 0.75rem; }
    @media (max-width: 599px) { .two-col { grid-template-columns: 1fr; } }
    .full-width { width: 100%; }
    .active-toggle { margin: 0.5rem 0 0.25rem; }
    mat-dialog-content { max-height: 70vh; }
  `]
})
export class PermissionFormDialogComponent {
  readonly data: Permission | null = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PermissionFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    permissionKey: ['', Validators.required],
    permissionName: ['', Validators.required],
    moduleName: ['', Validators.required],
    description: [''],
    active: [true]
  });

  constructor() {
    if (this.data) {
      this.form.patchValue(this.data);
      this.form.controls.permissionKey.disable();
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({ ...this.data, ...this.form.getRawValue() });
  }
}
