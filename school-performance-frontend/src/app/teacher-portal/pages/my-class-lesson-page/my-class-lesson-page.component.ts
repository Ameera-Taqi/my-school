import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ScheduleApiService } from '../../../class-schedule/services/schedule-api.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AttendanceRecordPageComponent } from '../attendance-record-page/attendance-record-page.component';
import { GradesPageComponent } from '../grades-page/grades-page.component';
import { TeacherNotesPageComponent } from '../teacher-notes-page/teacher-notes-page.component';

type ClassTab = 'attendance' | 'grades' | 'behavior';

/** One of the signed-in teacher's classes, with attendance, grades, and behavior. */
@Component({
  selector: 'app-my-class-lesson-page',
  standalone: true,
  imports: [
    RouterLink, PageHeaderComponent, BreadcrumbComponent, EmptyStateComponent, TranslatePipe,
    AttendanceRecordPageComponent, GradesPageComponent, TeacherNotesPageComponent
  ],
  template: `
    <app-breadcrumb [items]="crumbs"></app-breadcrumb>

    @if (loading) {
      <div class="skeleton mb-3 h-16 w-full rounded-sp"></div>
    } @else if (!found) {
      <app-page-header [title]="'nav.myLessons' | translate"></app-page-header>
      <div class="data-card">
        <app-empty-state icon="class" [title]="'myLessons.classMissing' | translate">
          <a class="text-primary no-underline" routerLink="/my-lessons">{{ 'nav.myLessons' | translate }}</a>
        </app-empty-state>
      </div>
    } @else {
      <app-page-header [title]="className" [subtitle]="stageName"></app-page-header>

      <div class="pills" role="tablist" [attr.aria-label]="className">
        @for (item of tabs; track item.id) {
          <button
            type="button"
            role="tab"
            class="pill"
            [class.pill-active]="tab === item.id"
            [attr.aria-selected]="tab === item.id"
            [attr.aria-controls]="'class-panel-' + item.id"
            (click)="selectTab(item.id)">
            {{ item.label | translate }}
          </button>
        }
      </div>

      @if (tab === 'attendance') {
        <div role="tabpanel" id="class-panel-attendance">
          <app-attendance-record-page
            [embedded]="true"
            [lockedClass]="className"
            [lockedClassId]="classId"
            [lockedStageName]="stageName"
            [lockedStageId]="stageId">
          </app-attendance-record-page>
        </div>
      } @else if (tab === 'grades') {
        <div role="tabpanel" id="class-panel-grades">
          <app-grades-page
            [lockedClass]="className"
            [lockedSubject]="subject"
            [lockedClassId]="classId">
          </app-grades-page>
        </div>
      } @else {
        <div role="tabpanel" id="class-panel-behavior">
          <app-teacher-notes-page [lockedClass]="className"></app-teacher-notes-page>
        </div>
      }
    }
  `,
  styles: `
    .pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    .pill {
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-muted);
      border-radius: 999px;
      padding: 8px 16px;
      font: inherit;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .pill-active {
      background: var(--color-primary);
      color: var(--color-surface);
      border-color: var(--color-primary);
    }
  `
})
export class MyClassLessonPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ScheduleApiService);
  private readonly lang = inject(LanguageService);

  readonly tabs: { id: ClassTab; label: string }[] = [
    { id: 'attendance', label: 'classTab.attendance' },
    { id: 'grades', label: 'classTab.grades' },
    { id: 'behavior', label: 'classTab.behavior' }
  ];

  loading = true;
  found = false;
  tab: ClassTab = 'attendance';
  classId: number | null = null;
  className = '';
  stageName = '';
  stageId: number | null = null;
  subject = '';

  get crumbs() {
    return [
      { label: this.lang.translate('nav.myLessons'), route: '/my-lessons' },
      { label: this.className || '…' }
    ];
  }

  selectTab(id: ClassTab): void {
    this.tab = id;
  }

  ngOnInit(): void {
    const classId = Number(this.route.snapshot.paramMap.get('classId'));
    const teacherId = this.auth.user()?.teacherId;
    if (!teacherId || !classId) {
      this.loading = false;
      return;
    }
    this.api.getEntries({ teacherId, classId }).subscribe({
      next: entries => {
        const mine = entries.find(entry => entry.classId === classId);
        this.found = !!mine;
        if (mine) {
          this.classId = classId;
          this.className = mine.className;
          this.stageName = mine.stageName ?? '';
          this.stageId = mine.stageId ?? null;
          this.subject = mine.subject ?? '';
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }
}
