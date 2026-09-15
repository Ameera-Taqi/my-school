import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SubjectStudentResult } from '../../core/models';
import { GRADE_LEVEL_LABELS } from '../../shared/constants/labels';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

export interface SubjectResultDetailDialogData {
  result: SubjectStudentResult;
}

@Component({
  selector: 'app-subject-result-detail-dialog',
  standalone: true,
  imports: [UiIconComponent, MatDialogModule, MatButtonModule, MatDividerModule, MatProgressBarModule, AppDatePipe],
  template: `
    <div class="dialog-header">
      <span class="header-icon"><app-ui-icon name="school"></app-ui-icon></span>
      <div>
        <h2 mat-dialog-title>{{ data.result.studentName }}</h2>
        <p class="subtitle">{{ data.result.className }} — {{ data.result.stageName }}</p>
      </div>
      <span class="chip header-chip" [class]="'chip header-chip ' + chipClass">
        {{ gradeLabels[data.result.gradeLevel] }}
      </span>
    </div>

    <mat-dialog-content class="detail-content">
      <div class="score-card">
        <span class="score-value">{{ data.result.score }} / {{ data.result.maxScore }}</span>
        <span class="score-percent">{{ data.result.percentage }}%</span>
        <mat-progress-bar mode="determinate" [value]="data.result.percentage"></mat-progress-bar>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <app-ui-icon name="menu_book"></app-ui-icon>
          <div>
            <span class="label">المادة</span>
            <span class="value">{{ data.result.subject }}</span>
          </div>
        </div>
        <div class="info-item">
          <app-ui-icon name="person"></app-ui-icon>
          <div>
            <span class="label">المعلم</span>
            <span class="value">{{ data.result.teacherName }}</span>
          </div>
        </div>
        <div class="info-item">
          <app-ui-icon name="calendar_today"></app-ui-icon>
          <div>
            <span class="label">تاريخ الاختبار</span>
            <span class="value">{{ data.result.examDate | appDate }}</span>
          </div>
        </div>
        <div class="info-item">
          <app-ui-icon name="date_range"></app-ui-icon>
          <div>
            <span class="label">الفصل الدراسي</span>
            <span class="value">{{ data.result.term }}</span>
          </div>
        </div>
      </div>

      @if (data.result.notes) {
        <mat-divider></mat-divider>
        <section class="detail-section">
          <h3><app-ui-icon name="notes"></app-ui-icon> ملاحظات</h3>
          <p class="section-body">{{ data.result.notes }}</p>
        </section>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
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
      app-ui-icon { font-size: 26px; width: 26px; height: 26px; }
    }

    h2[mat-dialog-title] {
      margin: 0;
      padding: 0;
      font-size: 1.25rem;
      font-weight: 700;
    }

    .subtitle { margin: 0.25rem 0 0; color: var(--sp-text-muted); font-size: 0.85rem; }

    .header-chip { margin-inline-start: auto; align-self: center; }

    .detail-content { min-width: 0; }

    .score-card {
      background: linear-gradient(180deg, var(--sp-primary) 0%, var(--sp-primary-mid) 100%);
      color: #fff;
      border-radius: var(--sp-radius-sm);
      padding: 1.25rem;
      text-align: center;
      margin-bottom: 1rem;
    }

    .score-value { display: block; font-size: 2rem; font-weight: 800; }
    .score-percent { display: block; font-size: 1rem; opacity: 0.85; margin: 0.25rem 0 0.75rem; }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
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

    .info-item app-ui-icon { color: var(--sp-primary-mid); margin-top: 2px; }
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
      background: var(--sp-warning-bg);
      border-radius: var(--sp-radius-sm);
      border: 1px solid #ffe082;
      line-height: 1.7;
    }

    mat-dialog-actions { padding: 0.75rem 1.5rem 1.25rem; }
  `]
})
export class SubjectResultDetailDialogComponent {
  readonly data: SubjectResultDetailDialogData = inject(MAT_DIALOG_DATA);
  readonly gradeLabels = GRADE_LEVEL_LABELS;

  get chipClass(): string {
    switch (this.data.result.gradeLevel) {
      case 'EXCELLENT': return 'success';
      case 'VERY_GOOD':
      case 'GOOD': return 'info';
      case 'PASS': return 'warning';
      case 'FAIL': return 'danger';
      default: return 'neutral';
    }
  }
}
