import { Component, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { LessonPrep, ScheduleDay } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { ScheduleApiService } from '../../../class-schedule/services/schedule-api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ClassPeriodSlot, LessonPrepMockService } from '../../services/lesson-prep-mock.service';

/** The lesson this class should teach now, shared course content with per-section progress. */
@Component({
  selector: 'app-class-session-prep',
  standalone: true,
  imports: [MatButtonModule],
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
        @if (!finished && !notice && lessonNumber === sequenceLesson) {
          <button mat-stroked-button type="button" (click)="postpone()">تأجيل الحصة</button>
        }
      </div>

      @if (finished) {
        <p class="m-0 text-[0.95rem] text-muted">نفّذ هذا الفصل كل الحصص المخططة لهذه المادة.</p>
      } @else {
        @if (prep) {
          <article class="overflow-hidden rounded-sp border border-border">
            <header class="border-b border-border bg-primary-bg px-4 py-3">
              <h3 class="m-0 text-[1rem] font-bold">{{ prep.title }}</h3>
              @if (prep.fileName) {
                <p class="m-0 mt-1 text-[0.8rem] text-muted"><span dir="ltr">{{ prep.fileName }}</span></p>
              }
            </header>
            @if (pageUrl) {
              <img class="block w-full bg-white" [src]="pageUrl" [alt]="prep.title">
            } @else {
              <div class="bg-white px-5 py-5">
                <h3 class="m-0 text-[1.15rem] font-extrabold text-primary">تحضير حصة: {{ prep.title }}</h3>
                <p class="m-0 mt-1 text-[0.8rem] text-primary">التحضير {{ lessonNumber }} من {{ plannedCount }} · {{ prep.subject }} · الصف {{ prep.stageName }}</p>
                <table class="mt-4 w-full border-collapse text-[0.92rem]">
                  <tbody>
                    <tr class="border-b border-border">
                      <th class="w-28 bg-primary-bg px-3 py-2 text-start font-bold text-primary">الموضوع</th>
                      <td class="px-3 py-2">{{ prep.description || prep.title }}</td>
                    </tr>
                    @if (prep.lessonDate) {
                      <tr class="border-b border-border">
                        <th class="bg-primary-bg px-3 py-2 text-start font-bold text-primary">التاريخ</th>
                        <td class="px-3 py-2">{{ prep.lessonDate }}</td>
                      </tr>
                    }
                    <tr>
                      <th class="bg-primary-bg px-3 py-2 text-start font-bold text-primary">الملف</th>
                      <td class="px-3 py-2"><span dir="ltr">{{ prep.fileName }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            }
          </article>
        } @else {
          <p class="m-0 text-[0.95rem] text-muted">لا يوجد ملف للتحضير {{ lessonNumber }} بعد.</p>
        }

        @if (notice) {
          <p class="mb-0 mt-3 text-[0.95rem] font-semibold text-primary">{{ notice }}</p>
        }
      }
    </div>
  `
})
export class ClassSessionPrepComponent implements OnChanges, OnDestroy {
  private readonly service = inject(LessonPrepMockService);
  private readonly schedule = inject(ScheduleApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private slots: ClassPeriodSlot[] = [];
  private timer = 0;

  @Input() className = '';
  @Input() stageName = '';
  @Input() subject = '';
  @Input() classId: number | null = null;
  @Input() day: ScheduleDay | null = null;
  @Input() period: number | null = null;

  plannedCount = 24;
  lessonNumber = 1;
  sequenceLesson = 1;
  prep: LessonPrep | undefined;
  pageUrl = '';
  notice = '';

  get finished(): boolean {
    return this.sequenceLesson > this.plannedCount;
  }

  ngOnChanges(): void {
    this.notice = '';
    this.slots = [];
    window.clearInterval(this.timer);
    this.timer = window.setInterval(() => this.refresh(), 20000);
    this.loadSlots();
  }

  ngOnDestroy(): void {
    window.clearInterval(this.timer);
  }

  postpone(): void {
    const current = this.lessonNumber;
    this.service.postpone({
      className: this.className,
      subject: this.subject,
      stageName: this.stageName,
      slots: this.slots
    });
    this.notice = `أُجّل التحضير ${current}. سيُحمَّل مرة أخرى في الحصة القادمة لهذا الفصل.`;
    this.toast.success('تم تأجيل الحصة');
  }

  private loadSlots(): void {
    const teacherId = this.auth.user()?.teacherId ?? undefined;
    if ((!teacherId && !this.classId) || !this.className || !this.subject) {
      this.refresh();
      return;
    }
    this.schedule.getEntries({ teacherId, classId: this.classId ?? undefined }).subscribe({
      next: entries => {
        this.slots = entries
          .filter(entry => entry.className === this.className && entry.subject === this.subject)
          .map(entry => ({ day: entry.dayOfWeek, period: entry.period }));
        this.refresh();
      },
      error: () => this.refresh()
    });
  }

  private refresh(): void {
    if (!this.className || !this.subject) return;
    const before = this.lessonNumber;
    this.service.resolve(this.className, this.subject, this.stageName, this.slots);
    this.plannedCount = this.service.plannedCount(this.subject, this.stageName);
    this.sequenceLesson = this.service.nextLesson(this.className, this.subject, this.stageName);
    this.lessonNumber = this.day && this.period
      ? this.service.lessonForSlot(this.className, this.subject, this.stageName, this.slots, this.day, this.period)
      : this.sequenceLesson;
    this.prep = this.finished ? undefined : this.service.prepAt(this.subject, this.stageName, this.lessonNumber);
    const image = this.prep?.previewImage;
    this.pageUrl = image ? new URL(image, document.baseURI).toString() : '';
    if (this.lessonNumber !== before) this.notice = '';
  }
}
