import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { AcademicNote } from '../../core/models';
import {
  ACADEMIC_NOTE_CATEGORY_LABELS,
  ACADEMIC_NOTE_STATUS_LABELS,
  PRIORITY_LABELS
} from '../../shared/constants/labels';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

export interface AcademicNoteDetailDialogData {
  note: AcademicNote;
  canReview?: boolean;
}

@Component({
  selector: 'app-academic-note-detail-dialog',
  standalone: true,
  imports: [UiIconComponent, MatDialogModule, MatButtonModule, MatDividerModule, AppDatePipe],
  template: `
    <div class="flex flex-wrap items-start gap-4 px-6 pt-5">
      <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
        <app-ui-icon name="note_alt" class="size-[26px] text-[26px]"></app-ui-icon>
      </span>
      <div>
        <h2 mat-dialog-title class="!m-0 !p-0 text-[1.15rem] font-bold">ملاحظة أكاديمية — {{ data.note.studentName }}</h2>
        <p class="mt-1 mb-0 text-[0.85rem] text-muted">{{ data.note.className }} — {{ data.note.stageName }}</p>
      </div>
      <span class="chip ms-auto self-center" [class]="'chip ms-auto self-center ' + statusChip">
        {{ statusLabels[data.note.status] }}
      </span>
    </div>

    <mat-dialog-content class="min-w-0">
      <div class="mb-4 grid grid-cols-2 gap-3 max-[599px]:grid-cols-1">
        <div class="flex items-start gap-3 rounded-sp-sm bg-primary-bg p-3">
          <app-ui-icon name="menu_book" class="mt-0.5 text-primary-mid"></app-ui-icon>
          <div>
            <span class="block text-xs text-muted">المادة</span>
            <span class="block text-text">{{ data.note.subject }}</span>
          </div>
        </div>
        <div class="flex items-start gap-3 rounded-sp-sm bg-primary-bg p-3">
          <app-ui-icon name="person" class="mt-0.5 text-primary-mid"></app-ui-icon>
          <div>
            <span class="block text-xs text-muted">المعلم</span>
            <span class="block text-text">{{ data.note.teacherName }}</span>
          </div>
        </div>
        <div class="flex items-start gap-3 rounded-sp-sm bg-primary-bg p-3">
          <app-ui-icon name="category" class="mt-0.5 text-primary-mid"></app-ui-icon>
          <div>
            <span class="block text-xs text-muted">التصنيف</span>
            <span class="block text-text">{{ categoryLabels[data.note.category] }}</span>
          </div>
        </div>
        <div class="flex items-start gap-3 rounded-sp-sm bg-primary-bg p-3">
          <app-ui-icon name="flag" class="mt-0.5 text-primary-mid"></app-ui-icon>
          <div>
            <span class="block text-xs text-muted">الأولوية</span>
            <span class="block text-text"><span class="chip" [class]="'chip ' + priorityChip">{{ priorityLabels[data.note.priority] }}</span></span>
          </div>
        </div>
        <div class="flex items-start gap-3 rounded-sp-sm bg-primary-bg p-3">
          <app-ui-icon name="event" class="mt-0.5 text-primary-mid"></app-ui-icon>
          <div>
            <span class="block text-xs text-muted">التاريخ</span>
            <span class="block text-text">{{ data.note.noteDate | appDate }}</span>
          </div>
        </div>
      </div>

      <mat-divider></mat-divider>

      <section>
        <h3 class="mt-4 mb-2 flex items-center gap-2 text-[0.95rem] text-primary">
          <app-ui-icon name="description"></app-ui-icon> نص الملاحظة
        </h3>
        <p class="m-0 rounded-sp-sm border border-border bg-[#fafafa] px-4 py-3 leading-7 whitespace-pre-wrap">{{ data.note.content }}</p>
      </section>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="gap-2 px-6 pt-3 pb-5">
      @if (data.canReview && data.note.status === 'OPEN') {
        <button mat-stroked-button color="primary" (click)="markReviewed()">
          <app-ui-icon name="task_alt"></app-ui-icon>
          تمت المراجعة
        </button>
      }
      <button mat-flat-button color="primary" mat-dialog-close>إغلاق</button>
    </mat-dialog-actions>
  `
})
export class AcademicNoteDetailDialogComponent {
  readonly data: AcademicNoteDetailDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AcademicNoteDetailDialogComponent>);

  readonly categoryLabels = ACADEMIC_NOTE_CATEGORY_LABELS;
  readonly statusLabels = ACADEMIC_NOTE_STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;

  get statusChip(): string {
    switch (this.data.note.status) {
      case 'OPEN': return 'warning';
      case 'REVIEWED': return 'info';
      case 'RESOLVED': return 'success';
      default: return 'neutral';
    }
  }

  get priorityChip(): string {
    switch (this.data.note.priority) {
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'neutral';
    }
  }

  markReviewed(): void {
    this.dialogRef.close({ action: 'reviewed', note: this.data.note });
  }
}
