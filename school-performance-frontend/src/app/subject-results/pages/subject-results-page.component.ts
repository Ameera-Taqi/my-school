import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
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
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

interface ClassGroupRow {
  isGroup: true;
  className: string;
  stageName: string;
  count: number;
}

type ResultTableRow = SubjectStudentResult | ClassGroupRow;

@Component({
  selector: 'app-subject-results-page',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatCardModule, MatProgressSpinnerModule, PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent, AppDatePipe],
  templateUrl: './subject-results-page.component.html',
  styles: [`
    tr.result-group-row td {
      background: #f3f4f6;
      font-weight: 800;
      color: var(--sp-primary, #312e81);
    }
  `]
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
  readonly dataSource = new MatTableDataSource<ResultTableRow>([]);
  private results: SubjectStudentResult[] = [];

  subjects: string[] = [];
  stages: string[] = [];
  classes: string[] = [];
  terms: string[] = [];
  loading = false;
  searched = false;

  stats = { total: 0, students: 0, average: 0, passRate: 0, failCount: 0 };

  filters = this.fb.group({
    subject: ['', { validators: [] }],
    stage: [''],
    className: [''],
    term: [''],
    search: ['']
  });

  cols = ['studentName', 'className', 'stageName', 'subject', 'score', 'percentage', 'gradeLevel', 'teacherName', 'examDate', 'actions'];

  get tableCols(): string[] {
    let cols = this.cols;
    if (!this.departmentScope.isScoped() && !this.showsMultipleSubjects) {
      cols = cols.filter(c => c !== 'subject');
    }
    if (this.grouped) {
      cols = cols.filter(c => c !== 'className');
    }
    return cols;
  }

  get showsMultipleSubjects(): boolean {
    return new Set(this.results.map(r => r.subject)).size > 1;
  }

  get total(): number { return this.results.length; }

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
        this.results = data;
        this.dataSource.data = this.toTableRows(data);
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
    this.results = [];
    this.searched = false;
    this.stats = { total: 0, students: 0, average: 0, passRate: 0, failCount: 0 };
    this.service.getClasses().subscribe(c => this.classes = c);
    if (this.departmentScope.isScoped()) {
      this.search();
    }
  }

  view(result: ResultTableRow): void {
    if (this.isGroupRow(result)) return;
    this.dialog.open(SubjectResultDetailDialogComponent, {
      width: '540px',
      maxWidth: '95vw',

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

  get grouped(): boolean {
    return !this.filters.controls.className.value && this.results.length > 0;
  }

  isGroup = (_index: number, row: ResultTableRow): boolean => this.isGroupRow(row);
  isData = (_index: number, row: ResultTableRow): boolean => !this.isGroupRow(row);

  private isGroupRow(row: ResultTableRow): row is ClassGroupRow {
    return 'isGroup' in row && row.isGroup === true;
  }

  private toTableRows(data: SubjectStudentResult[]): ResultTableRow[] {
    if (this.filters.controls.className.value) {
      return data;
    }
    const rows: ResultTableRow[] = [];
    let current = '';
    for (const row of data) {
      if (row.className !== current) {
        current = row.className;
        rows.push({
          isGroup: true,
          className: row.className,
          stageName: row.stageName,
          count: data.filter(r => r.className === row.className).length
        });
      }
      rows.push(row);
    }
    return rows;
  }

  private updateStats(data: SubjectStudentResult[]): void {
    const total = data.length;
    const average = total
      ? Math.round(data.reduce((sum, r) => sum + r.percentage, 0) / total)
      : 0;
    const passCount = data.filter(r => r.gradeLevel !== 'FAIL').length;
    const passRate = total ? Math.round((passCount / total) * 100) : 0;
    const failCount = data.filter(r => r.gradeLevel === 'FAIL').length;
    const students = new Set(data.map(r => `${r.className}|${r.studentName}`)).size;
    this.stats = { total, students, average, passRate, failCount };
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
