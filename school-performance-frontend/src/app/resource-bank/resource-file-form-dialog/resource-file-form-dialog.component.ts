import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ResourceFile } from '../../core/models';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'mp4', 'mov', 'avi', 'mkv'];

@Component({
  selector: 'app-resource-file-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>رفع ملف تعليمي</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <div class="upload-section" [class.has-error]="fileError">
          <input
            #fileInput
            type="file"
            hidden
            accept=".pdf,.ppt,.pptx,.doc,.docx,.mp4,.mov,.avi,.mkv"
            (change)="onFileSelected($event)">
          <button mat-stroked-button color="primary" type="button" (click)="fileInput.click()">
            <mat-icon>upload_file</mat-icon>
            {{ selectedFile ? 'تغيير الملف' : 'اختيار ملف' }}
          </button>
          @if (selectedFile) {
            <div class="selected-file">
              <mat-icon>insert_drive_file</mat-icon>
              <div>
                <span class="file-name">{{ selectedFile.name }}</span>
                <small>{{ formatSize(selectedFile.size) }}</small>
              </div>
              <button mat-icon-button type="button" (click)="clearFile(fileInput)" aria-label="إزالة الملف">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          } @else {
            <p class="upload-hint-text">الصيغ المدعومة: PDF, PPTX, DOCX, فيديو — بحد أقصى 50 ميجابايت</p>
          }
          @if (fileError) {
            <p class="file-error"><mat-icon>error_outline</mat-icon> {{ fileError }}</p>
          }
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>عنوان الملف</mat-label>
          <input matInput formControlName="title" cdkFocusInitial autocomplete="off">
          <mat-error>عنوان الملف مطلوب</mat-error>
        </mat-form-field>
        <div class="two-col">
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
        <div class="two-col">
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
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>وصف مختصر</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()" [disabled]="uploading">
        @if (uploading) {
          <ng-container><mat-icon>hourglass_top</mat-icon> جاري الرفع...</ng-container>
        } @else {
          <ng-container><mat-icon>check</mat-icon> حفظ</ng-container>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 0.35rem; padding-top: 0.5rem; min-width: 0; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 0.75rem; }
    @media (max-width: 599px) { .two-col { grid-template-columns: 1fr; } }
    .full-width { width: 100%; }
    mat-dialog-content { max-height: 70vh; }
    .upload-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      padding: 1rem;
      background: var(--sp-primary-bg);
      border-radius: var(--sp-radius-sm);
      border: 1px dashed #c5cae9;
    }
    .upload-section.has-error { border-color: var(--sp-danger); background: var(--sp-danger-bg); }
    .selected-file {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--sp-surface);
      border-radius: var(--sp-radius-sm);
      border: 1px solid var(--sp-border);
    }
    .selected-file > mat-icon { color: var(--sp-primary); }
    .selected-file > div { flex: 1; min-width: 0; }
    .file-name { display: block; font-weight: 600; color: var(--sp-text); word-break: break-all; }
    .selected-file small { color: var(--sp-text-muted); }
    .upload-hint-text { margin: 0; color: var(--sp-text-muted); font-size: 0.85rem; }
    .file-error {
      margin: 0; color: var(--sp-danger); font-size: 0.85rem;
      display: flex; align-items: center; gap: 0.3rem;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
  `]
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
