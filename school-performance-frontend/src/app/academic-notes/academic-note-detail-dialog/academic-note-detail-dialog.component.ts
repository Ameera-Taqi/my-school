import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AcademicNote } from '../../core/models';
import {
  ACADEMIC_NOTE_CATEGORY_LABELS,
  ACADEMIC_NOTE_STATUS_LABELS,
  PRIORITY_LABELS
} from '../../shared/constants/labels';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

export interface AcademicNoteDetailDialogData {
  note: AcademicNote;
  canReview?: boolean;
}

@Component({
  selector: 'app-academic-note-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule, AppDatePipe],
  template: `
    <div class="dialog-header">
      <span class="header-icon"><mat-icon>note_alt</mat-icon></span>
      <div>
        <h2 mat-dialog-title>ملاحظة أكاديمية — {{ data.note.studentName }}</h2>
        <p class="subtitle">{{ data.note.className }} — {{ data.note.stageName }}</p>
      </div>
      <span class="chip header-chip" [class]="'chip header-chip ' + statusChip">
        {{ statusLabels[data.note.status] }}
      </span>
    </div>

    <mat-dialog-content class="detail-content">
      <div class="info-grid">
        <div class="info-item">
          <mat-icon>menu_book</mat-icon>
          <div>
            <span class="label">المادة</span>
            <span class="value">{{ data.note.subject }}</span>
          </div>
        </div>
        <div class="info-item">
          <mat-icon>person</mat-icon>
          <div>
            <span class="label">المعلم</span>
            <span class="value">{{ data.note.teacherName }}</span>
          </div>
        </div>
        <div class="info-item">
          <mat-icon>category</mat-icon>
          <div>
            <span class="label">التصنيف</span>
            <span class="value">{{ categoryLabels[data.note.category] }}</span>
          </div>
        </div>
        <div class="info-item">
          <mat-icon>flag</mat-icon>
          <div>
            <span class="label">الأولوية</span>
            <span class="value"><span class="chip" [class]="'chip ' + priorityChip">{{ priorityLabels[data.note.priority] }}</span></span>
          </div>
        </div>
        <div class="info-item">
          <mat-icon>event</mat-icon>
          <div>
            <span class="label">التاريخ</span>
            <span class="value">{{ data.note.noteDate | appDate }}</span>
          </div>
        </div>
      </div>

      <mat-divider></mat-divider>

      <section class="detail-section">
        <h3><mat-icon>description</mat-icon> نص الملاحظة</h3>
        <p class="section-body">{{ data.note.content }}</p>
      </section>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      @if (data.canReview && data.note.status === 'OPEN') {
        <button mat-stroked-button color="primary" (click)="markReviewed()">
          <mat-icon>task_alt</mat-icon>
          تمت المراجعة
        </button>
      }
      <button mat-flat-button color="primary" mat-dialog-close>إغلاق</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem 1.5rem 0;
      flex-wrap: wrap;
    }

    .header-icon {
      width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--sp-primary-light); color: var(--sp-primary);
      mat-icon { font-size: 26px; width: 26px; height: 26px; }
    }

    h2[mat-dialog-title] {
      margin: 0;
      padding: 0;
      font-size: 1.15rem;
      font-weight: 700;
    }

    .subtitle { margin: 0.25rem 0 0; color: var(--sp-text-muted); font-size: 0.85rem; }

    .header-chip { margin-inline-start: auto; align-self: center; }

    .detail-content { min-width: 0; }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    @media (max-width: 599px) { .info-grid { grid-template-columns: 1fr; } }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--sp-primary-bg);
      border-radius: var(--sp-radius-sm);
    }

    .info-item mat-icon { color: var(--sp-primary-mid); margin-top: 2px; }
    .label { display: block; font-size: 0.75rem; color: var(--sp-text-muted); }
    .value { display: block; color: var(--sp-text); }

    .detail-section h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 1rem 0 0.5rem;
      font-size: 0.95rem;
      color: var(--sp-primary);
    }

    .section-body {
      margin: 0;
      padding: 0.75rem 1rem;
      background: #fafafa;
      border-radius: var(--sp-radius-sm);
      border: 1px solid var(--sp-border);
      line-height: 1.7;
      white-space: pre-wrap;
    }

    mat-dialog-actions { padding: 0.75rem 1.5rem 1.25rem; gap: 0.5rem; }
  `]
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
