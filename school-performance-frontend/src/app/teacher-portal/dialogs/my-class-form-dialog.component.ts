import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TeacherMyClass } from '../../core/models';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';

@Component({
  selector: 'app-my-class-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل فصل' : 'إضافة فصل' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>اسم الفصل</mat-label>
          <input matInput formControlName="name" cdkFocusInitial autocomplete="off" placeholder="مثال: 10-أ">
          <mat-error>اسم الفصل مطلوب</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>المرحلة</mat-label>
          <mat-select formControlName="stageName">
            @for (stage of stageOptions; track stage) {
              <mat-option [value]="stage">{{ stage }}</mat-option>
            }
          </mat-select>
          <mat-error>المرحلة مطلوبة</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>عدد الطلاب</mat-label>
          <input matInput type="number" formControlName="studentCount" min="0">
          @if (form.controls.studentCount.hasError('required')) { <mat-error>عدد الطلاب مطلوب</mat-error> }
          @if (form.controls.studentCount.hasError('min')) { <mat-error>عدد الطلاب لا يمكن أن يكون سالباً</mat-error> }
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
    .full-width { width: 100%; }
  `]
})
export class MyClassFormDialogComponent implements OnInit {
  readonly data: TeacherMyClass | null = inject(MAT_DIALOG_DATA);
  stageOptions: string[] = [];
  private readonly dialogRef = inject(MatDialogRef<MyClassFormDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly lookup = inject(AcademicLookupService);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    stageName: ['', Validators.required],
    studentCount: [0, [Validators.required, Validators.min(0)]]
  });

  ngOnInit(): void {
    this.lookup.getStageNames().subscribe(names => {
      this.stageOptions = names.length ? names : ['العاشر', 'الحادي عشر', 'الثاني عشر'];
    });
    if (this.data) {
      this.form.patchValue({
        name: this.data.name,
        stageName: this.data.stageName,
        studentCount: this.data.studentCount
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      ...this.data,
      name: raw.name.trim(),
      stageName: raw.stageName,
      studentCount: raw.studentCount
    } as TeacherMyClass);
  }
}
