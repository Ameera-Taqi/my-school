import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { GRADE_LEVEL_LABELS } from '../../shared/constants/labels';
import { SubjectStudentResult } from '../../core/models';
import { SubjectResultsMockService } from '../services/subject-results-mock.service';
import { SubjectResultDetailDialogComponent } from '../subject-result-detail-dialog/subject-result-detail-dialog.component';
import { DepartmentScopeService } from '../../core/services/department-scope.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-subject-results-page',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatCardModule,
    MatProgressSpinnerModule, PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent, AppDatePipe
  ],
  templateUrl: './subject-results-page.component.html',
  styleUrl: './subject-results-page.component.scss'
})
export class SubjectResultsPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(SubjectResultsMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly departmentScope = inject(DepartmentScopeService);
  private readonly authService = inject(AuthService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly gradeLabels = GRADE_LEVEL_LABELS;
  readonly dataSource = new MatTableDataSource<SubjectStudentResult>([]);

  subjects: string[] = [];
  stages: string[] = [];
  classes: string[] = [];
  terms: string[] = [];
  loading = false;
  searched = false;

  stats = { total: 0, average: 0, passRate: 0, failCount: 0 };

  filters = this.fb.group({
    subject: ['', { validators: [] }],
    stage: [''],
    className: [''],
    term: [''],
    search: ['']
  });

  cols = ['studentName', 'className', 'stageName', 'score', 'percentage', 'gradeLevel', 'teacherName', 'examDate', 'actions'];

  get total(): number { return this.dataSource.data.length; }

  ngOnInit(): void {
    this.service.getSubjects().subscribe(s => this.subjects = s);
    this.service.getStages().subscribe(s => this.stages = s);
    this.service.getTerms().subscribe(t => this.terms = t);

    this.filters.controls.stage.valueChanges.subscribe(stage => {
      this.filters.controls.className.setValue('');
      this.classes = [];
      this.service.getClasses(stage || undefined).subscribe(c => this.classes = c);
    });

    this.service.getClasses().subscribe(c => this.classes = c);

    this.authService.refreshCurrentUser().subscribe(() => {
      if (this.departmentScope.isScoped()) {
        this.search();
      }
    });
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  search(): void {
    if (!this.departmentScope.isScoped()) {
      const subject = this.filters.controls.subject.value;
      if (!subject) {
        this.toast.info('اختر المادة أولاً');
        return;
      }
    }

    this.loading = true;
    this.searched = true;
    const v = this.filters.getRawValue();

    this.service.search({
      subjects: this.departmentScope.isScoped() ? this.departmentScope.subjects() : undefined,
      subject: this.departmentScope.isScoped() ? undefined : (v.subject || undefined),
      stage: v.stage || undefined,
      className: v.className || undefined,
      term: v.term || undefined,
      search: v.search || undefined
    }).subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.updateStats(data);
        this.loading = false;
        setTimeout(() => this.attachTableControls());
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  resetFilters(): void {
    this.filters.reset({ subject: '', stage: '', className: '', term: '', search: '' });
    this.dataSource.data = [];
    this.searched = false;
    this.stats = { total: 0, average: 0, passRate: 0, failCount: 0 };
    this.service.getClasses().subscribe(c => this.classes = c);
    if (this.departmentScope.isScoped()) {
      this.search();
    }
  }

  view(result: SubjectStudentResult): void {
    this.dialog.open(SubjectResultDetailDialogComponent, {
      width: '540px',
      maxWidth: '95vw',
      direction: 'rtl',
      data: { result }
    });
  }

  gradeLabel(level: SubjectStudentResult['gradeLevel']): string {
    return this.gradeLabels[level] ?? level;
  }

  chipClass(level: SubjectStudentResult['gradeLevel']): string {
    switch (level) {
      case 'EXCELLENT': return 'success';
      case 'VERY_GOOD':
      case 'GOOD': return 'info';
      case 'PASS': return 'warning';
      case 'FAIL': return 'danger';
      default: return 'neutral';
    }
  }

  private updateStats(data: SubjectStudentResult[]): void {
    const total = data.length;
    const average = total
      ? Math.round(data.reduce((sum, r) => sum + r.percentage, 0) / total)
      : 0;
    const passCount = data.filter(r => r.gradeLevel !== 'FAIL').length;
    const passRate = total ? Math.round((passCount / total) * 100) : 0;
    const failCount = data.filter(r => r.gradeLevel === 'FAIL').length;
    this.stats = { total, average, passRate, failCount };
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
