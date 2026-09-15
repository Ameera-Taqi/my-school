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
    <div class="flex flex-wrap items-start gap-4 px-6 pt-5">
      <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
        <app-ui-icon name="school" class="size-[26px] text-[26px]"></app-ui-icon>
      </span>
      <div>
        <h2 mat-dialog-title class="!m-0 !p-0 text-[1.25rem] font-bold">{{ data.result.studentName }}</h2>
        <p class="mt-1 mb-0 text-[0.85rem] text-muted">{{ data.result.className }} — {{ data.result.stageName }}</p>
      </div>
      <span class="chip ms-auto self-center" [class]="'chip ms-auto self-center ' + chipClass">
        {{ gradeLabels[data.result.gradeLevel] }}
      </span>
    </div>

    <mat-dialog-content class="min-w-0">
      <div class="mb-4 rounded-sp-sm bg-gradient-to-b from-primary to-primary-mid p-5 text-center text-white">
        <span class="block text-[2rem] font-extrabold">{{ data.result.score }} / {{ data.result.maxScore }}</span>
        <span class="my-1 mb-3 block text-base opacity-85">{{ data.result.percentage }}%</span>
        <mat-progress-bar mode="determinate" [value]="data.result.percentage"></mat-progress-bar>
      </div>

      <div class="grid grid-cols-2 gap-3 max-[599px]:grid-cols-1">
        <div class="flex items-start gap-3 rounded-sp-sm bg-primary-bg p-3">
          <app-ui-icon name="menu_book" class="mt-0.5 text-primary-mid"></app-ui-icon>
          <div>
            <span class="block text-xs text-muted">المادة</span>
            <span class="block text-text">{{ data.result.subject }}</span>
          </div>
        </div>
        <div class="flex items-start gap-3 rounded-sp-sm bg-primary-bg p-3">
          <app-ui-icon name="person" class="mt-0.5 text-primary-mid"></app-ui-icon>
          <div>
            <span class="block text-xs text-muted">المعلم</span>
            <span class="block text-text">{{ data.result.teacherName }}</span>
          </div>
        </div>
        <div class="flex items-start gap-3 rounded-sp-sm bg-primary-bg p-3">
          <app-ui-icon name="calendar_today" class="mt-0.5 text-primary-mid"></app-ui-icon>
          <div>
            <span class="block text-xs text-muted">تاريخ الاختبار</span>
            <span class="block text-text">{{ data.result.examDate | appDate }}</span>
          </div>
        </div>
        <div class="flex items-start gap-3 rounded-sp-sm bg-primary-bg p-3">
          <app-ui-icon name="date_range" class="mt-0.5 text-primary-mid"></app-ui-icon>
          <div>
            <span class="block text-xs text-muted">الفصل الدراسي</span>
            <span class="block text-text">{{ data.result.term }}</span>
          </div>
        </div>
      </div>

      @if (data.result.notes) {
        <mat-divider></mat-divider>
        <section>
          <h3 class="mt-4 mb-2 flex items-center gap-2 text-[0.95rem] text-primary">
            <app-ui-icon name="notes"></app-ui-icon> ملاحظات
          </h3>
          <p class="m-0 rounded-sp-sm border border-[#ffe082] bg-warning-bg px-4 py-3 leading-7">{{ data.result.notes }}</p>
        </section>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="px-6 pt-3 pb-5">
      <button mat-flat-button color="primary" mat-dialog-close>إغلاق</button>
    </mat-dialog-actions>
  `
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
