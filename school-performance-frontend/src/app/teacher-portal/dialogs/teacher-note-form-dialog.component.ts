import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Observable, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { TeacherNote } from '../../core/models';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { AuthService } from '../../core/services/auth.service';
import { ScheduleApiService } from '../../class-schedule/services/schedule-api.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

const REPORT_ID = 'REPORT';

const NOTE_OPTIONS: { id: string; label: string; shortLabel: string; icon: string; tone: string }[] = [
  { id: 'TALKING', label: 'التحدث أثناء الحصة', shortLabel: 'الحديث', icon: 'comment', tone: 'talk' },
  { id: 'DISRUPT', label: 'عرقلة سير الحصة', shortLabel: 'العرقلة', icon: 'warning', tone: 'late' },
  { id: 'DISRESPECT', label: 'عدم احترام المعلم', shortLabel: 'الاحترام', icon: 'person', tone: 'hair' },
  { id: 'FIGHT', label: 'شجار أثناء الحصة', shortLabel: 'الشجار', icon: 'gavel', tone: 'assembly' },
  { id: 'NO_TOOLS', label: 'عدم إحضار الأدوات المدرسية', shortLabel: 'الأدوات', icon: 'construction', tone: 'uniform' },
  { id: 'NO_BOOK', label: 'عدم إحضار الكتاب أو الدفتر', shortLabel: 'الكتاب', icon: 'menu_book', tone: 'flag' },
  { id: 'SLEEP', label: 'النوم أثناء الحصة', shortLabel: 'النوم', icon: 'visibility_off', tone: 'sleep' },
  { id: REPORT_ID, label: 'إنشاء تقرير', shortLabel: 'التقرير', icon: 'edit_note', tone: 'report' }
];

@Component({
  selector: 'app-teacher-note-form-dialog',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogModule, AppDatePipe],
  styles: `
    :host { display: block; }
    .note-sheet {
      display: flex;
      min-width: min(480px, 80vw);
      flex-direction: column;
      gap: 1.85rem;
      padding: 0.35rem 0 0.65rem;
    }
    .note-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin: 0;
    }
    .note-meta div {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: #f8fafc;
      padding: 0.55rem 1.05rem;
    }
    .note-meta dt {
      margin: 0;
      color: var(--color-muted);
      font-size: 0.72rem;
      font-weight: 700;
    }
    .note-meta dd {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 800;
    }
    .note-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 1.35rem;
      row-gap: 1.35rem;
    }
    @media (max-width: 599px) {
      .note-fields { grid-template-columns: 1fr; }
    }
    .note-fields mat-form-field,
    .note-sheet > mat-form-field {
      width: 100%;
      margin: 0;
    }
    .note-block {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .note-section-label {
      margin: 0;
      color: var(--color-muted);
      font-size: 0.8rem;
      font-weight: 700;
    }
    .note-choices {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1rem;
    }
    @media (max-width: 599px) {
      .note-choices { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    .note-choice {
      display: inline-flex;
      min-height: 3.1rem;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      border: 1px solid var(--color-border);
      border-radius: 0.9rem;
      background: #fff;
      padding: 0.7rem 0.75rem;
      color: var(--color-text);
      font: inherit;
      font-size: 0.82rem;
      font-weight: 700;
      line-height: 1.3;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .note-choice:hover { background: #f8fafc; border-color: #c7d2fe; }
    .note-choice[data-tone="late"] { background: var(--color-warning); border-color: transparent; color: #fff; }
    .note-choice[data-tone="hair"] { background: #7c3aed; border-color: transparent; color: #fff; }
    .note-choice[data-tone="uniform"] { background: #2563eb; border-color: transparent; color: #fff; }
    .note-choice[data-tone="talk"] { background: #0891b2; border-color: transparent; color: #fff; }
    .note-choice[data-tone="flag"] { background: var(--color-success); border-color: transparent; color: #fff; }
    .note-choice[data-tone="assembly"] { background: var(--color-danger); border-color: transparent; color: #fff; }
    .note-choice[data-tone="sleep"] { background: var(--color-primary); border-color: transparent; color: #fff; }
    .note-choice[data-tone="report"] { background: var(--color-primary-mid); border-color: transparent; color: #fff; }
    .note-error {
      margin: 0;
      color: var(--sp-danger);
      font-size: 0.75rem;
    }
    .note-actions {
      display: grid !important;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      width: 100%;
      margin: 0 !important;
      padding: 1.35rem 1.7rem 1.5rem !important;
      border-top: 1px solid #eef2f7;
    }
    .note-actions button { width: 100%; min-height: 44px; }
  `,
  template: `
    <h2 mat-dialog-title>{{ data?.id ? 'تعديل ملاحظة' : 'ملاحظة جديدة' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="note-sheet" (ngSubmit)="save()">
        <dl class="note-meta">
          <div>
            <dt>الفصل</dt>
            <dd>{{ form.controls.className.value || '—' }}</dd>
          </div>
          <div>
            <dt>التاريخ</dt>
            <dd>{{ form.controls.noteDate.value | appDate }}</dd>
          </div>
        </dl>

        <div class="note-fields">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>اسم المتعلم</mat-label>
            <mat-select formControlName="studentName" cdkFocusInitial>
              @for (name of studentNames; track name) {
                <mat-option [value]="name">{{ name }}</mat-option>
              }
            </mat-select>
            @if (!studentNames.length) {
              <mat-hint>لا يوجد متعلمون في هذا الفصل</mat-hint>
            }
            <mat-error>اسم المتعلم مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>نوع الملاحظة</mat-label>
            <mat-select formControlName="noteType">
              <mat-option value="ACADEMIC">أكاديمية</mat-option>
              <mat-option value="BEHAVIOR">سلوكية</mat-option>
            </mat-select>
            <mat-error>نوع الملاحظة مطلوب</mat-error>
          </mat-form-field>
        </div>

        <div class="note-block">
          <p class="note-section-label">الملاحظة</p>
          <div class="note-choices" role="group" aria-label="الملاحظة">
            @for (option of noteOptions; track option.id) {
              <button
                type="button"
                class="note-choice"
                [attr.title]="option.label"
                [attr.aria-pressed]="chosen(option.id)"
                [attr.data-tone]="chosen(option.id) ? option.tone : null"
                (click)="toggle(option.id)">
                <app-ui-icon [name]="option.icon" class="size-4 text-[15px]"></app-ui-icon>
                {{ option.shortLabel }}
              </button>
            }
          </div>
          @if (form.controls.choices.invalid && form.controls.choices.touched) {
            <p class="note-error">اختر ملاحظة واحدة على الأقل</p>
          }
        </div>

        @if (reportOpen) {
          <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
            <mat-label>التقرير</mat-label>
            <textarea matInput formControlName="report" rows="3"></textarea>
            <mat-error>نص التقرير مطلوب</mat-error>
          </mat-form-field>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions class="note-actions">
      <button mat-stroked-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <app-ui-icon name="check"></app-ui-icon> حفظ
      </button>
    </mat-dialog-actions>
  `
})
export class TeacherNoteFormDialogComponent {
  readonly data: TeacherNote | null = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TeacherNoteFormDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly lookup = inject(AcademicLookupService);
  private readonly schedule = inject(ScheduleApiService);

  readonly noteOptions = NOTE_OPTIONS;
  studentNames: string[] = [];

  form = this.fb.nonNullable.group({
    studentName: ['', Validators.required],
    className: ['', Validators.required],
    noteType: ['ACADEMIC' as TeacherNote['noteType'], Validators.required],
    noteDate: [new Date(), Validators.required],
    choices: [[] as string[], Validators.required],
    report: ['']
  });

  get reportOpen(): boolean {
    return this.form.controls.choices.value.includes(REPORT_ID);
  }

  constructor() {
    const parsed = readNoteContent(this.data?.content ?? '');
    if (this.data) {
      this.form.patchValue({
        studentName: this.data.studentName ?? '',
        className: this.data.className ?? '',
        noteType: this.data.noteType ?? 'BEHAVIOR',
        choices: parsed.choices,
        report: parsed.report,
        ...(this.data.noteDate ? { noteDate: new Date(this.data.noteDate) } : {})
      });
    }
    this.syncReportValidator(parsed.choices);
    this.form.controls.className.disable();
    this.form.controls.noteDate.disable();
    this.form.controls.className.valueChanges.pipe(
      startWith(this.form.controls.className.value),
      switchMap(className => this.studentsOf(className))
    ).subscribe(names => this.applyNames(names));
  }

  private studentsOf(className: string): Observable<string[]> {
    const teacherId = this.auth.user()?.teacherId;
    const name = className.trim();
    if (!teacherId || !name) return of([]);
    return this.schedule.getEntries({ teacherId }).pipe(
      switchMap(entries => {
        const classId = entries.find(entry => entry.className === name)?.classId;
        if (!classId) return of([] as string[]);
        return this.lookup.getStudentsByClassId(classId).pipe(
          map(students => [...new Set(students.map(student => student.fullName.trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'ar')))
        );
      }),
      catchError(() => of([] as string[]))
    );
  }

  chosen(id: string): boolean {
    return this.form.controls.choices.value.includes(id);
  }

  toggle(id: string): void {
    const current = this.form.controls.choices.value;
    const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
    this.form.controls.choices.setValue(next);
    this.form.controls.choices.markAsTouched();
    if (!next.includes(REPORT_ID)) this.form.controls.report.setValue('');
    this.syncReportValidator(next);
  }

  private syncReportValidator(choices: string[]): void {
    const report = this.form.controls.report;
    if (choices.includes(REPORT_ID)) report.setValidators(Validators.required);
    else report.clearValidators();
    report.updateValueAndValidity();
  }

  private applyNames(names: string[]): void {
    const current = this.form.controls.studentName.value;
    const sameClass = this.form.controls.className.value === (this.data?.className ?? '');
    if (current && !names.includes(current) && sameClass) names = [current, ...names];
    if (current && !names.includes(current)) this.form.controls.studentName.setValue('');
    this.studentNames = names;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const noteDate = v.noteDate instanceof Date ? v.noteDate.toISOString().slice(0, 10) : String(v.noteDate);
    this.dialogRef.close({
      ...this.data,
      studentName: v.studentName,
      className: v.className,
      noteType: v.noteType,
      noteDate,
      content: composeNoteContent(v.choices, v.report),
      teacherName: this.data?.teacherName || this.auth.fullName()
    });
  }
}

function composeNoteContent(choices: string[], report: string): string {
  const labels = NOTE_OPTIONS.filter(option => option.id !== REPORT_ID && choices.includes(option.id)).map(option => option.label);
  if (!choices.includes(REPORT_ID)) return labels.join('، ');
  const written = `${NOTE_OPTIONS.find(option => option.id === REPORT_ID)?.label}: ${report.trim()}`;
  return labels.length ? `${labels.join('، ')}، ${written}` : written;
}

function readNoteContent(content: string): { choices: string[]; report: string } {
  const text = content.trim();
  if (!text) return { choices: [], report: '' };
  const marker = `${NOTE_OPTIONS.find(option => option.id === REPORT_ID)?.label}:`;
  const markerAt = text.indexOf(marker);
  const notesPart = (markerAt >= 0 ? text.slice(0, markerAt) : text).replace(/[،,]\s*$/, '');
  const report = markerAt >= 0 ? text.slice(markerAt + marker.length).trim() : '';
  const byLabel = new Map(NOTE_OPTIONS.filter(option => option.id !== REPORT_ID).map(option => [option.label, option.id]));
  const choices: string[] = [];
  const unknown: string[] = [];
  for (const part of notesPart.split(/[،,]/).map(item => item.trim()).filter(Boolean)) {
    const id = byLabel.get(part);
    if (id) choices.push(id);
    else unknown.push(part);
  }
  const leftover = [unknown.join('، '), report].filter(Boolean).join('\n');
  if (leftover) choices.push(REPORT_ID);
  if (!choices.length) return { choices: [REPORT_ID], report: text };
  return { choices, report: leftover };
}
