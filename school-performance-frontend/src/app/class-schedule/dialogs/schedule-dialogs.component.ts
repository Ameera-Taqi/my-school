import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ClassScheduleEntry, Department, ScheduleDay, Teacher } from '../../core/models';
import { CONSTRAINT_TYPE_LABELS, GenerateResult, Subject, SubjectAssignment, TeacherConstraint, TeacherConstraintType } from '../services/schedule-api.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

export const DAY_OPTIONS: { key: ScheduleDay; label: string }[] = [
  { key: 'SUNDAY', label: 'الأحد' }, { key: 'MONDAY', label: 'الإثنين' }, { key: 'TUESDAY', label: 'الثلاثاء' },
  { key: 'WEDNESDAY', label: 'الأربعاء' }, { key: 'THURSDAY', label: 'الخميس' }
];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];
const SHARED_IMPORTS = [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, UiIconComponent, MatSlideToggleModule];
const SHARED_STYLES = `
  .dialog-form { display: flex; flex-direction: column; gap: 0.35rem; padding-top: 0.5rem; }
  .full-width { width: 100%; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 0.75rem; }
  @media (max-width: 599px) { .two-col { grid-template-columns: 1fr; } }
  .ctx { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; margin: 0.25rem 0 0.75rem; padding: 0.6rem 0.85rem; background: var(--sp-primary-bg); border: 1px solid var(--sp-border); border-radius: 8px; color: var(--sp-primary); font-size: 0.88rem; font-weight: 600; }
  .ctx span { display: inline-flex; align-items: center; gap: 0.3rem; } .ctx .app-ui-icon { font-size: 1rem; }
  .opt-meta { color: var(--sp-text-muted); font-size: 0.8rem; margin-inline-start: 0.4rem; }
  .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-inline-end: 6px; vertical-align: middle; }
  .hint { color: var(--sp-text-muted); font-size: 0.82rem; margin: 0 0 0.5rem; }
`;

// ───────────────────────── Slot (manual placement) ─────────────────────────
export interface SlotDialogData { classId: number; className: string; dayOfWeek: ScheduleDay; period: number; entry?: ClassScheduleEntry | null; assignments: SubjectAssignment[]; }

@Component({
  selector: 'app-schedule-slot-dialog',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <h2 mat-dialog-title>{{ data.entry ? 'تعديل الحصة' : 'إضافة حصة' }}</h2>
    <mat-dialog-content>
      <div class="ctx">
        <span><app-ui-icon name="class"></app-ui-icon> فصل {{ data.className }}</span>
        <span><app-ui-icon name="today"></app-ui-icon> {{ dayLabel }}</span>
        <span><app-ui-icon name="schedule"></app-ui-icon> الحصة {{ data.period }}</span>
      </div>
      @if (!data.assignments.length) {
        <p class="hint">لا توجد تكليفات (مواد ومعلمون) لهذا الفصل بعد. أضفها من تبويب «المواد والتكليفات».</p>
      }
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>المادة والمعلم</mat-label>
          <mat-select formControlName="assignmentId" cdkFocusInitial>
            @for (a of data.assignments; track a.id) {
              <mat-option [value]="a.id">
                <span class="swatch" [style.background]="a.subjectColor || '#90a4ae'"></span>{{ a.subjectName }} — {{ a.teacherName }}
                <span class="opt-meta">{{ a.scheduled ?? 0 }}/{{ a.periodsPerWeek }}</span>
              </mat-option>
            }
          </mat-select>
          <mat-error>اختر المادة</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>القاعة (اختياري)</mat-label>
          <input matInput formControlName="room" autocomplete="off">
          <app-ui-icon name="meeting_room" matSuffix></app-ui-icon>
        </mat-form-field>
        <mat-slide-toggle formControlName="locked">تثبيت الحصة (لا يغيّرها التوليد التلقائي)</mat-slide-toggle>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data.entry) {
        <button mat-button type="button" color="warn" (click)="ref.close({ clear: true })"><app-ui-icon name="delete"></app-ui-icon> إخلاء الخانة</button>
      }
      <span style="flex:1"></span>
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()" [disabled]="!data.assignments.length"><app-ui-icon name="check"></app-ui-icon> حفظ</button>
    </mat-dialog-actions>
  `,
  styles: [SHARED_STYLES]
})
export class ScheduleSlotDialogComponent {
  readonly data: SlotDialogData = inject(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<ScheduleSlotDialogComponent>);
  private readonly fb = inject(FormBuilder);
  readonly dayLabel = DAY_OPTIONS.find(d => d.key === this.data.dayOfWeek)?.label ?? '';

  form = this.fb.group({
    assignmentId: [this.currentAssignmentId(), Validators.required],
    room: [this.data.entry?.room ?? ''],
    locked: [this.data.entry?.locked ?? true]
  });

  private currentAssignmentId(): number | null {
    const e = this.data.entry;
    if (!e) return null;
    return this.data.assignments.find(a => a.subjectId === e.subjectId && a.teacherId === e.teacherId)?.id ?? null;
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.ref.close({ assignmentId: v.assignmentId, room: v.room || undefined, locked: v.locked ?? true });
  }
}

// ───────────────────────── Subject ─────────────────────────
export interface SubjectDialogData { subject: Subject | null; departments: Department[]; }

@Component({
  selector: 'app-subject-dialog',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل مادة' : 'إضافة مادة' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>اسم المادة</mat-label>
          <input matInput formControlName="name" cdkFocusInitial autocomplete="off">
          <mat-error>اسم المادة مطلوب</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>الشعبة التابعة لها</mat-label>
          <mat-select formControlName="departmentId">
            <mat-option [value]="null">— بدون شعبة —</mat-option>
            @for (d of data.departments; track d.id) { <mat-option [value]="d.id">{{ d.name }}</mat-option> }
          </mat-select>
          <mat-hint>تظهر المادة ضمن مواد هذه الشعبة في صفحة الشعب الدراسية</mat-hint>
        </mat-form-field>
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>الرمز (اختياري)</mat-label>
            <input matInput formControlName="code" dir="ltr" autocomplete="off">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>اللون</mat-label>
            <input matInput type="color" formControlName="color" style="height:28px;padding:0;border:none;background:transparent;cursor:pointer">
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()"><app-ui-icon name="check"></app-ui-icon> حفظ</button>
    </mat-dialog-actions>
  `,
  styles: [SHARED_STYLES]
})
export class SubjectDialogComponent {
  readonly data: SubjectDialogData = inject(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<SubjectDialogComponent>);
  private readonly fb = inject(FormBuilder);
  form = this.fb.group({
    name: [this.data.subject?.name ?? '', Validators.required],
    departmentId: [this.data.subject?.departmentId ?? null as number | null],
    code: [this.data.subject?.code ?? ''],
    color: [this.data.subject?.color ?? '#1976d2']
  });
  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.ref.close({ ...this.data.subject, name: (v.name ?? '').trim(), departmentId: v.departmentId ?? null, code: (v.code ?? '').trim() || undefined, color: v.color ?? undefined, active: this.data.subject?.active ?? true } as Subject);
  }
}

// ───────────────────────── Assignment ─────────────────────────
export interface AssignmentDialogData { classId: number; className: string; subjects: Subject[]; teachers: Teacher[]; assignment?: SubjectAssignment | null; usedPeriods: number; }

@Component({
  selector: 'app-assignment-dialog',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <h2 mat-dialog-title>{{ data.assignment ? 'تعديل تكليف' : 'إضافة مادة للفصل' }}</h2>
    <mat-dialog-content>
      <div class="ctx"><span><app-ui-icon name="class"></app-ui-icon> فصل {{ data.className }}</span><span><app-ui-icon name="event_note"></app-ui-icon> المستخدم {{ data.usedPeriods }} من 35 حصة</span></div>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>المادة</mat-label>
          <mat-select formControlName="subjectId" cdkFocusInitial>
            @for (s of data.subjects; track s.id) { <mat-option [value]="s.id"><span class="swatch" [style.background]="s.color || '#90a4ae'"></span>{{ s.name }}</mat-option> }
          </mat-select>
          <mat-error>اختر المادة</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>المعلم</mat-label>
          <mat-select formControlName="teacherId">
            @for (t of data.teachers; track t.id) { <mat-option [value]="t.id">{{ t.fullName }} <span class="opt-meta">{{ t.specialization || '' }}</span></mat-option> }
          </mat-select>
          <mat-error>اختر المعلم</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>عدد الحصص في الأسبوع</mat-label>
          <input matInput type="number" min="1" max="35" formControlName="periodsPerWeek">
          <mat-hint>المتبقي في الفصل: {{ remaining }} حصة</mat-hint>
          @if (form.controls.periodsPerWeek.hasError('required')) { <mat-error>مطلوب</mat-error> }
          @if (form.controls.periodsPerWeek.hasError('min') || form.controls.periodsPerWeek.hasError('max')) { <mat-error>بين 1 و {{ remaining }}</mat-error> }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()"><app-ui-icon name="check"></app-ui-icon> حفظ</button>
    </mat-dialog-actions>
  `,
  styles: [SHARED_STYLES]
})
export class AssignmentDialogComponent {
  readonly data: AssignmentDialogData = inject(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<AssignmentDialogComponent>);
  private readonly fb = inject(FormBuilder);
  readonly remaining = 35 - this.data.usedPeriods + (this.data.assignment?.periodsPerWeek ?? 0);
  form = this.fb.group({
    subjectId: [this.data.assignment?.subjectId ?? null, Validators.required],
    teacherId: [this.data.assignment?.teacherId ?? null, Validators.required],
    periodsPerWeek: [this.data.assignment?.periodsPerWeek ?? 4, [Validators.required, Validators.min(1), Validators.max(this.remaining)]]
  });
  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.ref.close({ ...this.data.assignment, classId: this.data.classId, subjectId: v.subjectId!, teacherId: v.teacherId!, periodsPerWeek: Number(v.periodsPerWeek) } as SubjectAssignment);
  }
}

// ───────────────────────── Teacher constraint ─────────────────────────
export interface ConstraintDialogData { teachers: Teacher[]; teacherId?: number | null; }

@Component({
  selector: 'app-constraint-dialog',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <h2 mat-dialog-title>إضافة قيد لمعلم</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>المعلم</mat-label>
          <mat-select formControlName="teacherId" cdkFocusInitial>
            @for (t of data.teachers; track t.id) { <mat-option [value]="t.id">{{ t.fullName }}</mat-option> }
          </mat-select>
          <mat-error>اختر المعلم</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>نوع القيد</mat-label>
          <mat-select formControlName="type">
            @for (t of types; track t) { <mat-option [value]="t">{{ labels[t] }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <div class="two-col">
          @if (needsDay) {
            <mat-form-field appearance="outline">
              <mat-label>اليوم</mat-label>
              <mat-select formControlName="dayOfWeek">
                @for (d of days; track d.key) { <mat-option [value]="d.key">{{ d.label }}</mat-option> }
              </mat-select>
              <mat-error>اختر اليوم</mat-error>
            </mat-form-field>
          }
          @if (needsPeriod) {
            <mat-form-field appearance="outline">
              <mat-label>الحصة</mat-label>
              <mat-select formControlName="period">
                @for (p of periods; track p) { <mat-option [value]="p">الحصة {{ p }}</mat-option> }
              </mat-select>
              <mat-error>اختر الحصة</mat-error>
            </mat-form-field>
          }
          @if (needsValue) {
            <mat-form-field appearance="outline">
              <mat-label>الحد الأقصى في اليوم</mat-label>
              <mat-select formControlName="value">
                @for (p of periods; track p) { <mat-option [value]="p">{{ p }} حصص</mat-option> }
              </mat-select>
              <mat-error>حدد الحد الأقصى</mat-error>
            </mat-form-field>
          }
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>ملاحظة (اختياري)</mat-label>
          <input matInput formControlName="note" autocomplete="off">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()"><app-ui-icon name="check"></app-ui-icon> إضافة القيد</button>
    </mat-dialog-actions>
  `,
  styles: [SHARED_STYLES]
})
export class ConstraintDialogComponent {
  readonly data: ConstraintDialogData = inject(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<ConstraintDialogComponent>);
  private readonly fb = inject(FormBuilder);
  readonly labels = CONSTRAINT_TYPE_LABELS;
  readonly types = Object.keys(CONSTRAINT_TYPE_LABELS) as TeacherConstraintType[];
  readonly days = DAY_OPTIONS;
  readonly periods = PERIODS;

  form = this.fb.group({
    teacherId: [this.data.teacherId ?? null, Validators.required],
    type: ['UNAVAILABLE_DAY' as TeacherConstraintType, Validators.required],
    dayOfWeek: [null as ScheduleDay | null],
    period: [null as number | null],
    value: [null as number | null],
    note: ['']
  });

  get type(): TeacherConstraintType { return this.form.controls.type.value ?? 'UNAVAILABLE_DAY'; }
  get needsDay(): boolean { return this.type === 'UNAVAILABLE_DAY' || this.type === 'UNAVAILABLE_SLOT'; }
  get needsPeriod(): boolean { return this.type === 'UNAVAILABLE_PERIOD' || this.type === 'UNAVAILABLE_SLOT'; }
  get needsValue(): boolean { return this.type === 'MAX_PERIODS_PER_DAY'; }

  save(): void {
    const v = this.form.getRawValue();
    const missing = (this.needsDay && !v.dayOfWeek) || (this.needsPeriod && !v.period) || (this.needsValue && !v.value);
    if (this.form.invalid || missing) { this.form.markAllAsTouched(); return; }
    this.ref.close({
      teacherId: v.teacherId!, type: this.type,
      dayOfWeek: this.needsDay ? v.dayOfWeek : null,
      period: this.needsPeriod ? v.period : null,
      value: this.needsValue ? v.value : null,
      note: v.note || null
    } as TeacherConstraint);
  }
}

// ───────────────────────── Generation result ─────────────────────────
@Component({
  selector: 'app-generate-result-dialog',
  standalone: true,
  imports: [UiIconComponent, MatDialogModule, MatButtonModule],
  template: `
    <div class="result" [class.ok]="data.success">
      <div class="result-icon"><app-ui-icon [name]="data.success ? 'check_circle' : 'warning'"></app-ui-icon></div>
      <h2 mat-dialog-title>{{ data.success ? 'تم توليد الجدول بنجاح' : 'تم التوليد مع نواقص' }}</h2>
      <mat-dialog-content>
        <div class="stats">
          <div><strong>{{ data.placedLessons }}</strong><span>حصة موزّعة</span></div>
          <div><strong>{{ data.requiredLessons }}</strong><span>حصة مطلوبة</span></div>
          <div><strong>{{ data.classesCount }}</strong><span>فصل</span></div>
          <div><strong>{{ data.durationMs }}<small>ms</small></strong><span>زمن الحل</span></div>
        </div>
        @if (data.warnings.length) {
          <h4>تنبيهات</h4>
          <ul class="warn">@for (w of data.warnings; track w) { <li>{{ w }}</li> }</ul>
        }
        @if (data.unplaced.length) {
          <h4>حصص لم يمكن توزيعها</h4>
          <table class="unplaced">
            <thead><tr><th>الفصل</th><th>المادة</th><th>المعلم</th><th>الناقص</th><th>السبب</th></tr></thead>
            <tbody>@for (u of data.unplaced; track u.className + u.subjectName) { <tr><td>{{ u.className }}</td><td>{{ u.subjectName }}</td><td>{{ u.teacherName }}</td><td>{{ u.missing }}</td><td>{{ u.reason }}</td></tr> }</tbody>
          </table>
          <p class="tip"><app-ui-icon name="lightbulb"></app-ui-icon> راجع قيود المعلم أو وزّع المادة على معلم آخر ثم أعد التوليد.</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end"><button mat-flat-button color="primary" type="button" (click)="ref.close()">حسناً</button></mat-dialog-actions>
    </div>
  `,
  styles: [`
    .result { min-width: 360px; max-width: 640px; }
    .result-icon { width: 56px; height: 56px; border-radius: 50%; margin: 1rem auto 0; display: flex; align-items: center; justify-content: center; background: var(--sp-warning-bg); color: var(--sp-warning); app-ui-icon { font-size: 30px; width: 30px; height: 30px; } }
    .ok .result-icon { background: var(--sp-success-bg); color: var(--sp-success); }
    h2 { text-align: center; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin: 0.5rem 0 1rem; }
    .stats div { display: flex; flex-direction: column; align-items: center; padding: 0.6rem; background: #f8f9fc; border-radius: 10px; }
    .stats strong { font-size: 1.3rem; color: var(--sp-primary); small { font-size: 0.7rem; margin-inline-start: 2px; } }
    .stats span { font-size: 0.75rem; color: var(--sp-text-muted); }
    h4 { margin: 0.75rem 0 0.35rem; font-size: 0.9rem; }
    .warn { margin: 0; padding-inline-start: 1.2rem; color: var(--sp-warning); font-size: 0.88rem; }
    .unplaced { width: 100%; border-collapse: collapse; font-size: 0.85rem; th, td { padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--sp-border); text-align: start; } th { color: var(--sp-text-muted); font-weight: 600; } }
    .tip { display: flex; align-items: center; gap: 0.4rem; color: var(--sp-text-muted); font-size: 0.82rem; margin: 0.75rem 0 0; app-ui-icon { font-size: 18px; width: 18px; height: 18px; color: #f9a825; } }
    @media (max-width: 599px) { .stats { grid-template-columns: repeat(2, 1fr); } .result { min-width: 0; } }
  `]
})
export class GenerateResultDialogComponent {
  readonly data: GenerateResult = inject(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<GenerateResultDialogComponent>);
}
