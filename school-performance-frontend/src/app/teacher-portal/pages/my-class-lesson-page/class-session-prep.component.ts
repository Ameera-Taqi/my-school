import { Component, Input, OnChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LessonPrep } from '../../../core/models';
import { UiIconComponent } from '../../../shared/icons/ui-icon.component';
import { ToastService } from '../../../shared/services/toast.service';
import { LessonPrepFormDialogComponent } from '../../dialogs/lesson-prep-form-dialog.component';
import { LessonDeliveryStatus, LessonPrepMockService } from '../../services/lesson-prep-mock.service';

/** The lesson this class should teach now, shared course content with per-section progress. */
@Component({
  selector: 'app-class-session-prep',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, UiIconComponent],
  template: `
    <div class="data-card p-4">
      <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="m-0 text-[0.8rem] font-semibold text-muted">{{ subject }} — {{ className }}</p>
          @if (finished) {
            <h2 class="m-0 mt-1 text-[1.15rem] font-extrabold text-primary">اكتملت حصص المنهج</h2>
          } @else {
            <h2 class="m-0 mt-1 text-[1.15rem] font-extrabold text-primary">التحضير {{ lessonNumber }} من {{ plannedCount }}</h2>
          }
        </div>
        <mat-form-field appearance="outline" class="w-40">
          <mat-label>عدد حصص المنهج</mat-label>
          <input matInput type="number" min="1" max="200" [(ngModel)]="plannedCount" (change)="saveCount()">
        </mat-form-field>
      </div>

      @if (finished) {
        <p class="m-0 text-[0.95rem] text-muted">نفّذ هذا الفصل كل الحصص المخططة لهذه المادة. زِد عدد حصص المنهج إذا بقي محتوى جديد.</p>
      } @else {
        @if (prep) {
          <div class="rounded-sp border border-border bg-primary-bg px-4 py-3">
            <strong class="block text-[1rem]">{{ prep.title }}</strong>
            @if (prep.description) {
              <p class="mb-2 mt-1 text-[0.9rem] text-muted">{{ prep.description }}</p>
            }
            @if (prep.fileName) {
              <button type="button" class="btn-action btn-action--view" (click)="download(prep)">
                <app-ui-icon name="download"></app-ui-icon>
                {{ prep.fileName }}
              </button>
            }
          </div>
        } @else {
          <p class="m-0 text-[0.95rem] text-muted">لا يوجد ملف للتحضير {{ lessonNumber }} بعد. ارفعه ليظهر في كل فصول هذه المرحلة.</p>
        }

        <div class="mt-4 flex flex-wrap gap-2">
          <button mat-stroked-button type="button" color="primary" (click)="upload()">
            <app-ui-icon name="upload"></app-ui-icon>
            {{ prep ? 'تحديث التحضير' : 'رفع التحضير' }}
          </button>
          @if (!notice) {
            <button mat-flat-button type="button" color="primary" (click)="mark('DELIVERED')">تم تنفيذ الحصة</button>
            <button mat-stroked-button type="button" (click)="mark('POSTPONED')">تأجيل الحصة</button>
          }
        </div>
        @if (notice) {
          <p class="mb-0 mt-3 text-[0.95rem] font-semibold text-primary">{{ notice }}</p>
        }
      }
    </div>
  `
})
export class ClassSessionPrepComponent implements OnChanges {
  private readonly service = inject(LessonPrepMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  @Input() className = '';
  @Input() stageName = '';
  @Input() subject = '';

  plannedCount = 24;
  lessonNumber = 1;
  prep: LessonPrep | undefined;
  notice = '';

  get finished(): boolean {
    return this.lessonNumber > this.plannedCount;
  }

  ngOnChanges(): void {
    this.notice = '';
    this.reload();
  }

  saveCount(): void {
    this.plannedCount = this.service.setPlannedCount(this.subject, this.stageName, this.plannedCount);
    this.reload();
  }

  upload(): void {
    const ref = this.dialog.open(LessonPrepFormDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: {
        stageName: this.stageName,
        lockedSubject: this.subject,
        lessonNumber: this.lessonNumber,
        stages: [{ stageName: this.stageName, subject: this.subject }]
      }
    });
    ref.afterClosed().subscribe((result: Omit<LessonPrep, 'id' | 'teacherName'> | undefined) => {
      if (!result) return;
      this.service.create({ ...result, teacherName: '' }).subscribe({
        next: () => {
          this.toast.success('تم حفظ التحضير');
          this.reload();
        },
        error: error => this.toast.fromError(error)
      });
    });
  }

  download(prep: LessonPrep): void {
    this.service.download(prep);
  }

  mark(status: LessonDeliveryStatus): void {
    const current = this.lessonNumber;
    const next = this.service.markLesson({
      className: this.className,
      subject: this.subject,
      stageName: this.stageName,
      lessonNumber: current,
      status
    });
    this.notice = status === 'DELIVERED'
      ? `تم تنفيذ التحضير ${current}. الحصة القادمة لهذا الفصل ستفتح التحضير ${next}.`
      : `أُجّل التحضير ${current}. سيُحمَّل مرة أخرى في الحصة القادمة لهذا الفصل.`;
    this.toast.success(status === 'DELIVERED' ? 'تم تسجيل تنفيذ الحصة' : 'تم تأجيل الحصة');
  }

  private reload(): void {
    if (!this.className || !this.subject) return;
    this.plannedCount = this.service.plannedCount(this.subject, this.stageName);
    this.lessonNumber = this.service.nextLesson(this.className, this.subject, this.stageName);
    this.prep = this.finished ? undefined : this.service.prepAt(this.subject, this.stageName, this.lessonNumber);
  }
}
