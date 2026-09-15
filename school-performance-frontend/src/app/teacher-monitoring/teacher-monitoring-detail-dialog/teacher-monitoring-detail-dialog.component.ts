import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TeacherMonitoringRecord } from '../../core/models';
import { TEACHER_MONITORING_STATUS_LABELS } from '../../shared/constants/labels';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

export interface TeacherMonitoringDetailDialogData {
  record: TeacherMonitoringRecord;
}

@Component({
  selector: 'app-teacher-monitoring-detail-dialog',
  standalone: true,
  imports: [UiIconComponent, MatDialogModule, MatButtonModule, MatDividerModule, MatProgressBarModule, AppDatePipe],
  template: `
    <div class="dialog-header">
      <span class="header-icon"><app-ui-icon name="person"></app-ui-icon></span>
      <div>
        <h2 mat-dialog-title>{{ data.record.teacherName }}</h2>
        <p class="subtitle">{{ data.record.departmentName }} — {{ data.record.subject }}</p>
      </div>
      <span class="chip header-chip" [class]="'chip header-chip ' + chipClass">
        {{ statusLabels[data.record.status] }}
      </span>
    </div>

    <mat-dialog-content class="detail-content">
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-label">نسبة الحضور</span>
          <span class="metric-value">{{ data.record.attendanceRate }}%</span>
          <mat-progress-bar mode="determinate" [value]="data.record.attendanceRate"></mat-progress-bar>
        </div>
        <div class="metric-card">
          <span class="metric-label">إنجاز خطط الدروس</span>
          <span class="metric-value">{{ data.record.lessonPlanRate }}%</span>
          <mat-progress-bar mode="determinate" [value]="data.record.lessonPlanRate"></mat-progress-bar>
        </div>
        <div class="metric-card">
          <span class="metric-label">تقييم الأداء</span>
          <span class="metric-value">{{ data.record.evaluationScore }} / 5</span>
          <mat-progress-bar mode="determinate" [value]="evaluationPercent"></mat-progress-bar>
        </div>
      </div>

      <div class="info-row">
        <app-ui-icon name="class"></app-ui-icon>
        <span>عدد الفصول: {{ data.record.classesCount }}</span>
      </div>
      <div class="info-row">
        <app-ui-icon name="event"></app-ui-icon>
        <span>آخر زيارة متابعة: {{ data.record.lastVisitDate | appDate }}</span>
      </div>

      <mat-divider></mat-divider>

      <section class="detail-section">
        <h3><app-ui-icon name="thumb_up"></app-ui-icon> نقاط القوة</h3>
        <p class="section-body positive">{{ data.record.strengths || '—' }}</p>
      </section>

      <section class="detail-section">
        <h3><app-ui-icon name="trending_up"></app-ui-icon> مجالات التحسين</h3>
        <p class="section-body warning">{{ data.record.improvements || '—' }}</p>
      </section>

      <section class="detail-section">
        <h3><app-ui-icon name="notes"></app-ui-icon> ملاحظات المتابعة</h3>
        <p class="section-body">{{ data.record.notes || '—' }}</p>
      </section>
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

    .subtitle {
      margin: 0.25rem 0 0;
      color: var(--sp-text-muted);
      font-size: 0.85rem;
    }

    .header-chip { margin-inline-start: auto; align-self: center; }

    .detail-content { min-width: 0; }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .metric-card {
      background: var(--sp-primary-bg);
      border-radius: var(--sp-radius-sm);
      padding: 0.75rem 1rem;
    }

    .metric-label {
      display: block;
      font-size: 0.75rem;
      color: var(--sp-text-muted);
      margin-bottom: 0.25rem;
    }

    .metric-value {
      display: block;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--sp-primary);
      margin-bottom: 0.5rem;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      color: var(--sp-text);
      font-size: 0.9rem;

      app-ui-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--sp-primary-mid);
      }
    }

    .detail-section {
      margin: 1rem 0;
    }

    .detail-section h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 0.5rem;
      font-size: 0.95rem;
      color: var(--sp-primary);
    }

    .detail-section h3 app-ui-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .section-body {
      margin: 0;
      padding: 0.75rem 1rem;
      background: #fafafa;
      border-radius: var(--sp-radius-sm);
      border: 1px solid var(--sp-border);
      line-height: 1.7;
      color: var(--sp-text);
    }

    .section-body.positive { background: var(--sp-success-bg); border-color: #c8e6c9; }
    .section-body.warning { background: var(--sp-warning-bg); border-color: #ffe082; }

    mat-dialog-actions {
      padding: 0.75rem 1.5rem 1.25rem;
    }
  `]
})
export class TeacherMonitoringDetailDialogComponent {
  readonly data: TeacherMonitoringDetailDialogData = inject(MAT_DIALOG_DATA);
  readonly statusLabels = TEACHER_MONITORING_STATUS_LABELS;

  get evaluationPercent(): number {
    return Math.round((this.data.record.evaluationScore / 5) * 100);
  }

  get chipClass(): string {
    switch (this.data.record.status) {
      case 'EXCELLENT': return 'success';
      case 'GOOD': return 'info';
      case 'NEEDS_FOLLOW_UP': return 'warning';
      case 'CRITICAL': return 'danger';
      default: return 'neutral';
    }
  }
}
