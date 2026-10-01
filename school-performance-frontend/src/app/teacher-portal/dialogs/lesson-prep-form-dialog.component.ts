import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { LessonPrep } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['pdf', 'ppt', 'pptx', 'doc', 'docx'];

export interface LessonPrepStageOption {
  stageName: string;
  subject: string;
}

export interface LessonPrepDialogData {
  stageName: string;
  stages: LessonPrepStageOption[];
  /** Set when the upload belongs to a numbered course lesson. */
  lessonNumber?: number;
  lockedSubject?: string;
  /** Prefills an existing lesson so update keeps its title and file. */
  initialTitle?: string;
  initialDescription?: string;
  existingFileName?: string;
}

@Component({
  selector: 'app-lesson-prep-form-dialog',
  standalone: true,
  imports: [NgClass, UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.existingFileName ? 'تحديث التحضير' : 'رفع تحضير يومي' }}</h2>
    <mat-dialog-content class="max-h-[70vh]">
      <form [formGroup]="form" class="flex min-w-0 flex-col gap-[0.35rem] pt-2" (ngSubmit)="save()">
        @if (data.lessonNumber) {
          <p class="m-0 mb-2 text-[0.9rem] font-semibold text-primary">التحضير {{ data.lessonNumber }} — {{ data.lockedSubject }} — {{ data.stageName }}</p>
        }
        <div
          class="mb-3 flex flex-col gap-3 rounded-sp-sm border border-dashed border-[#c5cae9] bg-primary-bg p-4"
          [ngClass]="fileError ? 'border-danger bg-danger-bg' : ''">
          <input #fileInput type="file" hidden accept=".pdf,.ppt,.pptx,.doc,.docx" (change)="onFileSelected($event)">
          <button mat-stroked-button color="primary" type="button" (click)="fileInput.click()">
            <app-ui-icon name="upload_file"></app-ui-icon>
            {{ selectedFile ? 'تغيير الملف' : 'اختيار ملف التحضير' }}
          </button>
          @if (selectedFile) {
            <div class="flex items-center gap-3 rounded-sp-sm border border-border bg-surface p-3">
              <app-ui-icon name="insert_drive_file" class="text-primary"></app-ui-icon>
              <div class="min-w-0 flex-1">
                <span class="block break-all font-semibold text-text">{{ selectedFile.name }}</span>
                <small class="text-muted">{{ formatSize(selectedFile.size) }}</small>
              </div>
              <button mat-icon-button type="button" (click)="clearFile(fileInput)" aria-label="إزالة الملف">
                <app-ui-icon name="close"></app-ui-icon>
              </button>
            </div>
          } @else if (data.existingFileName) {
            <p class="m-0 text-[0.85rem] text-muted">الملف الحالي: <span dir="ltr">{{ data.existingFileName }}</span>. اختر ملفاً آخر لاستبداله.</p>
          } @else {
            <p class="m-0 text-[0.85rem] text-muted">الصيغ المدعومة: PDF, PPTX, DOCX — بحد أقصى 50 ميجابايت</p>
          }
          @if (fileError) {
            <p class="m-0 text-[0.85rem] text-danger">{{ fileError }}</p>
          }
        </div>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>عنوان التحضير</mat-label>
          <input matInput formControlName="title" cdkFocusInitial autocomplete="off">
          <mat-error>عنوان التحضير مطلوب</mat-error>
        </mat-form-field>
        @if (!data.lessonNumber) {
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>المرحلة</mat-label>
          <mat-select formControlName="stageName" (selectionChange)="onStageChange($event.value)">
            @for (stage of stageNames; track stage) {
              <mat-option [value]="stage">{{ stage }}</mat-option>
            }
          </mat-select>
          <mat-error>المرحلة مطلوبة</mat-error>
        </mat-form-field>
        }
        @if (!data.lessonNumber) {
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>المادة</mat-label>
          <mat-select formControlName="subject">
            @for (subject of subjects; track subject) {
              <mat-option [value]="subject">{{ subject }}</mat-option>
            }
          </mat-select>
          <mat-error>المادة مطلوبة</mat-error>
        </mat-form-field>
        }
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>ملاحظات التحضير</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()" [disabled]="uploading">
        @if (uploading) {
          <ng-container><app-ui-icon name="hourglass_top"></app-ui-icon> جاري الرفع...</ng-container>
        } @else {
          <ng-container><app-ui-icon name="check"></app-ui-icon> حفظ</ng-container>
        }
      </button>
    </mat-dialog-actions>
  `
})
export class LessonPrepFormDialogComponent {
  readonly data: LessonPrepDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<LessonPrepFormDialogComponent, Omit<LessonPrep, 'id' | 'teacherName'> | undefined>);
  private readonly fb = inject(FormBuilder);

  selectedFile: File | null = null;
  fileError = '';
  uploading = false;

  readonly stageNames = [...new Set(this.data.stages.map(stage => stage.stageName))];

  form = this.fb.nonNullable.group({
    title: [this.data.initialTitle ?? '', Validators.required],
    stageName: [this.initialStage(), Validators.required],
    subject: [this.data.lockedSubject || this.subjectFor(this.initialStage()), Validators.required],
    description: [this.data.initialDescription ?? '']
  });

  get subjects(): string[] {
    const forStage = this.data.stages
      .filter(stage => stage.stageName === this.form.controls.stageName.value && stage.subject)
      .map(stage => stage.subject);
    const unique = [...new Set(forStage)];
    return unique.length ? unique : [...new Set(this.data.stages.map(stage => stage.subject).filter(Boolean))];
  }

  onStageChange(stageName: string): void {
    const subject = this.subjectFor(stageName);
    if (subject) this.form.controls.subject.setValue(subject);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      this.fileError = 'نوع الملف غير مدعوم. اختر PDF أو PPTX أو DOCX.';
      this.selectedFile = null;
      input.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.fileError = 'حجم الملف يتجاوز الحد المسموح (50 ميجابايت).';
      this.selectedFile = null;
      input.value = '';
      return;
    }

    this.fileError = '';
    this.selectedFile = file;
    if (!this.form.controls.title.value.trim()) {
      this.form.controls.title.setValue(file.name.replace(/\.[^/.]+$/, '').trim());
    }
  }

  clearFile(input: HTMLInputElement): void {
    this.selectedFile = null;
    this.fileError = '';
    input.value = '';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
  }

  save(): void {
    if (this.uploading) return;
    const fileName = this.selectedFile?.name || this.data.existingFileName;
    this.fileError = fileName ? '' : 'يرجى اختيار ملف التحضير أولاً.';
    if (this.form.invalid || !fileName) {
      this.form.markAllAsTouched();
      return;
    }

    this.uploading = true;
    const value = this.form.getRawValue();
    const close = (fileData?: string) => {
      this.dialogRef.close({
        stageName: this.data.lessonNumber ? this.data.stageName : value.stageName,
        className: '',
        subject: this.data.lockedSubject || value.subject,
        lessonNumber: this.data.lessonNumber,
        title: value.title.trim(),
        lessonDate: '',
        fileName,
        ...(fileData ? { fileData } : {}),
        description: value.description.trim()
      });
    };
    const file = this.selectedFile;
    const isPdf = !!file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (file && isPdf && file.size <= 1_500_000) {
      const reader = new FileReader();
      reader.onload = () => close(String(reader.result || ''));
      reader.onerror = () => close();
      reader.readAsDataURL(file);
      return;
    }
    close();
  }

  private initialStage(): string {
    if (this.stageNames.includes(this.data.stageName)) return this.data.stageName;
    return this.stageNames[0] ?? '';
  }

  private subjectFor(stageName: string): string {
    return this.data.stages.find(stage => stage.stageName === stageName)?.subject
      ?? this.data.stages.find(stage => stage.subject)?.subject
      ?? '';
  }
}
