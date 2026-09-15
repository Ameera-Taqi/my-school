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
import {
  ACADEMIC_NOTE_CATEGORY_LABELS,
  ACADEMIC_NOTE_STATUS_LABELS,
  PRIORITY_LABELS
} from '../../shared/constants/labels';
import { AcademicNote } from '../../core/models';
import { AcademicNotesMockService } from '../services/academic-notes-mock.service';
import { AcademicNoteDetailDialogComponent } from '../academic-note-detail-dialog/academic-note-detail-dialog.component';
import { DepartmentScopeService } from '../../core/services/department-scope.service';
import { AuthService } from '../../core/services/auth.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-academic-notes-page',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatCardModule, MatProgressSpinnerModule, PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent, AppDatePipe],
  templateUrl: './academic-notes-page.component.html'
})
export class AcademicNotesPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(AcademicNotesMockService);
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

  readonly categoryLabels = ACADEMIC_NOTE_CATEGORY_LABELS;
  readonly statusLabels = ACADEMIC_NOTE_STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;
  readonly categoryOptions = Object.keys(ACADEMIC_NOTE_CATEGORY_LABELS);
  readonly statusOptions = Object.keys(ACADEMIC_NOTE_STATUS_LABELS);
  readonly priorityOptions = Object.keys(PRIORITY_LABELS);
  readonly dataSource = new MatTableDataSource<AcademicNote>([]);

  subjects: string[] = [];
  stages: string[] = [];
  classes: string[] = [];
  loading = true;

  stats = { total: 0, open: 0, highPriority: 0, handled: 0 };

  filters = this.fb.group({
    subject: [''],
    stage: [''],
    className: [''],
    category: [''],
    priority: [''],
    status: [''],
    search: ['']
  });

  cols = ['studentName', 'className', 'subject', 'category', 'priority', 'teacherName', 'noteDate', 'status', 'actions'];

  get total(): number { return this.dataSource.data.length; }

  get hasFilters(): boolean {
    const v = this.filters.getRawValue();
    return Object.values(v).some(value => !!value);
  }

  ngOnInit(): void {
    this.service.getSubjects().subscribe(s => this.subjects = s);
    this.service.getStages().subscribe(s => this.stages = s);
    this.service.getClasses().subscribe(c => this.classes = c);

    this.filters.controls.stage.valueChanges.subscribe(stage => {
      this.filters.controls.className.setValue('');
      this.service.getClasses(stage || undefined).subscribe(c => this.classes = c);
    });

    this.authService.refreshCurrentUser().subscribe(() => this.load());
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  load(): void {
    this.loading = true;
    const v = this.filters.getRawValue();
    this.service.getAll({
      subjects: this.departmentScope.isScoped() ? this.departmentScope.subjects() : undefined,
      subject: this.departmentScope.isScoped() ? undefined : (v.subject || undefined),
      stage: v.stage || undefined,
      className: v.className || undefined,
      category: v.category || undefined,
      priority: v.priority || undefined,
      status: v.status || undefined,
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
    this.filters.reset({
      subject: '',
      stage: '',
      className: '',
      category: '',
      priority: '',
      status: '',
      search: ''
    });
    this.service.getClasses().subscribe(c => this.classes = c);
    this.load();
  }

  view(note: AcademicNote): void {
    const ref = this.dialog.open(AcademicNoteDetailDialogComponent, {
      width: '560px',
      maxWidth: '95vw',

      data: { note, canReview: true }
    });
    ref.afterClosed().subscribe((result?: { action: string; note: AcademicNote }) => {
      if (result?.action === 'reviewed' && result.note.id) {
        this.service.markReviewed(result.note.id).subscribe({
          next: () => { this.toast.success('تمت مراجعة الملاحظة'); this.load(); },
          error: (e) => this.toast.fromError(e)
        });
      }
    });
  }

  categoryLabel(category: AcademicNote['category']): string {
    return this.categoryLabels[category] ?? category;
  }

  statusLabel(status: AcademicNote['status']): string {
    return this.statusLabels[status] ?? status;
  }

  priorityLabel(priority: AcademicNote['priority']): string {
    return this.priorityLabels[priority] ?? priority;
  }

  statusChip(status: AcademicNote['status']): string {
    switch (status) {
      case 'OPEN': return 'warning';
      case 'REVIEWED': return 'info';
      case 'RESOLVED': return 'success';
      default: return 'neutral';
    }
  }

  priorityChip(priority: AcademicNote['priority']): string {
    switch (priority) {
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'neutral';
    }
  }

  private updateStats(data: AcademicNote[]): void {
    this.stats = {
      total: data.length,
      open: data.filter(n => n.status === 'OPEN').length,
      highPriority: data.filter(n => n.priority === 'HIGH').length,
      handled: data.filter(n => n.status !== 'OPEN').length
    };
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
