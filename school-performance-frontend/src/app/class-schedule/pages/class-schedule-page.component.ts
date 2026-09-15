import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { AuthService } from '../../core/services/auth.service';
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { DepartmentApiService } from '../../departments/services/department-api.service';
import { ClassScheduleEntry, SchoolClass, ScheduleDay, Teacher, Department } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';
import {
  CONSTRAINT_TYPE_LABELS, ScheduleApiService, ScheduleOverview, Subject, SubjectAssignment, TeacherConstraint
} from '../services/schedule-api.service';
import {
  AssignmentDialogComponent, ConstraintDialogComponent, DAY_OPTIONS, GenerateResultDialogComponent,
  ScheduleSlotDialogComponent, SubjectDialogComponent
} from '../dialogs/schedule-dialogs.component';

@Component({
  selector: 'app-class-schedule-page',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatButtonModule, MatTooltipModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatCardModule, MatTabsModule, MatMenuModule, MatButtonToggleModule, MatProgressBarModule, MatTableModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './class-schedule-page.component.html',
  styleUrl: './class-schedule-page.component.scss'
})
export class ClassSchedulePageComponent implements OnInit {
  private readonly api = inject(ScheduleApiService);
  private readonly lookup = inject(AcademicLookupService);
  private readonly departmentApi = inject(DepartmentApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly canManage = () => this.authService.hasPermission('class_schedule.manage');
  readonly days = DAY_OPTIONS;
  readonly periods = [1, 2, 3, 4, 5, 6, 7];
  readonly constraintLabels: Record<string, string> = CONSTRAINT_TYPE_LABELS;

  classes: SchoolClass[] = [];
  teachers: Teacher[] = [];
  departments: Department[] = [];
  subjects: Subject[] = [];
  assignments: SubjectAssignment[] = [];
  constraints: TeacherConstraint[] = [];
  entries: ClassScheduleEntry[] = [];
  overview: ScheduleOverview | null = null;

  loading = true;
  gridLoading = false;
  generating = false;
  mode: 'class' | 'teacher' = 'class';
  private entryMap = new Map<string, ClassScheduleEntry>();

  filter = this.fb.group({
    classId: [null as number | null],
    teacherId: [null as number | null]
  });
  constraintTeacherId: number | null = null;
  assignmentCols = ['subject', 'teacher', 'periods', 'scheduled', 'actions'];
  constraintCols = ['teacher', 'description', 'note', 'actions'];

  // ───────── derived ─────────
  get selectedClass(): SchoolClass | undefined { return this.classes.find(c => c.id === this.filter.controls.classId.value); }
  get selectedTeacher(): Teacher | undefined { return this.teachers.find(t => t.id === this.filter.controls.teacherId.value); }
  get classAssignments(): SubjectAssignment[] { const id = this.filter.controls.classId.value; return this.assignments.filter(a => a.classId === id); }
  get classRequired(): number { return this.classAssignments.reduce((n, a) => n + a.periodsPerWeek, 0); }
  get filledCount(): number { return this.entries.length; }
  get totalSlots(): number { return 35; }
  get visibleConstraints(): TeacherConstraint[] { return this.constraintTeacherId ? this.constraints.filter(c => c.teacherId === this.constraintTeacherId) : this.constraints; }
  get classSummary() { return this.overview?.classes.find(c => c.classId === this.filter.controls.classId.value); }

  ngOnInit(): void {
    forkJoin({ classes: this.lookup.getAllClasses(), teachers: this.lookup.getAllTeachers(), departments: this.departmentApi.getAll() }).subscribe({
      next: ({ classes, teachers, departments }) => {
        this.classes = classes;
        this.teachers = teachers;
        this.departments = departments;
        if (classes.length) this.filter.controls.classId.setValue(classes[0].id!, { emitEvent: false });
        if (teachers.length) this.filter.controls.teacherId.setValue(teachers[0].id!, { emitEvent: false });
        this.loadAll();
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
    this.filter.controls.classId.valueChanges.subscribe(() => this.loadGrid());
    this.filter.controls.teacherId.valueChanges.subscribe(() => { if (this.mode === 'teacher') this.loadGrid(); });
  }

  loadAll(): void {
    this.loading = true;
    forkJoin({
      subjects: this.api.getSubjects(),
      assignments: this.api.getAssignments(),
      constraints: this.api.getConstraints(),
      overview: this.api.getOverview()
    }).subscribe({
      next: (r) => { this.subjects = r.subjects; this.assignments = r.assignments; this.constraints = r.constraints; this.overview = r.overview; this.loading = false; this.loadGrid(); },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  setMode(mode: 'class' | 'teacher'): void { this.mode = mode; this.loadGrid(); }

  loadGrid(): void {
    const filter = this.mode === 'class' ? { classId: this.filter.controls.classId.value ?? undefined } : { teacherId: this.filter.controls.teacherId.value ?? undefined };
    if (!filter.classId && !filter.teacherId) { this.entries = []; this.entryMap.clear(); return; }
    this.gridLoading = true;
    this.api.getEntries(filter).subscribe({
      next: (data) => {
        this.entries = data;
        this.entryMap = new Map(data.map(e => [`${e.dayOfWeek}-${e.period}`, e]));
        this.gridLoading = false;
      },
      error: (e) => { this.gridLoading = false; this.toast.fromError(e); }
    });
  }

  entryAt(day: ScheduleDay, period: number): ClassScheduleEntry | undefined { return this.entryMap.get(`${day}-${period}`); }

  // ───────── timetable editing ─────────
  openSlot(day: ScheduleDay, period: number, entry?: ClassScheduleEntry): void {
    if (!this.canManage() || this.mode !== 'class') return;
    const cls = this.selectedClass;
    if (!cls?.id) return;
    const ref = this.dialog.open(ScheduleSlotDialogComponent, {
      width: '460px', maxWidth: '95vw',
      data: { classId: cls.id, className: cls.name, dayOfWeek: day, period, entry: entry ?? null, assignments: this.classAssignments }
    });
    ref.afterClosed().subscribe((result?: { clear?: boolean; assignmentId?: number; room?: string; locked?: boolean }) => {
      if (!result) return;
      this.api.setSlot({ classId: cls.id!, dayOfWeek: day, period, assignmentId: result.clear ? null : result.assignmentId!, room: result.room, locked: result.locked ?? true }).subscribe({
        next: () => { this.toast.success(result.clear ? 'تم إخلاء الخانة' : 'تم حفظ الحصة'); this.refreshAfterChange(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  generate(): void {
    if (!this.assignments.length) { this.toast.info('أضف المواد والتكليفات للفصول أولاً'); return; }
    this.confirm.confirmed({
      title: 'توليد الجدول تلقائياً',
      message: 'سيتم توزيع حصص جميع الفصول حسب التكليفات وقيود المعلمين. الحصص المثبّتة يدوياً تبقى مكانها، وتُستبدل بقية الحصص.',
      confirmText: 'ابدأ التوليد', icon: 'auto_awesome'
    }).subscribe(() => {
      this.generating = true;
      this.api.generate({ keepLocked: true }).subscribe({
        next: (result) => {
          this.generating = false;
          this.dialog.open(GenerateResultDialogComponent, { data: result, width: '640px', maxWidth: '95vw'});
          this.refreshAfterChange();
        },
        error: (e) => { this.generating = false; this.toast.fromError(e); }
      });
    });
  }

  clearSchedule(all: boolean): void {
    const cls = this.selectedClass;
    this.confirm.confirmed({
      title: all ? 'مسح جدول كل الفصول' : `مسح جدول فصل ${cls?.name ?? ''}`,
      message: 'سيتم حذف الحصص غير المثبّتة. الحصص المثبّتة يدوياً تبقى.', confirmText: 'مسح', danger: true, icon: 'delete_sweep'
    }).subscribe(() => {
      this.api.clear(all ? undefined : cls?.id, false).subscribe({
        next: (r) => { this.toast.success(`تم حذف ${r.count} حصة`); this.refreshAfterChange(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  // ───────── subjects ─────────
  openSubject(subject?: Subject): void {
    const ref = this.dialog.open(SubjectDialogComponent, { data: { subject: subject ?? null, departments: this.departments }, width: '460px', maxWidth: '95vw'});
    ref.afterClosed().subscribe((result?: Subject) => {
      if (!result) return;
      const req$ = subject?.id ? this.api.updateSubject(subject.id, result) : this.api.createSubject(result);
      req$.subscribe({ next: () => { this.toast.success('تم حفظ المادة'); this.loadAll(); }, error: (e) => this.toast.fromError(e) });
    });
  }

  deleteSubject(subject: Subject): void {
    this.confirm.deleteConfirmed(subject.name, 'المادة').subscribe(() => {
      this.api.deleteSubject(subject.id!).subscribe({ next: () => { this.toast.success('تم حذف المادة'); this.loadAll(); }, error: (e) => this.toast.fromError(e) });
    });
  }

  // ───────── assignments ─────────
  openAssignment(assignment?: SubjectAssignment): void {
    const cls = this.selectedClass;
    if (!cls?.id) return;
    if (!this.subjects.length) { this.toast.info('أضف المواد أولاً'); return; }
    const ref = this.dialog.open(AssignmentDialogComponent, {
      width: '480px', maxWidth: '95vw',
      data: { classId: cls.id, className: cls.name, subjects: this.subjects, teachers: this.teachers, assignment: assignment ?? null, usedPeriods: this.classRequired }
    });
    ref.afterClosed().subscribe((result?: SubjectAssignment) => {
      if (!result) return;
      const req$ = assignment?.id ? this.api.updateAssignment(assignment.id, result) : this.api.createAssignment(result);
      req$.subscribe({ next: () => { this.toast.success('تم حفظ التكليف'); this.loadAll(); }, error: (e) => this.toast.fromError(e) });
    });
  }

  deleteAssignment(a: SubjectAssignment): void {
    this.confirm.deleteConfirmed(`${a.subjectName} — ${a.teacherName}`, 'التكليف').subscribe(() => {
      this.api.deleteAssignment(a.id!).subscribe({ next: () => { this.toast.success('تم حذف التكليف'); this.loadAll(); }, error: (e) => this.toast.fromError(e) });
    });
  }

  // ───────── constraints ─────────
  openConstraint(): void {
    const ref = this.dialog.open(ConstraintDialogComponent, { width: '480px', maxWidth: '95vw', data: { teachers: this.teachers, teacherId: this.constraintTeacherId } });
    ref.afterClosed().subscribe((result?: TeacherConstraint) => {
      if (!result) return;
      this.api.createConstraint(result).subscribe({ next: () => { this.toast.success('تمت إضافة القيد'); this.loadAll(); }, error: (e) => this.toast.fromError(e) });
    });
  }

  deleteConstraint(c: TeacherConstraint): void {
    this.confirm.deleteConfirmed(`${c.teacherName}: ${c.description}`, 'القيد').subscribe(() => {
      this.api.deleteConstraint(c.id!).subscribe({ next: () => { this.toast.success('تم حذف القيد'); this.loadAll(); }, error: (e) => this.toast.fromError(e) });
    });
  }

  teacherConstraintCount(teacherId: number): number { return this.constraints.filter(c => c.teacherId === teacherId).length; }

  private refreshAfterChange(): void {
    forkJoin({ assignments: this.api.getAssignments(), overview: this.api.getOverview() }).subscribe(r => { this.assignments = r.assignments; this.overview = r.overview; this.loadGrid(); });
  }
}
