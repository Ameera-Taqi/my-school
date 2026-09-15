import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ResourceFile } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'mp4', 'mov', 'avi', 'mkv'];

@Component({
  selector: 'app-resource-file-form-dialog',
  standalone: true,
  imports: [NgClass, UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>رفع ملف تعليمي</h2>
    <mat-dialog-content class="max-h-[70vh]">
      <form [formGroup]="form" class="flex min-w-0 flex-col gap-[0.35rem] pt-2" (ngSubmit)="save()">
        <div
          class="mb-3 flex flex-col gap-3 rounded-sp-sm border border-dashed border-[#c5cae9] bg-primary-bg p-4"
          [ngClass]="fileError ? 'border-danger bg-danger-bg' : ''">
          <input
            #fileInput
            type="file"
            hidden
            accept=".pdf,.ppt,.pptx,.doc,.docx,.mp4,.mov,.avi,.mkv"
            (change)="onFileSelected($event)">
          <button mat-stroked-button color="primary" type="button" (click)="fileInput.click()">
            <app-ui-icon name="upload_file"></app-ui-icon>
            {{ selectedFile ? 'تغيير الملف' : 'اختيار ملف' }}
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
          } @else {
            <p class="m-0 text-[0.85rem] text-muted">الصيغ المدعومة: PDF, PPTX, DOCX, فيديو — بحد أقصى 50 ميجابايت</p>
          }
          @if (fileError) {
            <p class="m-0 flex items-center gap-[0.3rem] text-[0.85rem] text-danger">
              <app-ui-icon name="error_outline" class="size-[18px] text-lg"></app-ui-icon> {{ fileError }}
            </p>
          }
        </div>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>عنوان الملف</mat-label>
          <input matInput formControlName="title" cdkFocusInitial autocomplete="off">
          <mat-error>عنوان الملف مطلوب</mat-error>
        </mat-form-field>
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>نوع الملف</mat-label>
            <mat-select formControlName="fileType">
              <mat-option value="PDF">PDF</mat-option>
              <mat-option value="PPTX">PPTX</mat-option>
              <mat-option value="DOCX">DOCX</mat-option>
              <mat-option value="VIDEO">فيديو</mat-option>
            </mat-select>
            <mat-error>نوع الملف مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>المادة</mat-label>
            <input matInput formControlName="subject" autocomplete="off">
            <mat-error>المادة مطلوبة</mat-error>
          </mat-form-field>
        </div>
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>المرحلة</mat-label>
            <input matInput formControlName="stageName" autocomplete="off">
            <mat-error>المرحلة مطلوبة</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>المعلم</mat-label>
            <input matInput formControlName="teacherName" autocomplete="off">
            <mat-error>اسم المعلم مطلوب</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>وصف مختصر</mat-label>
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
export class ResourceFileFormDialogComponent {
  readonly data: ResourceFile | null = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ResourceFileFormDialogComponent>);
  private readonly fb = inject(FormBuilder);

  selectedFile: File | null = null;
  fileError = '';
  uploading = false;

  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    fileType: ['PDF', Validators.required],
    subject: ['', Validators.required],
    stageName: ['', Validators.required],
    teacherName: ['', Validators.required],
    description: ['']
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      this.fileError = 'نوع الملف غير مدعوم. اختر PDF أو PPTX أو DOCX أو فيديو.';
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

    const detectedType = this.detectFileType(extension);
    if (detectedType) {
      this.form.controls.fileType.setValue(detectedType);
    }

    if (!this.form.controls.title.value.trim()) {
      const title = file.name.replace(/\.[^/.]+$/, '').trim();
      this.form.controls.title.setValue(title);
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
    if (!this.selectedFile) {
      this.fileError = 'يرجى اختيار ملف أولاً.';
    }
    if (this.form.invalid || !this.selectedFile) {
      this.form.markAllAsTouched();
      return;
    }

    this.uploading = true;
    // محاكاة رفع الملف — يمكن ربطها بـ API لاحقاً
    setTimeout(() => {
      const v = this.form.getRawValue();
      this.dialogRef.close({
        ...v,
        fileName: this.selectedFile!.name,
        fileSize: this.selectedFile!.size
      } satisfies Omit<ResourceFile, 'id' | 'uploadedAt'>);
    }, 400);
  }

  private detectFileType(extension: string): ResourceFile['fileType'] | null {
    const map: Record<string, ResourceFile['fileType']> = {
      pdf: 'PDF',
      ppt: 'PPTX',
      pptx: 'PPTX',
      doc: 'DOCX',
      docx: 'DOCX',
      mp4: 'VIDEO',
      mov: 'VIDEO',
      avi: 'VIDEO',
      mkv: 'VIDEO'
    };
    return map[extension] ?? null;
  }
}
