import { Component, OnInit, inject } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { ToastService } from '../../shared/services/toast.service';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { AttendanceApiService } from '../../attendance/services/attendance-api.service';
import { BehaviorMockService } from '../../behavior/services/behavior-mock.service';
import {
  AcademicStage, AttendanceRecord, BehaviorNote, REPORT_ACTION_OPTIONS, ReportActionKind,
  SchoolClass, Student, TeacherNote, reportActionLabel
} from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';
import { GENDER_LABELS, STUDENT_STATUS_LABELS } from '../../students/constants/student.constants';
import { TeacherPortalMockService } from '../../teacher-portal/services/teacher-portal-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { FileField, FilePerson, PersonFileComponent, formatFileDate } from '../person-file.component';

const REPORT_MARKER = 'إنشاء تقرير:';

@Component({
  selector: 'app-student-file-page',
  standalone: true,
  imports: [
    FormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule,
    MatTabsModule, MatMenuModule, UiIconComponent, PersonFileComponent
  ],
  template: `
    <app-person-file
      title="ملف المتعلم"
      subtitle="صفِّ القائمة بالمرحلة أو الفصل أو الاسم، أو اجمع بينهم"
      listTitle="المتعلمون"
      emptyListIcon="school"
      emptyListTitle="لا يوجد متعلمون"
      emptyListDescription="لم يطابق الفلتر أي متعلم."
      emptyFileIcon="folder"
      emptyFileTitle="ملف المتعلم"
      emptyFileDescription="اختر متعلماً من القائمة لعرض ملفه."
      [hideSearch]="true"
      [loading]="loading"
      [items]="rows"
      [selectedId]="selected?.id ?? null"
      [personName]="selected?.fullName ?? ''"
      [personMeta]="personMeta"
      [photoUrl]="selected?.photoUrl ?? ''"
      [statusLabel]="statusLabel"
      [statusTone]="statusTone"
      [fields]="[]"
      (pick)="choose($event)"
    >
    <section fileFilters class="data-card student-file-filters">
      <mat-form-field appearance="outline" class="filter-field" subscriptSizing="dynamic">
        <mat-label>اختر المرحلة</mat-label>
        <mat-select [value]="stageId" (selectionChange)="onStage($event.value)">
          <mat-option [value]="null">الكل</mat-option>
          @for (stage of stages; track stage.id) {
            <mat-option [value]="stage.id">{{ stage.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="filter-field" subscriptSizing="dynamic">
        <mat-label>اختر الفصل</mat-label>
        <mat-select [value]="classId" (selectionChange)="onClass($event.value)">
          <mat-option [value]="null">الكل</mat-option>
          @for (schoolClass of classChoices; track schoolClass.id) {
            <mat-option [value]="schoolClass.id">{{ classLabel(schoolClass) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="filter-field" subscriptSizing="dynamic">
        <mat-label>اسم المتعلم</mat-label>
        <input matInput [ngModel]="nameQuery" (ngModelChange)="onName($event)" placeholder="اسم المتعلم" autocomplete="off">
      </mat-form-field>
      <button mat-stroked-button type="button" (click)="resetFilters()" [disabled]="!hasFilters">
        <app-ui-icon name="restart_alt"></app-ui-icon>
        مسح
      </button>
    </section>
    @if (selected) {
      <section fileNotes class="student-sheet-tabs">
        <mat-tab-group animationDuration="150ms" mat-stretch-tabs="false" class="file-tabs">
          <mat-tab label="بيانات المتعلم">
            <div class="tab-pane data-tab">
              <div class="data-photo" aria-hidden="true">
                @if (selected.photoUrl) {
                  <img class="data-photo__img" [src]="selected.photoUrl" alt="">
                } @else {
                  <span class="data-photo__fallback">{{ initials(selected.fullName) }}</span>
                }
              </div>

              <div class="data-groups">
                <section class="data-group">
                  <h3 class="data-group__title">الهوية</h3>
                  <dl class="data-list">
                    @for (field of identityFields; track field.label) {
                      <div class="data-row">
                        <dt>{{ field.label }}</dt>
                        <dd [attr.dir]="field.ltr ? 'ltr' : null">{{ field.value || '—' }}</dd>
                      </div>
                    }
                  </dl>
                </section>

                <section class="data-group">
                  <h3 class="data-group__title">التواصل والملاحظات</h3>
                  <dl class="data-list">
                    @for (field of contactFields; track field.label) {
                      <div class="data-row" [class.data-row--stack]="field.wide">
                        <dt>{{ field.label }}</dt>
                        <dd [attr.dir]="field.ltr ? 'ltr' : null">{{ field.value || '—' }}</dd>
                      </div>
                    }
                  </dl>
                </section>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="الغيابات">
            <div class="tab-pane">
              @if (attendanceLoading) {
                <p class="tab-empty">جاري تحميل الغيابات…</p>
              } @else if (!absences.length) {
                <p class="tab-empty">لا توجد غيابات مسجّلة لهذا المتعلم.</p>
              } @else {
                <ul class="sheet-list">
                  @for (row of absences; track trackAttendance($index, row)) {
                    <li>
                      <div class="sheet-list__meta">
                        <span>{{ noteDate(row.date) }}</span>
                        @if (row.className) { <span>{{ row.className }}</span> }
                        @if (row.period) { <span>الحصة {{ row.period }}</span> }
                      </div>
                      @if (row.notes) { <p>{{ row.notes }}</p> }
                    </li>
                  }
                </ul>
              }
            </div>
          </mat-tab>

          <mat-tab label="التأخيرات">
            <div class="tab-pane">
              @if (attendanceLoading) {
                <p class="tab-empty">جاري تحميل التأخيرات…</p>
              } @else if (!lates.length) {
                <p class="tab-empty">لا توجد تأخيرات مسجّلة لهذا المتعلم.</p>
              } @else {
                <ul class="sheet-list">
                  @for (row of lates; track trackAttendance($index, row)) {
                    <li>
                      <div class="sheet-list__meta">
                        <span>{{ noteDate(row.date) }}</span>
                        @if (row.lateTime) { <span dir="ltr">{{ row.lateTime }}</span> }
                        @if (row.className) { <span>{{ row.className }}</span> }
                        @if (row.period) { <span>الحصة {{ row.period }}</span> }
                      </div>
                      @if (row.notes) { <p>{{ row.notes }}</p> }
                    </li>
                  }
                </ul>
              }
            </div>
          </mat-tab>

          <mat-tab label="الملاحظات السلوكية">
            <div class="tab-pane">
              @if (!behaviorNotes.length) {
                <p class="tab-empty">لا توجد ملاحظات سلوك مسجّلة لهذا المتعلم.</p>
              } @else {
                <ul class="sheet-list">
                  @for (note of behaviorNotes; track note.key) {
                    <li>
                      <div class="sheet-list__meta">
                        <span>{{ noteDate(note.date) }}</span>
                        @if (note.meta) { <span>{{ note.meta }}</span> }
                        @if (note.by) { <span>{{ note.by }}</span> }
                      </div>
                      <p>{{ note.text }}</p>
                    </li>
                  }
                </ul>
              }
            </div>
          </mat-tab>

          <mat-tab label="التقارير">
            <div class="tab-pane">
              @if (!reports.length) {
                <p class="tab-empty">لا توجد تقارير أنشأها المعلمون لهذا المتعلم.</p>
              } @else {
                <ul class="sheet-list">
                  @for (note of reports; track note.id) {
                    <li class="report-card">
                      <div class="sheet-list__meta">
                        <span>{{ noteDate(note.noteDate) }}</span>
                        <span>{{ note.className }}</span>
                        @if (note.teacherName) { <span>{{ note.teacherName }}</span> }
                      </div>
                      <p>{{ reportText(note) }}</p>

                      @if (note.action) {
                        <div class="report-action report-action--done">
                          <span class="report-action__chip">{{ actionLabel(note.action) }}</span>
                          <span class="report-action__meta">
                            بواسطة {{ note.actionBy || '—' }}
                            @if (note.actionAt) { · {{ noteDate(note.actionAt) }} }
                          </span>
                          @if (canTakeReportAction) {
                            <button mat-button type="button" class="report-action__change" (click)="clearReportAction(note)">
                              تغيير الإجراء
                            </button>
                          }
                        </div>
                      } @else if (canTakeReportAction) {
                        <div class="report-action">
                          <button
                            mat-stroked-button
                            type="button"
                            class="report-action__pick"
                            [matMenuTriggerFor]="actionMenu"
                            [disabled]="actionBusyId === note.id"
                          >
                            {{ pendingAction[note.id ?? 0] ? actionLabel(pendingAction[note.id ?? 0]) : 'اتخاذ إجراء' }}
                            <app-ui-icon name="keyboard_arrow_down"></app-ui-icon>
                          </button>
                          <mat-menu #actionMenu="matMenu" yPosition="below" xPosition="after" overlapTrigger="false">
                            @for (option of actionOptions; track option.id) {
                              <button mat-menu-item type="button" (click)="pendingAction[note.id ?? 0] = option.id">
                                {{ option.label }}
                              </button>
                            }
                          </mat-menu>
                          <button
                            mat-flat-button
                            color="primary"
                            type="button"
                            [disabled]="!pendingAction[note.id ?? 0] || actionBusyId === note.id"
                            (click)="applyReportAction(note)"
                          >
                            اعتماد الإجراء
                          </button>
                        </div>
                      } @else {
                        <p class="report-action__wait">بانتظار إجراء من مشرف الجناح أو الإدارة العليا</p>
                      }
                    </li>
                  }
                </ul>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </section>
    }
    </app-person-file>
  `,
  styles: [`
    .student-file-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding: 0.85rem 1rem;
    }
    .filter-field {
      flex: 1 1 12rem;
      min-width: 0;
      margin: 0;
    }
    .student-sheet-tabs {
      margin-top: 0.15rem;
      min-width: 0;
    }
    .file-tabs {
      --mdc-tab-indicator-active-indicator-color: var(--sp-primary);
    }
    :host ::ng-deep .file-tabs .mat-mdc-tab-header {
      border-bottom: 1px solid #f1f5f9;
    }
    :host ::ng-deep .file-tabs .mdc-tab {
      min-width: auto;
      padding: 0 0.7rem;
    }
    :host ::ng-deep .file-tabs .mdc-tab__text-label {
      font-weight: 800;
      font-size: 0.82rem;
      letter-spacing: 0;
    }
    :host ::ng-deep .file-tabs .mat-mdc-tab-body-content {
      overflow: visible;
    }
    .tab-pane {
      padding-top: 0.9rem;
    }
    .data-tab {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 0.85rem;
    }
    .data-photo {
      display: flex;
      flex-shrink: 0;
      padding-top: 0.15rem;
    }
    .data-photo__img,
    .data-photo__fallback {
      width: 5.5rem;
      height: 5.5rem;
      flex-shrink: 0;
      border-radius: 1rem;
      object-fit: cover;
      background: var(--sp-primary-light);
    }
    .data-photo__fallback {
      display: grid;
      place-items: center;
      color: var(--sp-primary);
      font-size: 1.35rem;
      font-weight: 800;
    }
    .data-groups {
      display: flex;
      min-width: 0;
      flex: 1;
      flex-direction: column;
      gap: 0.75rem;
    }
    .data-group {
      margin: 0;
      padding: 0.55rem 0.15rem 0.15rem;
      border: 1px solid #eef2f7;
      border-radius: 0.95rem;
      background: #fff;
      overflow: hidden;
    }
    .data-group__title {
      margin: 0;
      padding: 0.35rem 0.85rem 0.55rem;
      color: var(--sp-text-muted);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.02em;
    }
    .data-list {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
    }
    .data-row {
      display: grid;
      grid-template-columns: minmax(6.5rem, 38%) 1fr;
      gap: 0.55rem 0.75rem;
      align-items: start;
      margin: 0;
      padding: 0.65rem 0.85rem;
      border-top: 1px solid #f1f5f9;
    }
    .data-row--stack {
      grid-template-columns: 1fr;
      gap: 0.25rem;
    }
    .data-row dt {
      margin: 0;
      color: var(--sp-text-muted);
      font-size: 0.78rem;
      font-weight: 700;
    }
    .data-row dd {
      margin: 0;
      color: var(--sp-text);
      font-size: 0.9rem;
      font-weight: 750;
      overflow-wrap: anywhere;
      text-align: start;
    }
    .sheet-list {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .sheet-list li {
      padding: 0.7rem 0.85rem;
      border: 1px solid #f1f5f9;
      border-radius: 0.85rem;
      background: #fff;
    }
    .sheet-list__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 0.75rem;
      color: var(--sp-text-muted);
      font-size: 0.75rem;
      font-weight: 700;
    }
    .sheet-list li p {
      margin: 0.3rem 0 0;
      color: var(--sp-text);
      font-weight: 700;
      white-space: pre-wrap;
    }
    .report-card {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .report-action {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.55rem;
      margin-top: 0.15rem;
      padding-top: 0.55rem;
      border-top: 1px dashed #e2e8f0;
    }
    .report-action--done {
      align-items: flex-start;
    }
    .report-action__pick {
      min-width: 11rem;
      justify-content: space-between;
      gap: 0.35rem;
    }
    .report-action__chip {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.7rem;
      border-radius: 999px;
      background: var(--sp-primary-bg);
      color: var(--sp-primary);
      font-size: 0.8rem;
      font-weight: 800;
    }
    .report-action__meta {
      color: var(--sp-text-muted);
      font-size: 0.75rem;
      font-weight: 700;
    }
    .report-action__change {
      margin-inline-start: auto;
    }
    .report-action__wait {
      margin: 0.15rem 0 0;
      color: var(--sp-warning, #b45309);
      font-size: 0.8rem;
      font-weight: 700;
    }
    .tab-empty {
      margin: 0;
      color: var(--sp-text-muted);
      font-size: 0.85rem;
    }
  `]
})
export class StudentFilePageComponent implements OnInit {
  private readonly lookup = inject(AcademicLookupService);
  private readonly notesApi = inject(TeacherPortalMockService);
  private readonly behaviorApi = inject(BehaviorMockService);
  private readonly attendanceApi = inject(AttendanceApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly actionOptions = REPORT_ACTION_OPTIONS;
  readonly canTakeReportAction = this.auth.hasAnyRole([
    'SCHOOL_MANAGER', 'ASSISTANT_MANAGER', 'WING_SUPERVISOR', 'ADMIN'
  ]);
  pendingAction: Record<number, ReportActionKind | null> = {};
  actionBusyId: number | null = null;

  loading = true;
  attendanceLoading = false;
  stages: AcademicStage[] = [];
  classes: SchoolClass[] = [];
  stageId: number | null = null;
  classId: number | null = null;
  nameQuery = '';
  students: Student[] = [];
  selected: Student | null = null;
  private teacherNotes: TeacherNote[] = [];
  private disciplineNotes: BehaviorNote[] = [];
  absences: AttendanceRecord[] = [];
  lates: AttendanceRecord[] = [];
  private attendanceSeq = 0;

  get classChoices(): SchoolClass[] {
    if (this.stageId == null) return this.classes;
    return this.classes.filter(schoolClass => schoolClass.academicStageId === this.stageId);
  }

  get hasFilters(): boolean {
    return this.stageId != null || this.classId != null || this.nameQuery.trim().length > 0;
  }

  get rows(): FilePerson[] {
    return this.visible.map(student => ({
      id: student.id ?? 0,
      name: student.fullName,
      meta: [student.academicStageName, student.className].filter(Boolean).join(' · '),
      photoUrl: student.photoUrl
    }));
  }

  get personMeta(): string {
    if (!this.selected) return '';
    return [this.selected.academicStageName, this.selected.className].filter(Boolean).join(' · ');
  }

  get statusLabel(): string {
    return this.selected ? this.status(this.selected.status) : '';
  }

  get statusTone(): 'ok' | 'warn' | 'off' | '' {
    switch (this.selected?.status) {
      case 'ACTIVE': return 'ok';
      case 'TRANSFERRED': return 'warn';
      case 'SUSPENDED': return 'off';
      default: return '';
    }
  }

  get identityFields(): FileField[] {
    const student = this.selected;
    if (!student) return [];
    return [
      { label: 'الرقم المدني', value: student.civilId || '—', ltr: true },
      { label: 'الجنس', value: this.gender(student.gender) },
      { label: 'تاريخ الميلاد', value: this.dateLabel(student.birthDate) },
      { label: 'الحالة', value: this.status(student.status) }
    ];
  }

  get contactFields(): FileField[] {
    const student = this.selected;
    if (!student) return [];
    return [
      { label: 'هاتف ولي الأمر', value: student.guardianPhone || '—', ltr: true },
      { label: 'ملاحظات', value: student.notes || '—', wide: true }
    ];
  }

  get behaviorNotes(): { key: string; date: string; text: string; meta?: string; by?: string }[] {
    const student = this.selected;
    if (!student) return [];
    const name = student.fullName.trim();
    const fromTeacher = this.teacherNotes
      .filter(note => note.noteType === 'BEHAVIOR'
        && !this.hasReport(note)
        && note.studentName.trim() === name
        && (!student.className || note.className === student.className))
      .map(note => ({
        key: `t-${note.id ?? note.noteDate}-${note.content}`,
        date: note.noteDate,
        text: note.content,
        meta: note.className,
        by: note.teacherName
      }));
    const fromDiscipline = this.disciplineNotes
      .filter(note => note.studentId === student.id || note.studentName.trim() === name)
      .map(note => ({
        key: `b-${note.id ?? note.noteDate}-${note.description}`,
        date: note.noteDate,
        text: note.description,
        meta: this.behaviorTypeLabel(note.type),
        by: note.recordedBy
      }));
    return [...fromTeacher, ...fromDiscipline]
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  get reports(): TeacherNote[] {
    const student = this.selected;
    if (!student) return [];
    const name = student.fullName.trim();
    return this.teacherNotes
      .filter(note => this.hasReport(note)
        && note.studentName.trim() === name
        && (!student.className || note.className === student.className))
      .sort((a, b) => b.noteDate.localeCompare(a.noteDate));
  }

  private get visible(): Student[] {
    const name = this.nameQuery.trim().toLowerCase();
    const list = this.students.filter(student => {
      if (this.stageId != null && student.academicStageId !== this.stageId) return false;
      if (this.classId != null && student.classId !== this.classId) return false;
      if (name && !student.fullName.toLowerCase().includes(name)) return false;
      return true;
    });
    return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
  }

  ngOnInit(): void {
    forkJoin({
      stages: this.lookup.getStages(),
      classes: this.lookup.getAllClasses(),
      students: this.lookup.getAllStudents(),
      notes: this.notesApi.getNotes(),
      discipline: this.behaviorApi.getAll().pipe(catchError(() => of([] as BehaviorNote[])))
    }).subscribe({
      next: ({ stages, classes, students, notes, discipline }) => {
        this.stages = stages;
        this.classes = classes;
        this.students = students;
        this.teacherNotes = notes;
        this.disciplineNotes = discipline;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.toast.fromError(error);
      }
    });
  }

  onStage(stageId: number | null): void {
    this.stageId = stageId;
    if (this.classId != null && !this.classChoices.some(schoolClass => schoolClass.id === this.classId)) {
      this.classId = null;
    }
    this.keepSelection();
  }

  onClass(classId: number | null): void {
    this.classId = classId;
    this.keepSelection();
  }

  onName(value: string): void {
    this.nameQuery = value;
    this.keepSelection();
  }

  resetFilters(): void {
    this.stageId = null;
    this.classId = null;
    this.nameQuery = '';
    this.keepSelection();
  }

  classLabel(schoolClass: SchoolClass): string {
    if (this.stageId != null || !schoolClass.academicStageName) return schoolClass.name;
    return `${schoolClass.name} · ${schoolClass.academicStageName}`;
  }

  private keepSelection(): void {
    if (this.selected && !this.visible.some(student => student.id === this.selected?.id)) {
      this.selected = null;
      this.absences = [];
      this.lates = [];
    }
  }

  choose(id: number): void {
    this.selected = this.students.find(student => student.id === id) ?? null;
    this.loadAttendance();
  }

  trackAttendance(index: number, row: AttendanceRecord): string {
    return `${row.id ?? index}-${row.date}-${row.period ?? 0}-${row.status}`;
  }

  hasReport(note: TeacherNote): boolean {
    return note.content.includes(REPORT_MARKER);
  }

  reportText(note: TeacherNote): string {
    const at = note.content.indexOf(REPORT_MARKER);
    if (at < 0) return note.content;
    const body = note.content.slice(at + REPORT_MARKER.length).trim();
    const prefix = note.content.slice(0, at).replace(/[،,]\s*$/, '').trim();
    return prefix ? `${prefix}\n${body}` : body;
  }

  actionLabel(action?: ReportActionKind | null): string {
    return reportActionLabel(action);
  }

  applyReportAction(note: TeacherNote): void {
    if (!this.canTakeReportAction || note.id == null) return;
    const action = this.pendingAction[note.id];
    if (!action) {
      this.toast.error('اختر إجراءً قبل الاعتماد');
      return;
    }
    this.actionBusyId = note.id;
    const updated: TeacherNote = {
      ...note,
      action,
      actionBy: this.auth.fullName() || '—',
      actionAt: this.todayStamp()
    };
    this.notesApi.saveNote(updated).subscribe({
      next: saved => {
        this.teacherNotes = this.teacherNotes.map(item => item.id === saved.id ? saved : item);
        delete this.pendingAction[note.id!];
        this.actionBusyId = null;
        this.toast.success('تم اعتماد الإجراء على التقرير');
      },
      error: error => {
        this.actionBusyId = null;
        this.toast.fromError(error);
      }
    });
  }

  clearReportAction(note: TeacherNote): void {
    if (!this.canTakeReportAction || note.id == null) return;
    this.actionBusyId = note.id;
    const updated: TeacherNote = {
      ...note,
      action: null,
      actionBy: null,
      actionAt: null
    };
    this.notesApi.saveNote(updated).subscribe({
      next: saved => {
        this.teacherNotes = this.teacherNotes.map(item => item.id === saved.id ? saved : item);
        this.pendingAction[note.id!] = null;
        this.actionBusyId = null;
      },
      error: error => {
        this.actionBusyId = null;
        this.toast.fromError(error);
      }
    });
  }

  noteDate(value: string): string {
    return formatFileDate(value);
  }

  private todayStamp(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    return `${y}-${m}-${d}`;
  }

  initials(name: string): string {
    const parts = name.replace(/^أ\.\s*/, '').trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) return parts[0].charAt(0) + parts[1].charAt(0);
    return parts[0]?.charAt(0) ?? '؟';
  }

  private loadAttendance(): void {
    const student = this.selected;
    const seq = ++this.attendanceSeq;
    this.absences = [];
    this.lates = [];
    if (!student?.id || !student.classId) {
      this.attendanceLoading = false;
      return;
    }

    this.attendanceLoading = true;
    const dates = this.recentSchoolDates(24);
    forkJoin(dates.map(date =>
      this.attendanceApi.getStudentAttendance(0, student.classId!, date, 0).pipe(
        catchError(() => of([] as AttendanceRecord[]))
      )
    )).subscribe({
      next: lists => {
        if (seq !== this.attendanceSeq) return;
        const mine = lists.flat().filter(row => row.personId === student.id);
        this.absences = mine
          .filter(row => row.status === 'ABSENT')
          .sort((a, b) => b.date.localeCompare(a.date));
        this.lates = mine
          .filter(row => row.status === 'LATE')
          .sort((a, b) => b.date.localeCompare(a.date));
        this.attendanceLoading = false;
      },
      error: () => {
        if (seq !== this.attendanceSeq) return;
        this.attendanceLoading = false;
        this.absences = [];
        this.lates = [];
      }
    });
  }

  /** Last N school days (Sun–Thu) on the school clock (UTC+3). */
  private recentSchoolDates(count: number): string[] {
    const dates: string[] = [];
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const y = Number(parts.find(p => p.type === 'year')?.value);
    const m = Number(parts.find(p => p.type === 'month')?.value);
    const d = Number(parts.find(p => p.type === 'day')?.value);
    const cursor = new Date(y, m - 1, d);
    while (dates.length < count) {
      const weekday = cursor.getDay();
      if (weekday !== 5 && weekday !== 6) {
        const yy = cursor.getFullYear();
        const mm = String(cursor.getMonth() + 1).padStart(2, '0');
        const dd = String(cursor.getDate()).padStart(2, '0');
        dates.push(`${yy}-${mm}-${dd}`);
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    return dates;
  }

  private behaviorTypeLabel(type: BehaviorNote['type']): string {
    switch (type) {
      case 'POSITIVE': return 'إيجابية';
      case 'NEGATIVE': return 'سلبية';
      case 'WARNING': return 'تنبيه';
      default: return type;
    }
  }

  private gender(value?: string): string {
    return value ? (GENDER_LABELS[value] ?? value) : '—';
  }

  private status(value?: string): string {
    return value ? (STUDENT_STATUS_LABELS[value] ?? value) : '—';
  }

  private dateLabel(value?: string): string {
    return formatFileDate(value);
  }
}
