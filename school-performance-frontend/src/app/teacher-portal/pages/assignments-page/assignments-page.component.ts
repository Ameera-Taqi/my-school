import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { TeacherPortalMockService } from '../../services/teacher-portal-mock.service';
import { AssignmentFormDialogComponent } from '../../dialogs/assignment-form-dialog.component';
import { ClassScheduleEntry, TeacherAssignment } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { ScheduleApiService } from '../../../class-schedule/services/schedule-api.service';
import { UiIconComponent } from '../../../shared/icons/ui-icon.component';

interface StageCard {
  name: string;
  count: number;
}

@Component({
  selector: 'app-assignments-page',
  standalone: true,
  imports: [UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, AppDatePipe],
  templateUrl: './assignments-page.component.html',
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
export class AssignmentsPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(TeacherPortalMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly auth = inject(AuthService);
  private readonly schedule = inject(ScheduleApiService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<TeacherAssignment>([]);
  loading = true;
  query = '';
  cols = ['title', 'className', 'subject', 'dueDate', 'status', 'actions'];
  stages: StageCard[] = [];
  selectedStage = '';
  private entries: ClassScheduleEntry[] = [];
  private assignments: TeacherAssignment[] = [];

  get teacherId(): number | null {
    return this.auth.user()?.teacherId ?? null;
  }

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (a, filter) =>
      [a.title, a.className, a.subject, a.description ?? '', this.statusLabel(a.status)].join(' ').toLowerCase().includes(filter);
    this.auth.refreshCurrentUser().subscribe({
      next: () => this.load(),
      error: () => this.load()
    });
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  selectStage(name: string): void {
    this.selectedStage = this.selectedStage === name ? '' : name;
    this.applyStage();
  }

  load(): void {
    const teacherId = this.teacherId;
    this.loading = true;
    forkJoin({
      entries: teacherId
        ? this.schedule.getEntries({ teacherId }).pipe(catchError(() => of([] as ClassScheduleEntry[])))
        : of([] as ClassScheduleEntry[]),
      assignments: this.service.getAssignments().pipe(catchError(() => of([] as TeacherAssignment[])))
    }).subscribe({
      next: ({ entries, assignments }) => {
        this.entries = entries;
        this.assignments = assignments;
        this.stages = this.buildStages();
        if (this.selectedStage && !this.stages.some(stage => stage.name === this.selectedStage)) {
          this.selectedStage = '';
        }
        this.applyStage();
        this.loading = false;
        setTimeout(() => this.attachTableControls());
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  onSearch(query: string): void {
    this.query = query;
    this.dataSource.filter = query.toLowerCase();
    this.paginator?.firstPage();
  }

  statusLabel(status: TeacherAssignment['status']): string {
    return status === 'OPEN' ? 'مفتوح' : 'مغلق';
  }

  chipClass(status: TeacherAssignment['status']): string {
    return status === 'OPEN' ? 'success' : 'neutral';
  }

  openDialog(item?: TeacherAssignment): void {
    if (!this.selectedStage) return;
    const ref = this.dialog.open(AssignmentFormDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: {
        item: item ?? null,
        stageName: this.selectedStage,
        classes: this.classesFor(this.selectedStage),
        subjects: this.subjectsFor(this.selectedStage)
      }
    });
    ref.afterClosed().subscribe((result: TeacherAssignment | undefined) => {
      if (!result) return;
      this.service.saveAssignment(result).subscribe({
        next: () => { this.toast.success(item?.id ? 'تم تحديث الواجب' : 'تمت إضافة الواجب'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  delete(item: TeacherAssignment): void {
    if (!item.id) return;
    this.confirm.deleteConfirmed(item.title, 'الواجب').subscribe(() => {
      this.service.deleteAssignment(item.id!).subscribe({
        next: () => { this.toast.success('تم حذف الواجب'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  private buildStages(): StageCard[] {
    const order: string[] = [];
    const seen = new Set<string>();
    const ranked = [...this.entries].sort((a, b) => (a.stageId ?? 0) - (b.stageId ?? 0));
    for (const entry of ranked) {
      const name = entry.stageName?.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      order.push(name);
    }
    return order.map(name => ({
      name,
      count: this.assignments.filter(item => this.stageOf(item) === name).length
    }));
  }

  private classesFor(stageName: string): string[] {
    const fromSchedule = this.entries
      .filter(entry => entry.stageName === stageName && entry.className)
      .map(entry => entry.className);
    const fromAssignments = this.assignments
      .filter(item => this.stageOf(item) === stageName && item.className)
      .map(item => item.className);
    return [...new Set([...fromSchedule, ...fromAssignments])].sort((a, b) => a.localeCompare(b, 'ar'));
  }

  private subjectsFor(stageName: string): string[] {
    const fromSchedule = this.entries
      .filter(entry => entry.stageName === stageName && entry.subject)
      .map(entry => entry.subject as string);
    const fromAssignments = this.assignments
      .filter(item => this.stageOf(item) === stageName && item.subject)
      .map(item => item.subject);
    return [...new Set([...fromSchedule, ...fromAssignments])];
  }

  private stageOf(item: TeacherAssignment): string {
    if (item.stageName) return item.stageName;
    return this.entries.find(entry => entry.className === item.className)?.stageName ?? '';
  }

  private applyStage(): void {
    if (!this.selectedStage) {
      this.dataSource.data = [];
      return;
    }
    this.dataSource.data = this.assignments.filter(item => this.stageOf(item) === this.selectedStage);
    this.dataSource.filter = this.query.toLowerCase();
    this.paginator?.firstPage();
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
