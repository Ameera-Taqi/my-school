import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { UiIconComponent } from '../../../shared/icons/ui-icon.component';
import { AuthService } from '../../../core/services/auth.service';
import { ClassScheduleEntry, LessonPrep } from '../../../core/models';
import { ScheduleApiService } from '../../../class-schedule/services/schedule-api.service';
import { LessonPrepMockService } from '../../services/lesson-prep-mock.service';
import { LessonPrepFormDialogComponent, LessonPrepStageOption } from '../../dialogs/lesson-prep-form-dialog.component';

interface StageCard {
  name: string;
  count: number;
}

@Component({
  selector: 'app-lesson-prep-page',
  standalone: true,
  imports: [
    UiIconComponent,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatDialogModule,
    PageHeaderComponent,
    SearchFieldComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    AppDatePipe
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
    .stage-card__name { font-size: 1.05rem; font-weight: 800; }
    .stage-card__count { font-size: 0.85rem; font-weight: 700; color: var(--color-muted); }
  `
})
export class LessonPrepPageComponent implements OnInit, AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly schedule = inject(ScheduleApiService);
  private readonly service = inject(LessonPrepMockService);
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

  readonly dataSource = new MatTableDataSource<LessonPrep>([]);
  cols = ['lessonDate', 'title', 'subject', 'actions'];
  loading = true;
  query = '';
  stages: StageCard[] = [];
  selectedStage = '';
  private entries: ClassScheduleEntry[] = [];
  private preps: LessonPrep[] = [];

  get teacherId(): number | null {
    return this.auth.user()?.teacherId ?? null;
  }

  get total(): number {
    return this.dataSource.data.length;
  }

  get filteredCount(): number {
    return this.dataSource.filteredData.length;
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (prep, filter) =>
      [prep.title, prep.className, prep.subject, prep.fileName ?? '', prep.lessonDate]
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
    this.selectedStage = name;
    this.applyStage();
  }

  onSearch(query: string): void {
    this.query = query;
    this.dataSource.filter = query.toLowerCase();
    this.paginator?.firstPage();
  }

  openDialog(): void {
    if (!this.selectedStage) return;
    const ref = this.dialog.open(LessonPrepFormDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: { stageName: this.selectedStage, stages: this.stageOptions() }
    });
    ref.afterClosed().subscribe((result: Omit<LessonPrep, 'id' | 'teacherName'> | undefined) => {
      if (!result) return;
      this.service.create({ ...result, teacherName: this.auth.fullName() }).subscribe({
        next: created => {
          this.toast.success('تم رفع التحضير');
          this.selectedStage = created.stageName;
          this.load();
        },
        error: error => this.toast.fromError(error)
      });
    });
  }

  download(prep: LessonPrep): void {
    this.service.download(prep);
  }

  remove(prep: LessonPrep): void {
    if (!prep.id) return;
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
        if (!this.stages.some(stage => stage.name === this.selectedStage)) {
          this.selectedStage = this.stages[0]?.name ?? '';
        }
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
    return order.map(name => ({
      name,
      count: preps.filter(prep => prep.stageName === name).length
    }));
  }

  private stageOptions(): LessonPrepStageOption[] {
    const options: LessonPrepStageOption[] = [];
    for (const stage of this.stages) {
      const subjects = [...new Set(
        this.entries
          .filter(entry => entry.stageName === stage.name && entry.subject)
          .map(entry => entry.subject as string)
      )];
      if (!subjects.length) {
        options.push({ stageName: stage.name, subject: '' });
        continue;
      }
      for (const subject of subjects) options.push({ stageName: stage.name, subject });
    }
    return options;
  }

  private applyStage(): void {
    this.dataSource.data = this.preps.filter(prep => prep.stageName === this.selectedStage);
    this.dataSource.filter = this.query.toLowerCase();
    this.paginator?.firstPage();
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
