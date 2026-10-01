import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RecordCategory, RecordItem } from '../services/records-api.service';

export interface RecordFormResult {
  name: string;
  categoryId: number;
  description: string;
  file?: File;
}

@Component({
  selector: 'app-record-form-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ data.record ? 'تعديل السجل' : 'إضافة سجل' }}</h2>
    <mat-dialog-content class="record-form">
      <mat-form-field appearance="outline">
        <mat-label>اسم السجل</mat-label>
        <input matInput maxlength="200" [(ngModel)]="name">
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>نوع السجل</mat-label>
        <mat-select [(ngModel)]="categoryId">
          @for (category of data.categories; track category.id) {
            <mat-option [value]="category.id">{{ category.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>الوصف</mat-label>
        <textarea matInput rows="3" maxlength="1000" [(ngModel)]="description"></textarea>
      </mat-form-field>
      <label class="file">
        <span>{{ file?.name || data.record?.fileName || 'اختيار الملف' }}</span>
        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" (change)="onFile($event)">
      </label>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>إلغاء</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!valid" (click)="save()">حفظ</button>
    </mat-dialog-actions>
  `,
  styles: `
    .record-form { display: flex; flex-direction: column; gap: 0.35rem; min-width: min(440px, 80vw); padding-top: 0.4rem; }
    .record-form mat-form-field { width: 100%; }
    .file { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.75rem 0.9rem; border: 1px dashed #c5cae9; border-radius: 0.85rem; background: #f8fafc; }
    .file input { max-width: 60%; }
  `
})
export class RecordFormDialogComponent {
  readonly data = inject<{ categories: RecordCategory[]; record?: RecordItem }>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<RecordFormDialogComponent, RecordFormResult | undefined>);
  name = this.data.record?.name ?? '';
  categoryId = this.data.record?.categoryId ?? this.data.categories[0]?.id ?? null;
  description = this.data.record?.description ?? '';
  file?: File;

  get valid(): boolean {
    return this.name.trim().length > 0 && this.categoryId != null && (!!this.data.record || !!this.file);
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0];
  }

  save(): void {
    if (!this.valid || this.categoryId == null) return;
    this.dialogRef.close({ name: this.name.trim(), categoryId: this.categoryId, description: this.description.trim(), file: this.file });
  }
}
