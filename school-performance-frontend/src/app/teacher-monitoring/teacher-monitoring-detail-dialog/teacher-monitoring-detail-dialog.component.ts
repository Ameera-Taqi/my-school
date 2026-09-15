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
    <div class="flex flex-wrap items-start gap-4 px-6 pt-5">
      <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
        <app-ui-icon name="person" class="size-[26px] text-[26px]"></app-ui-icon>
      </span>
      <div>
        <h2 mat-dialog-title class="!m-0 !p-0 text-[1.25rem] font-bold">{{ data.record.teacherName }}</h2>
        <p class="mt-1 mb-0 text-[0.85rem] text-muted">{{ data.record.departmentName }} — {{ data.record.subject }}</p>
      </div>
      <span class="chip ms-auto self-center" [class]="'chip ms-auto self-center ' + chipClass">
        {{ statusLabels[data.record.status] }}
      </span>
    </div>

    <mat-dialog-content class="min-w-0">
      <div class="mb-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        <div class="rounded-sp-sm bg-primary-bg px-4 py-3">
          <span class="mb-1 block text-xs text-muted">نسبة الحضور</span>
          <span class="mb-2 block text-[1.1rem] font-bold text-primary">{{ data.record.attendanceRate }}%</span>
          <mat-progress-bar mode="determinate" [value]="data.record.attendanceRate"></mat-progress-bar>
        </div>
        <div class="rounded-sp-sm bg-primary-bg px-4 py-3">
          <span class="mb-1 block text-xs text-muted">إنجاز خطط الدروس</span>
          <span class="mb-2 block text-[1.1rem] font-bold text-primary">{{ data.record.lessonPlanRate }}%</span>
          <mat-progress-bar mode="determinate" [value]="data.record.lessonPlanRate"></mat-progress-bar>
        </div>
        <div class="rounded-sp-sm bg-primary-bg px-4 py-3">
          <span class="mb-1 block text-xs text-muted">تقييم الأداء</span>
          <span class="mb-2 block text-[1.1rem] font-bold text-primary">{{ data.record.evaluationScore }} / 5</span>
          <mat-progress-bar mode="determinate" [value]="evaluationPercent"></mat-progress-bar>
        </div>
      </div>

      <div class="mb-2 flex items-center gap-2 text-[0.9rem] text-text">
        <app-ui-icon name="class" class="size-[18px] text-lg text-primary-mid"></app-ui-icon>
        <span>عدد الفصول: {{ data.record.classesCount }}</span>
      </div>
      <div class="mb-2 flex items-center gap-2 text-[0.9rem] text-text">
        <app-ui-icon name="event" class="size-[18px] text-lg text-primary-mid"></app-ui-icon>
        <span>آخر زيارة متابعة: {{ data.record.lastVisitDate | appDate }}</span>
      </div>

      <mat-divider></mat-divider>

      <section class="my-4">
        <h3 class="mb-2 flex items-center gap-2 text-[0.95rem] text-primary">
          <app-ui-icon name="thumb_up" class="size-5 text-xl"></app-ui-icon> نقاط القوة
        </h3>
        <p class="m-0 rounded-sp-sm border border-[#c8e6c9] bg-success-bg px-4 py-3 leading-7 text-text">{{ data.record.strengths || '—' }}</p>
      </section>

      <section class="my-4">
        <h3 class="mb-2 flex items-center gap-2 text-[0.95rem] text-primary">
          <app-ui-icon name="trending_up" class="size-5 text-xl"></app-ui-icon> مجالات التحسين
        </h3>
        <p class="m-0 rounded-sp-sm border border-[#ffe082] bg-warning-bg px-4 py-3 leading-7 text-text">{{ data.record.improvements || '—' }}</p>
      </section>

      <section class="my-4">
        <h3 class="mb-2 flex items-center gap-2 text-[0.95rem] text-primary">
          <app-ui-icon name="notes" class="size-5 text-xl"></app-ui-icon> ملاحظات المتابعة
        </h3>
        <p class="m-0 rounded-sp-sm border border-border bg-[#fafafa] px-4 py-3 leading-7 text-text">{{ data.record.notes || '—' }}</p>
      </section>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="px-6 pt-3 pb-5">
      <button mat-flat-button color="primary" mat-dialog-close>إغلاق</button>
    </mat-dialog-actions>
  `
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
