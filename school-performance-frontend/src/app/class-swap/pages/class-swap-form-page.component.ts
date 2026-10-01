import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { ClassSwapApiService, ClassSwapKind, ClassSwapLesson, ClassSwapPreview, ClassSwapTeacherOption } from '../services/class-swap-api.service';
import { ClassSwapPreviewComponent } from '../components/class-swap-preview.component';

@Component({
  selector: 'app-class-swap-form-page',
  standalone: true,
  imports: [
    FormsModule, RouterLink, MatButtonModule, MatDatepickerModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTooltipModule, PageHeaderComponent, ClassSwapPreviewComponent, UiIconComponent
  ],
  template: `
    <app-page-header title="طلب تبديل حصة جديد" subtitle="لهذا اليوم فقط دون تغيير الجدول الأسبوعي. يمكنك التبديل مقابل حصة، أو أخذ التوقيت دون مقابل.">
      <a routerLink="/class-swaps" class="swap-back" matTooltip="رجوع للقائمة" aria-label="رجوع للقائمة">
        <app-ui-icon name="arrow_forward" class="lg"></app-ui-icon>
      </a>
    </app-page-header>

    <div class="data-card swap-form">
      <section class="swap-section">
        <header class="swap-section__head">
          <span class="swap-step">1</span>
          <div>
            <h3>نوع الطلب واليوم</h3>
            <p>حدد إن كان الطلب تبديلاً مقابل حصة، أو أخذاً لتوقيت المعلم الآخر دون مقابل.</p>
          </div>
        </header>
        <div class="swap-kinds" role="group" aria-label="نوع الطلب">
          <button type="button" [class.is-on]="kind === 'Exchange'" (click)="setKind('Exchange')">
            <strong>تبديل مقابل</strong>
            <span>حصتك تنتقل لتوقيته، وحصته تنتقل لتوقيتك.</span>
          </button>
          <button type="button" [class.is-on]="kind === 'TakeOnly'" (click)="setKind('TakeOnly')">
            <strong>أخذ دون مقابل</strong>
            <span>حصتك تنتقل لتوقيته، وحصته تُلغى لهذا اليوم.</span>
          </button>
        </div>
        <div class="swap-setup">
          <mat-form-field appearance="outline" class="swap-field" subscriptSizing="dynamic">
            <mat-label>التاريخ</mat-label>
            <input matInput [matDatepicker]="datePicker" [min]="minDay" [matDatepickerFilter]="schoolDay" [ngModel]="selectedDate" (ngModelChange)="onDatePicked($event)" readonly>
            <mat-datepicker-toggle matIconSuffix [for]="datePicker"></mat-datepicker-toggle>
            <mat-datepicker #datePicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" class="swap-field" subscriptSizing="dynamic">
            <mat-label>المعلم الآخر</mat-label>
            <mat-select [(ngModel)]="otherTeacherId" (selectionChange)="onTeacher()">
              @for (teacher of teachers; track teacher.id) {
                <mat-option [value]="teacher.id">{{ teacher.fullName }}{{ teacher.departmentName ? ' · ' + teacher.departmentName : '' }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </section>

      <section class="swap-section">
        <header class="swap-section__head">
          <span class="swap-step">2</span>
          <div>
            <h3>اختيار الحصتين</h3>
            <p>{{ kind === 'TakeOnly' ? 'اختر حصتك والتوقيت الذي تريد أخذه من المعلم الآخر.' : 'اختر حصتك ثم حصة المعلم الآخر في نفس اليوم.' }}</p>
          </div>
        </header>
        <div class="swap-panels">
          <article class="swap-panel" [class.has-pick]="!!myEntryId">
            <div class="swap-panel__title">
              <app-ui-icon name="person"></app-ui-icon>
              <div>
                <strong>حصتي</strong>
                <span>في هذا اليوم</span>
              </div>
            </div>
            @if (!myLessons.length) {
              <div class="swap-empty">
                <app-ui-icon name="event"></app-ui-icon>
                <p>لا توجد حصص لك في هذا اليوم. اختر يوماً دراسياً ضمن جدولك.</p>
              </div>
            } @else {
              <div class="swap-lessons">
                @for (lesson of myLessons; track lesson.entryId) {
                  <button type="button" [class.is-on]="myEntryId === lesson.entryId" [disabled]="lesson.swapped" (click)="pickMine(lesson)">
                    <span class="swap-lessons__period">ح{{ lesson.period }}</span>
                    <span class="swap-lessons__body">
                      <strong>{{ lesson.subject }}</strong>
                      <span>{{ lesson.className }}</span>
                      <span class="swap-lessons__time">{{ lesson.periodTime }}</span>
                      @if (lesson.swapped) { <em>مبدّلة مسبقاً</em> }
                    </span>
                  </button>
                }
              </div>
            }
          </article>

          <div class="swap-panels__divider" aria-hidden="true">
            <app-ui-icon [name]="kind === 'TakeOnly' ? 'arrow_forward' : 'swap_horiz'"></app-ui-icon>
          </div>

          <article class="swap-panel" [class.has-pick]="!!otherEntryId">
            <div class="swap-panel__title">
              <app-ui-icon name="groups"></app-ui-icon>
              <div>
                <strong>{{ kind === 'TakeOnly' ? 'التوقيت المطلوب' : 'حصة المعلم الآخر' }}</strong>
                <span>{{ selectedOtherTeacherName || 'اختر معلماً أولاً' }}</span>
              </div>
            </div>
            @if (!otherTeacherId) {
              <div class="swap-empty">
                <app-ui-icon name="search"></app-ui-icon>
                <p>اختر المعلم الآخر لعرض حصصه في التاريخ نفسه.</p>
              </div>
            } @else if (!otherLessons.length) {
              <div class="swap-empty">
                <app-ui-icon name="event"></app-ui-icon>
                <p>لا توجد حصص لهذا المعلم في التاريخ المحدد.</p>
              </div>
            } @else {
              <div class="swap-lessons">
                @for (lesson of otherLessons; track lesson.entryId) {
                  <button type="button" [class.is-on]="otherEntryId === lesson.entryId" [disabled]="lesson.swapped" (click)="pickOther(lesson)">
                    <span class="swap-lessons__period">ح{{ lesson.period }}</span>
                    <span class="swap-lessons__body">
                      <strong>{{ lesson.subject }}</strong>
                      <span>{{ lesson.className }}</span>
                      <span class="swap-lessons__time">{{ lesson.periodTime }}</span>
                      @if (lesson.swapped) { <em>مبدّلة مسبقاً</em> }
                      @if (kind === 'TakeOnly' && otherEntryId === lesson.entryId) { <em>ستُلغى لهذا اليوم</em> }
                    </span>
                  </button>
                }
              </div>
            }
          </article>
        </div>
      </section>

      <section class="swap-section">
        <header class="swap-section__head">
          <span class="swap-step">3</span>
          <div>
            <h3>التأكيد والإرسال</h3>
            <p>أضف سبباً اختيارياً، ثم راجع النتيجة قبل الإرسال.</p>
          </div>
        </header>
        <mat-form-field appearance="outline" class="swap-field" subscriptSizing="dynamic">
          <mat-label>سبب الطلب (اختياري)</mat-label>
          <textarea matInput rows="3" [(ngModel)]="reason" maxlength="500" placeholder="مثال: ظرف طارئ يتطلب تغيير توقيت الحصة لهذا اليوم"></textarea>
        </mat-form-field>

        @if (preview?.errors?.length) {
          <ul class="swap-errors">
            @for (error of preview!.errors; track error) { <li>{{ error }}</li> }
          </ul>
        }
        @if (preview?.beforeRequester && preview?.beforeCounterparty && preview?.afterRequester && preview?.afterCounterparty) {
          @if (preview!.kindLabel) {
            <p class="swap-kind-note">نوع الطلب: {{ preview!.kindLabel }}</p>
          }
          <app-class-swap-preview
            [beforeA]="preview!.beforeRequester!"
            [beforeB]="preview!.beforeCounterparty!"
            [afterA]="preview!.afterRequester!"
            [afterB]="preview!.afterCounterparty!">
          </app-class-swap-preview>
        }

        <div class="swap-actions">
          <a mat-button routerLink="/class-swaps">إلغاء</a>
          <button mat-flat-button color="primary" type="button" [disabled]="saving || !preview?.valid" (click)="submit()">
            <app-ui-icon name="send"></app-ui-icon>
            إرسال الطلب
          </button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .swap-back {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.65rem;
      height: 2.65rem;
      color: var(--color-primary-mid, #4f46e5);
      background: linear-gradient(180deg, #fff 0%, #f8faff 100%);
      border: 1px solid #c7d2fe;
      border-radius: 999px;
      box-shadow: 0 1px 2px rgba(49, 46, 129, 0.06), 0 6px 14px rgba(79, 70, 229, 0.08);
      text-decoration: none;
      transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
    }
    .swap-back:hover {
      color: var(--color-primary, #312e81);
      background: var(--color-primary-bg, #eef2ff);
      border-color: #818cf8;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.18);
      transform: translateX(0.15rem);
    }
    .swap-back:active {
      transform: translateX(0.05rem) scale(0.97);
      box-shadow: 0 1px 3px rgba(79, 70, 229, 0.14);
    }
    .swap-form {
      padding: 1.15rem 1.25rem 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }
    .swap-section {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      padding-bottom: 1.1rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .swap-section:last-child { border-bottom: 0; padding-bottom: 0; }
    .swap-section__head {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .swap-section__head h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
      color: #0f172a;
    }
    .swap-section__head p {
      margin: 0.15rem 0 0;
      color: #64748b;
      font-size: 0.84rem;
      line-height: 1.45;
    }
    .swap-step {
      flex: 0 0 auto;
      width: 1.85rem;
      height: 1.85rem;
      border-radius: 999px;
      display: inline-grid;
      place-items: center;
      background: #312e81;
      color: #fff;
      font-size: 0.82rem;
      font-weight: 800;
    }
    .swap-kinds {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem;
    }
    @media (max-width: 720px) { .swap-kinds { grid-template-columns: 1fr; } }
    .swap-kinds button {
      text-align: start;
      border: 1px solid #e2e8f0;
      background: #fff;
      border-radius: 0.95rem;
      padding: 0.8rem 0.9rem;
      cursor: pointer;
      font: inherit;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    }
    .swap-kinds button strong { font-size: 0.92rem; color: #0f172a; }
    .swap-kinds button span { font-size: 0.8rem; color: #64748b; line-height: 1.45; }
    .swap-kinds button.is-on {
      border-color: #4f46e5;
      background: #eef2ff;
      box-shadow: inset 0 0 0 1px #4f46e5;
    }
    .swap-setup {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.85rem;
    }
    @media (max-width: 720px) { .swap-setup { grid-template-columns: 1fr; } }
    .swap-field { width: 100%; }
    .swap-panels {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 0.75rem;
      align-items: stretch;
    }
    @media (max-width: 900px) {
      .swap-panels { grid-template-columns: 1fr; }
      .swap-panels__divider { justify-self: center; transform: rotate(90deg); }
    }
    .swap-panels__divider {
      display: grid;
      place-items: center;
      width: 2.4rem;
      color: #6366f1;
      align-self: center;
    }
    .swap-panel {
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      background: #f8fafc;
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-height: 11rem;
    }
    .swap-panel.has-pick {
      border-color: #c7d2fe;
      background: #f8faff;
    }
    .swap-panel__title {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      color: #334155;
    }
    .swap-panel__title strong {
      display: block;
      font-size: 0.92rem;
      font-weight: 800;
      color: #0f172a;
    }
    .swap-panel__title span {
      display: block;
      font-size: 0.78rem;
      color: #64748b;
    }
    .swap-empty {
      margin: auto 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.45rem;
      text-align: center;
      color: #64748b;
      padding: 1rem 0.5rem;
    }
    .swap-empty p { margin: 0; font-size: 0.84rem; line-height: 1.5; max-width: 18rem; }
    .swap-lessons {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .swap-lessons button {
      display: flex;
      align-items: stretch;
      gap: 0.65rem;
      text-align: start;
      border: 1px solid #e2e8f0;
      background: #fff;
      border-radius: 0.85rem;
      padding: 0.55rem 0.65rem;
      cursor: pointer;
      font: inherit;
      transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    }
    .swap-lessons button:hover:not(:disabled) {
      border-color: #a5b4fc;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    .swap-lessons button.is-on {
      border-color: #4f46e5;
      background: #eef2ff;
      box-shadow: inset 0 0 0 1px #4f46e5;
    }
    .swap-lessons button:disabled { opacity: 0.55; cursor: not-allowed; }
    .swap-lessons__period {
      flex: 0 0 auto;
      min-width: 2.4rem;
      display: grid;
      place-items: center;
      border-radius: 0.65rem;
      background: #e2e8f0;
      color: #1e293b;
      font-weight: 800;
      font-size: 0.82rem;
    }
    .swap-lessons button.is-on .swap-lessons__period {
      background: #4f46e5;
      color: #fff;
    }
    .swap-lessons__body {
      display: flex;
      flex-direction: column;
      gap: 0.08rem;
      min-width: 0;
    }
    .swap-lessons__body strong {
      font-size: 0.88rem;
      font-weight: 800;
      color: #0f172a;
    }
    .swap-lessons__body span { font-size: 0.78rem; color: #64748b; }
    .swap-lessons__time { font-variant-numeric: tabular-nums; }
    .swap-lessons__body em {
      font-style: normal;
      font-size: 0.74rem;
      color: #b45309;
      font-weight: 700;
    }
    .swap-kind-note {
      margin: 0;
      font-size: 0.84rem;
      font-weight: 700;
      color: #4338ca;
    }
    .swap-errors {
      margin: 0;
      color: #e11d48;
      padding: 0.7rem 0.9rem;
      border-radius: 0.75rem;
      background: #fff1f2;
      border: 1px solid #fecdd3;
      list-style-position: inside;
    }
    .swap-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.5rem;
      padding-top: 0.25rem;
    }
    .swap-actions button app-ui-icon { margin-inline-end: 0.25rem; }
  `]
})
export class ClassSwapFormPageComponent implements OnInit {
  private readonly api = inject(ClassSwapApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly minDay = startOfToday();
  selectedDate: Date | null = new Date(this.minDay);
  date = dateKey(this.selectedDate);
  kind: ClassSwapKind = 'Exchange';
  readonly schoolDay = (value: Date | null): boolean => {
    if (!value) return false;
    const day = value.getDay();
    return day !== 5 && day !== 6 && dateKey(value) >= dateKey(this.minDay);
  };
  teachers: ClassSwapTeacherOption[] = [];
  myLessons: ClassSwapLesson[] = [];
  otherLessons: ClassSwapLesson[] = [];
  myEntryId: number | null = null;
  otherTeacherId: number | null = null;
  otherEntryId: number | null = null;
  reason = '';
  preview: ClassSwapPreview | null = null;
  saving = false;

  get selectedOtherTeacherName(): string {
    return this.teachers.find(t => t.id === this.otherTeacherId)?.fullName ?? '';
  }

  ngOnInit(): void {
    this.api.teachers().subscribe({
      next: rows => this.teachers = rows,
      error: error => this.toast.fromError(error)
    });
    this.onDate();
  }

  setKind(kind: ClassSwapKind): void {
    if (this.kind === kind) return;
    this.kind = kind;
    this.refreshPreview();
  }

  onDatePicked(value: Date | null): void {
    this.selectedDate = value;
    this.date = dateKey(value);
    this.onDate();
  }

  onDate(): void {
    this.myEntryId = null;
    this.otherEntryId = null;
    this.preview = null;
    this.myLessons = [];
    this.otherLessons = [];
    const teacherId = this.auth.user()?.teacherId;
    if (!this.date || !teacherId) return;
    this.api.timetable(this.date, teacherId).subscribe({
      next: rows => this.myLessons = rows,
      error: error => this.toast.fromError(error)
    });
    this.onTeacher();
  }

  onTeacher(): void {
    this.otherEntryId = null;
    this.preview = null;
    this.otherLessons = [];
    if (!this.date || !this.otherTeacherId) return;
    this.api.timetable(this.date, this.otherTeacherId).subscribe({
      next: rows => this.otherLessons = rows,
      error: error => this.toast.fromError(error)
    });
  }

  pickMine(lesson: ClassSwapLesson): void {
    this.myEntryId = lesson.entryId;
    this.refreshPreview();
  }

  pickOther(lesson: ClassSwapLesson): void {
    this.otherEntryId = lesson.entryId;
    this.refreshPreview();
  }

  submit(): void {
    if (!this.preview?.valid || !this.myEntryId || !this.otherTeacherId || !this.otherEntryId) return;
    this.saving = true;
    this.api.create({
      date: this.date,
      kind: this.kind,
      myEntryId: this.myEntryId,
      otherTeacherId: this.otherTeacherId,
      otherEntryId: this.otherEntryId,
      reason: this.reason.trim() || undefined
    }).subscribe({
      next: detail => {
        this.toast.success(this.kind === 'TakeOnly' ? 'أُرسل طلب أخذ الحصة.' : 'أُرسل طلب تبديل الحصة.');
        this.router.navigate(['/class-swaps', detail.id]);
      },
      error: error => { this.saving = false; this.toast.fromError(error); }
    });
  }

  private refreshPreview(): void {
    this.preview = null;
    if (!this.myEntryId || !this.otherTeacherId || !this.otherEntryId) return;
    this.api.validate({
      date: this.date,
      kind: this.kind,
      myEntryId: this.myEntryId,
      otherTeacherId: this.otherTeacherId,
      otherEntryId: this.otherEntryId,
      reason: this.reason.trim() || undefined
    }).subscribe({
      next: preview => this.preview = preview,
      error: error => this.toast.fromError(error)
    });
  }
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function dateKey(value: Date | null): string {
  if (!value || Number.isNaN(value.getTime())) return '';
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}
