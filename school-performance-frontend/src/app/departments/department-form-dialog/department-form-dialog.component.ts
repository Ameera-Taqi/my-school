import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Department } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-department-form-dialog',
  standalone: true,
  imports: [
    UiIconComponent, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatDialogModule, MatSlideToggleModule
  ],
  template: `
    <div class="sp-dialog-head">
      <h2 mat-dialog-title>{{ data ? 'تعديل شعبة' : 'إضافة شعبة' }}</h2>
      @if (data?.name) {
        <p class="sp-dialog-subtitle">{{ data!.name }}@if (data!.code) { · <span dir="ltr">{{ data!.code }}</span> }</p>
      }
    </div>

    <mat-dialog-content class="sp-dialog-body">
      <form [formGroup]="form" class="sp-dialog-form" (ngSubmit)="save()">
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
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

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>الوصف</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>

        <div class="subjects-block">
          <div class="subjects-block__head">
            <span class="subjects-block__title">المواد التابعة</span>
            <span class="subjects-block__hint">أضف اسماً ثم اضغط Enter</span>
          </div>
          <div class="subjects-block__chips">
            @for (s of subjects; track s; let i = $index) {
              <span class="subject-chip">
                {{ s }}
                <button type="button" class="subject-chip__remove" (click)="removeSubject(i)" aria-label="حذف المادة">
                  <app-ui-icon name="close" class="size-3.5"></app-ui-icon>
                </button>
              </span>
            }
            @if (subjects.length === 0) {
              <span class="text-[0.85rem] text-muted">لا توجد مواد بعد</span>
            }
          </div>
          <div class="subjects-block__add">
            <input
              class="subjects-block__input"
              type="text"
              [(ngModel)]="subjectDraft"
              [ngModelOptions]="{standalone: true}"
              placeholder="مثال: لغة إنجليزية"
              autocomplete="off"
              (keydown.enter)="$event.preventDefault(); addSubject()">
            <button type="button" class="subjects-block__btn" (click)="addSubject()" [disabled]="!subjectDraft.trim()">
              <app-ui-icon name="add"></app-ui-icon>
              إضافة
            </button>
          </div>
        </div>

        <div class="flex items-center gap-5 pb-1 pt-1">
          <mat-slide-toggle formControlName="active">نشط</mat-slide-toggle>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="sp-dialog-actions">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <app-ui-icon name="check"></app-ui-icon> {{ data ? 'حفظ التعديلات' : 'إضافة الشعبة' }}
      </button>
    </mat-dialog-actions>
  `
})
export class DepartmentFormDialogComponent {
  readonly data: Department | null = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<DepartmentFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  subjects: string[] = [...(this.data?.subjects ?? [])];
  subjectDraft = '';

  form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    description: [''],
    active: [true]
  });

  constructor() {
    if (this.data) {
      this.form.patchValue({
        code: this.data.code ?? '',
        name: this.data.name ?? '',
        description: this.data.description ?? '',
        active: this.data.active !== false
      });
      this.form.controls.code.disable();
    }
  }

  addSubject(): void {
    const name = this.subjectDraft.trim();
    if (!name) return;
    if (this.subjects.some(s => s.toLowerCase() === name.toLowerCase())) {
      this.subjectDraft = '';
      return;
    }
    this.subjects = [...this.subjects, name];
    this.subjectDraft = '';
  }

  removeSubject(index: number): void {
    this.subjects = this.subjects.filter((_, i) => i !== index);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({
      ...this.data,
      ...this.form.getRawValue(),
      subjects: this.subjects
    });
  }
}
