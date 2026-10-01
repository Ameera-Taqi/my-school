import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Student } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';
import { ToastService } from '../../shared/services/toast.service';
import { compressStudentPhoto } from '../student-photo';

export interface StudentFormDialogData {
  student?: Student;
  stageName: string;
  className: string;
}

@Component({
  selector: 'app-student-form-dialog',
  standalone: true,
  imports: [
    UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatDialogModule, MatDatepickerModule, MatTooltipModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.student ? 'تعديل متعلم' : 'إضافة متعلم' }}</h2>
    <mat-dialog-content class="max-h-[70vh]">
      <p class="mb-2 flex items-center gap-2 rounded-lg bg-primary-light px-[0.85rem] py-[0.6rem] text-[0.9rem] text-primary-mid">
        <app-ui-icon name="school" class="size-5 shrink-0 text-xl"></app-ui-icon>
        <span>{{ data.stageName }} — فصل <strong>{{ data.className }}</strong></span>
      </p>

      <div class="photo-block">
        <div class="photo-preview" aria-hidden="true">
          @if (photoUrl) {
            <img [src]="photoUrl" alt="">
          } @else {
            <span>{{ initials }}</span>
          }
        </div>
        <div class="photo-actions">
          <p class="photo-title">الصورة الشخصية</p>
          <p class="photo-hint">يُفضّل صورة مربّعة واضحة للمتعلم</p>
          <div class="photo-buttons">
            <button mat-stroked-button type="button" (click)="fileInput.click()" [disabled]="photoBusy">
              <app-ui-icon name="photo_camera"></app-ui-icon>
              {{ photoUrl ? 'تغيير الصورة' : 'إضافة صورة' }}
            </button>
            @if (photoUrl) {
              <button mat-button type="button" class="text-danger!" (click)="clearPhoto()" [disabled]="photoBusy">
                إزالة
              </button>
            }
          </div>
          <input #fileInput type="file" accept="image/*" class="sr-only" (change)="onPhotoPicked($event)">
        </div>
      </div>

      <form [formGroup]="form" class="flex min-w-0 flex-col gap-[0.35rem] pt-2" (ngSubmit)="save()">
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>الرقم المدني</mat-label>
            <input matInput formControlName="civilId" [readonly]="!!data.student" cdkFocusInitial autocomplete="off" dir="ltr" maxlength="12" inputmode="numeric">
            <app-ui-icon name="badge" matSuffix></app-ui-icon>
            @if (form.controls.civilId.hasError('required')) {
              <mat-error>الرقم المدني مطلوب</mat-error>
            } @else if (form.controls.civilId.hasError('pattern')) {
              <mat-error>يجب أن يتكون الرقم المدني من 12 رقماً</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>اسم المتعلم</mat-label>
            <input matInput formControlName="fullName" autocomplete="off">
            <mat-error>اسم المتعلم مطلوب</mat-error>
          </mat-form-field>
        </div>
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>تاريخ الميلاد</mat-label>
            <input matInput [matDatepicker]="birthPicker" formControlName="birthDate" placeholder="اختر التاريخ">
            <mat-datepicker-toggle matIconSuffix [for]="birthPicker">
              <app-ui-icon name="calendar_today" matDatepickerToggleIcon></app-ui-icon>
            </mat-datepicker-toggle>
            <mat-datepicker #birthPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>الجنس</mat-label>
            <mat-select formControlName="gender">
              <mat-option value="MALE">ذكر</mat-option>
              <mat-option value="FEMALE">أنثى</mat-option>
            </mat-select>
            <mat-error>الجنس مطلوب</mat-error>
          </mat-form-field>
        </div>
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>رقم ولي الأمر</mat-label>
            <input matInput formControlName="guardianPhone" autocomplete="off" dir="ltr" maxlength="8" inputmode="numeric">
            <app-ui-icon name="phone" matSuffix></app-ui-icon>
            <mat-error>يجب أن يتكون رقم ولي الأمر من 8 أرقام</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>الحالة</mat-label>
            <mat-select formControlName="status">
              <mat-option value="ACTIVE">نشط</mat-option>
              <mat-option value="TRANSFERRED">منقول</mat-option>
              <mat-option value="SUSPENDED">موقوف</mat-option>
            </mat-select>
            <mat-error>الحالة مطلوبة</mat-error>
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
      <button mat-flat-button color="primary" type="button" (click)="save()" [disabled]="photoBusy">
        <app-ui-icon name="check"></app-ui-icon> {{ data.student ? 'حفظ التعديلات' : 'إضافة المتعلم' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .photo-block {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      margin: 0.15rem 0 0.85rem;
      padding: 0.85rem 0.95rem;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      background: #f8fafc;
    }
    .photo-preview {
      display: grid;
      place-items: center;
      width: 4.5rem;
      height: 4.5rem;
      flex-shrink: 0;
      overflow: hidden;
      border-radius: 1rem;
      background: var(--sp-primary-light, #e8eaf6);
      color: var(--sp-primary, #3949ab);
      font-size: 1.35rem;
      font-weight: 800;
    }
    .photo-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-actions { min-width: 0; flex: 1; }
    .photo-title {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 800;
      color: var(--sp-text, #0f172a);
    }
    .photo-hint {
      margin: 0.15rem 0 0.55rem;
      color: var(--sp-text-muted, #64748b);
      font-size: 0.78rem;
    }
    .photo-buttons {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
    }
  `]
})
export class StudentFormDialogComponent {
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  readonly data: StudentFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<StudentFormDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  photoUrl: string | null = this.data.student?.photoUrl ?? null;
  photoBusy = false;

  form = this.fb.group({
    civilId: ['', this.data.student ? [Validators.required] : [Validators.required, Validators.pattern(/^\d{12}$/)]],
    fullName: ['', Validators.required],
    birthDate: [null as Date | null],
    gender: ['MALE', Validators.required],
    guardianPhone: ['', this.data.student ? [] : [Validators.pattern(/^$|^\d{8}$/)]],
    status: ['ACTIVE', Validators.required],
    notes: ['']
  });

  constructor() {
    if (this.data.student) {
      const { birthDate, ...rest } = this.data.student;
      this.form.patchValue({
        ...rest,
        birthDate: this.parseDate(birthDate)
      });
    }
  }

  get initials(): string {
    const name = (this.form.controls.fullName.value || this.data.student?.fullName || '').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length > 1) return parts[0].charAt(0) + parts[1].charAt(0);
    return parts[0]?.charAt(0) || '؟';
  }

  async onPhotoPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.photoBusy = true;
    try {
      this.photoUrl = await compressStudentPhoto(file);
    } catch (error) {
      this.toast.error(error instanceof Error ? error.message : 'تعذر رفع الصورة');
    } finally {
      this.photoBusy = false;
    }
  }

  clearPhoto(): void {
    this.photoUrl = null;
  }

  save(): void {
    if (this.photoBusy) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      ...this.data.student,
      ...raw,
      birthDate: raw.birthDate ? this.formatDate(raw.birthDate) : undefined,
      photoUrl: this.photoUrl
    });
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
