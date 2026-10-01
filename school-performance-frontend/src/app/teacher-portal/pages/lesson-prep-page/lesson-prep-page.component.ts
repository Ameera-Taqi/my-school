import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { UiIconComponent } from '../../../shared/icons/ui-icon.component';
import { AuthService } from '../../../core/services/auth.service';
import { ClassScheduleEntry, LessonPrep } from '../../../core/models';
import { ScheduleApiService } from '../../../class-schedule/services/schedule-api.service';
import { LessonPrepMockService } from '../../services/lesson-prep-mock.service';
import { PrepApprovalService } from '../../services/prep-approval.service';
import { LessonPrepFormDialogComponent } from '../../dialogs/lesson-prep-form-dialog.component';
import { PrepApprovalSubmitDialogComponent, PrepApprovalSubmitResult } from '../../dialogs/prep-approval-submit-dialog.component';

interface StageCard {
  name: string;
  countLabel: string;
}

interface LessonSlot {
  lessonNumber: number;
  title: string;
  subject: string;
  stageName: string;
  fileName: string;
  prep?: LessonPrep;
}

@Component({
  selector: 'app-lesson-prep-page',
  standalone: true,
  imports: [
    FormsModule,
    UiIconComponent,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule,
    PageHeaderComponent,
    SearchFieldComponent,
    EmptyStateComponent,
    TableSkeletonComponent
  ],
  templateUrl: './lesson-prep-page.component.html',
  styles: `
    .stage-card {
      --col: var(--color-primary);
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      border: 1px solid var(--color-border);
      border-top: 4px solid var(--col);
      border-radius: 1rem;
      background: var(--color-surface);
      padding: 1rem 1.1rem;
      color: var(--color-text);
      text-align: start;
      cursor: pointer;
      box-shadow: 0 4px 20px rgb(0 0 0 / 0.03);
    }
    .stage-card:nth-child(5n + 2) { --col: var(--color-warning); }
    .stage-card:nth-child(5n + 3) { --col: var(--color-success); }
    .stage-card:nth-child(5n + 4) { --col: var(--color-primary-mid); }
    .stage-card:nth-child(5n + 5) { --col: var(--color-danger); }
    .stage-card--active {
      border-color: var(--col);
      background: var(--color-primary-bg);
    }
    .prep-toolbar { align-items: center; }
    .prep-count {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      height: 42px;
      margin: 0;
      padding: 0 0.85rem;
      border: 1px solid var(--color-border);
      border-radius: 0.75rem;
      background: #fff;
      color: var(--color-muted);
      font-size: 0.82rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .prep-count input {
      width: 3.5rem;
      border: 0;
      background: transparent;
      color: var(--color-text);
      font-size: 0.95rem;
      font-weight: 800;
      text-align: center;
    }
    .prep-count input:focus { outline: none; }
    .stage-card__name { font-size: 1.05rem; font-weight: 800; }
    .stage-card__count { font-size: 0.85rem; font-weight: 700; color: var(--color-muted); }
    .icon-view:not(:disabled) { color: #2563eb; --mdc-icon-button-icon-color: #2563eb; }
    .icon-upload:not(:disabled) { color: var(--color-success); --mdc-icon-button-icon-color: var(--color-success); }
    .icon-edit:not(:disabled) { color: var(--color-warning); --mdc-icon-button-icon-color: var(--color-warning); }
    .icon-send:not(:disabled) { color: var(--color-primary); --mdc-icon-button-icon-color: var(--color-primary); }
    .icon-delete:not(:disabled) { color: var(--color-danger); --mdc-icon-button-icon-color: var(--color-danger); }
  `
})
export class LessonPrepPageComponent implements OnInit, AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly schedule = inject(ScheduleApiService);
  private readonly service = inject(LessonPrepMockService);
  private readonly approvals = inject(PrepApprovalService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  @ViewChild(MatPaginator) set paginatorRef(paginator: MatPaginator | undefined) {
    this.paginator = paginator;
    this.attachTableControls();
  }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(sort: MatSort | undefined) {
    this.sort = sort;
    this.attachTableControls();
  }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<LessonSlot>([]);
  cols = ['lesson', 'subject', 'file', 'actions'];
  loading = true;
  query = '';
  stages: StageCard[] = [];
  stageSubjects: string[] = [];
  selectedStage = '';
  selectedSubject = '';
  plannedCount = 24;
  private entries: ClassScheduleEntry[] = [];
  private preps: LessonPrep[] = [];

  get teacherId(): number | null {
    return this.auth.user()?.teacherId ?? null;
  }

  get filteredCount(): number {
    return this.dataSource.filteredData.length;
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (row, filter) =>
      [String(row.lessonNumber), row.title, row.subject, row.stageName, row.fileName]
        .join(' ')
        .toLowerCase()
        .includes(filter);
    this.auth.refreshCurrentUser().subscribe({
      next: () => this.load(),
      error: () => this.load()
    });
  }

  ngAfterViewInit(): void {
    this.attachTableControls();
  }

  selectStage(name: string): void {
    this.selectedStage = this.selectedStage === name ? '' : name;
    this.syncSubject();
    this.applyStage();
  }

  onSubjectChange(): void {
    this.plannedCount = this.selectedSubject && this.selectedStage
      ? this.service.plannedCount(this.selectedSubject, this.selectedStage)
      : 24;
    this.applyStage();
  }

  saveCount(): void {
    if (!this.selectedSubject || !this.selectedStage) return;
    this.plannedCount = this.service.setPlannedCount(this.selectedSubject, this.selectedStage, this.plannedCount);
    this.stages = this.buildStages(this.entries, this.preps);
    this.applyStage();
  }

  onSearch(query: string): void {
    this.query = query;
    this.dataSource.filter = query.toLowerCase();
    this.paginator?.firstPage();
  }

  openUpload(row: LessonSlot): void {
    const stageName = row.stageName || this.selectedStage;
    const subject = row.subject || this.selectedSubject;
    if (!stageName || !subject) return;
    const ref = this.dialog.open(LessonPrepFormDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: {
        stageName,
        lockedSubject: subject,
        lessonNumber: row.lessonNumber,
        stages: [{ stageName, subject }],
        initialTitle: row.prep?.title || `الدرس ${row.lessonNumber}`,
        initialDescription: row.prep?.description,
        existingFileName: row.prep?.fileName
      }
    });
    ref.afterClosed().subscribe((result: Omit<LessonPrep, 'id' | 'teacherName'> | undefined) => {
      if (!result) return;
      this.service.create({ ...result, teacherName: this.auth.fullName() }).subscribe({
        next: () => {
          this.toast.success(row.prep ? 'تم تحديث التحضير' : 'تم رفع التحضير');
          this.load();
        },
        error: error => this.toast.fromError(error)
      });
    });
  }

  download(prep: LessonPrep | undefined): void {
    if (prep) this.service.download(prep);
  }

  approvalText(row: LessonSlot): string {
    return row.prep?.id ? this.approvals.summary(row.prep.id) : '';
  }

  canSend(row: LessonSlot): boolean {
    const prep = row.prep;
    if (!prep?.id || !prep.fileName) return false;
    return !this.approvals.hasPending(prep.id, 'DEPARTMENT') || !this.approvals.hasPending(prep.id, 'ADMINISTRATION');
  }

  sendForApproval(row: LessonSlot): void {
    const prep = row.prep;
    if (!prep?.id) return;
    const pending = (['DEPARTMENT', 'ADMINISTRATION'] as const).filter(authority => this.approvals.hasPending(prep.id!, authority));
    const ref = this.dialog.open(PrepApprovalSubmitDialogComponent, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      panelClass: 'sp-prep-approval-dialog',
      autoFocus: false,
      data: { title: `${row.lessonNumber} — ${row.title}`, pending }
    });
    ref.afterClosed().subscribe((result: PrepApprovalSubmitResult | undefined) => {
      if (!result) return;
      this.approvals.submit(prep, result.authority, result.note).subscribe({
        next: () => {
          this.toast.success('أُرسل التحضير للاعتماد');
          this.applyStage();
        },
        error: error => this.toast.fromError(error)
      });
    });
  }

  remove(row: LessonSlot): void {
    const prep = row.prep;
    if (!prep?.id) return;
    this.confirm.deleteConfirmed(prep.title, 'التحضير').subscribe(() => {
      this.service.delete(prep.id!).subscribe({
        next: () => {
          this.toast.success('تم حذف التحضير');
          this.load();
        },
        error: error => this.toast.fromError(error)
      });
    });
  }

  private load(): void {
    const teacherId = this.teacherId;
    this.loading = true;
    forkJoin({
      entries: teacherId
        ? this.schedule.getEntries({ teacherId }).pipe(catchError(() => of([] as ClassScheduleEntry[])))
        : of([] as ClassScheduleEntry[]),
      preps: this.service.getMine().pipe(catchError(() => of([] as LessonPrep[])))
    }).subscribe({
      next: ({ entries, preps }) => {
        this.entries = entries;
        this.preps = preps;
        this.stages = this.buildStages(entries, preps);
        if (this.selectedStage && !this.stages.some(stage => stage.name === this.selectedStage)) {
          this.selectedStage = '';
        }
        this.syncSubject();
        this.applyStage();
        this.loading = false;
        setTimeout(() => this.attachTableControls());
      },
      error: error => {
        this.loading = false;
        this.toast.fromError(error);
      }
    });
  }

  private buildStages(entries: ClassScheduleEntry[], preps: LessonPrep[]): StageCard[] {
    const order: string[] = [];
    const seen = new Set<string>();
    const ranked = [...entries].sort((a, b) => (a.stageId ?? 0) - (b.stageId ?? 0));
    for (const entry of ranked) {
      const name = entry.stageName?.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      order.push(name);
    }
    for (const prep of preps) {
      if (!prep.stageName || seen.has(prep.stageName)) continue;
      seen.add(prep.stageName);
      order.push(prep.stageName);
    }
    return order.map(name => ({ name, countLabel: this.stageCountLabel(name, preps) }));
  }

  private subjectsFor(stageName: string): string[] {
    const fromSchedule = this.entries
      .filter(entry => entry.stageName?.trim() === stageName && entry.subject)
      .map(entry => entry.subject as string);
    const fromPreps = this.preps
      .filter(prep => prep.stageName?.trim() === stageName && prep.subject)
      .map(prep => prep.subject);
    return [...new Set([...fromSchedule, ...fromPreps])];
  }

  private syncSubject(): void {
    if (!this.selectedStage) {
      this.stageSubjects = [];
      this.selectedSubject = '';
      this.plannedCount = 24;
      return;
    }
    this.stageSubjects = this.subjectsFor(this.selectedStage);
    if (!this.stageSubjects.includes(this.selectedSubject)) {
      this.selectedSubject = this.stageSubjects[0] ?? '';
    }
    this.plannedCount = this.selectedSubject
      ? this.service.plannedCount(this.selectedSubject, this.selectedStage)
      : 1;
  }

  private stageCountLabel(stageName: string, preps: LessonPrep[]): string {
    const subjects = this.subjectsFor(stageName);
    const uploaded = preps.filter(prep => prep.stageName?.trim() === stageName && prep.lessonNumber && prep.fileName).length;
    if (subjects.length === 1) {
      const planned = this.service.plannedCount(subjects[0], stageName);
      return `${uploaded} من ${planned}`;
    }
    return `${uploaded} تحضير`;
  }

  private applyStage(): void {
    if (!this.selectedStage || !this.selectedSubject) {
      this.dataSource.data = [];
      return;
    }
    const matching = this.preps.filter(prep =>
      prep.stageName?.trim() === this.selectedStage
      && prep.subject === this.selectedSubject
      && prep.lessonNumber);
    const rows: LessonSlot[] = [];
    for (let lessonNumber = 1; lessonNumber <= this.plannedCount; lessonNumber++) {
      const prep = matching.find(item => item.lessonNumber === lessonNumber);
      rows.push({
        lessonNumber,
        title: prep?.title || `الدرس ${lessonNumber}`,
        subject: this.selectedSubject,
        stageName: this.selectedStage,
        fileName: prep?.fileName || '',
        prep
      });
    }
    this.dataSource.data = rows;
    this.dataSource.filter = this.query.toLowerCase();
    this.paginator?.firstPage();
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
