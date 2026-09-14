import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { TeacherPortalMockService } from '../../services/teacher-portal-mock.service';
import { GradeColumnDialogComponent } from '../../dialogs/grade-column-dialog.component';
import { GradeSheet, GradeSheetColumn, GradeSheetEntry } from '../../../core/models';

@Component({
  selector: 'app-grades-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule, MatDialogModule,
    MatProgressSpinnerModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatCardModule,
    PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent
  ],
  templateUrl: './grades-page.component.html',
  styleUrl: './grades-page.component.scss'
})
export class GradesPageComponent implements OnInit {
  private readonly service = inject(TeacherPortalMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly defaultTerm = 'الفصل الثاني';

  classNames: string[] = [];
  classSubjects = new Map<string, string>();
  sheet: GradeSheet | null = null;
  loading = false;
  saving = false;
  sheetLoaded = false;
  displayedColumns: string[] = ['studentName', 'className'];

  filters = this.fb.group({
    className: ['', Validators.required]
  });

  ngOnInit(): void {
    this.service.getMyClasses().subscribe(classes => {
      this.classNames = classes.map(c => c.name);
      classes.forEach(c => this.classSubjects.set(c.name, c.subject ?? ''));
      if (classes.length) this.filters.controls.className.setValue(classes[0].name);
    });
  }

  loadSheet(): void {
    if (this.filters.invalid) {
      this.toast.info('اختر الفصل');
      return;
    }

    const v = this.filters.getRawValue();
    const className = v.className ?? '';
    const subject = this.classSubjects.get(className) ?? '';
    const term = this.defaultTerm;
    this.loading = true;
    this.sheetLoaded = false;

    this.service.getGradeSheet(className, subject, term).subscribe({
      next: (data) => {
        this.sheet = data;
        this.updateDisplayedColumns();
        this.sheetLoaded = true;
        this.loading = false;
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  resetFilters(): void {
    const defaultClass = this.classNames[0] ?? '';
    this.filters.reset({
      className: defaultClass
    });
    this.sheet = null;
    this.sheetLoaded = false;
    this.displayedColumns = ['studentName', 'className'];
  }

  addColumn(): void {
    if (!this.sheet) return;
    const ref = this.dialog.open(GradeColumnDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      direction: 'rtl',
      data: {}
    });
    ref.afterClosed().subscribe((result: { title: string; maxScore: number } | undefined) => {
      if (!result || !this.sheet) return;
      const column: GradeSheetColumn = {
        id: this.nextColumnId(),
        title: result.title,
        maxScore: result.maxScore
      };
      this.sheet.columns = [...this.sheet.columns, column];
      this.updateDisplayedColumns();
    });
  }

  editColumn(column: GradeSheetColumn): void {
    if (!this.sheet) return;
    const ref = this.dialog.open(GradeColumnDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      direction: 'rtl',
      data: { column }
    });
    ref.afterClosed().subscribe((result: { title: string; maxScore: number } | undefined) => {
      if (!result || !this.sheet) return;
      column.title = result.title;
      column.maxScore = result.maxScore;
      this.sheet.entries.forEach(entry => {
        const score = entry.scores[column.id];
        if (score != null && score > column.maxScore) {
          entry.scores[column.id] = column.maxScore;
        }
      });
      this.sheet = { ...this.sheet, columns: [...this.sheet.columns] };
    });
  }

  removeColumn(column: GradeSheetColumn): void {
    if (!this.sheet) return;
    this.confirm.confirmed({
      title: 'حذف عمود الدرجات',
      message: `سيتم حذف عمود «${column.title}» وجميع الدرجات المسجلة فيه.`,
      confirmText: 'نعم، احذف',
      danger: true,
      icon: 'delete'
    }).subscribe(() => {
      if (!this.sheet) return;
      this.sheet.columns = this.sheet.columns.filter(c => c.id !== column.id);
      this.sheet.entries.forEach(entry => {
        delete entry.scores[column.id];
      });
      this.sheet = { ...this.sheet, entries: [...this.sheet.entries] };
      this.updateDisplayedColumns();
    });
  }

  setScore(entry: GradeSheetEntry, column: GradeSheetColumn, event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.trim();
    if (!raw) {
      entry.scores[column.id] = null;
      this.sheet = { ...this.sheet!, entries: [...this.sheet!.entries] };
      return;
    }
    let value = Number(raw);
    if (Number.isNaN(value)) return;
    if (value < 0) value = 0;
    if (value > column.maxScore) value = column.maxScore;
    entry.scores[column.id] = value;
    input.value = String(value);
    this.sheet = { ...this.sheet!, entries: [...this.sheet!.entries] };
  }

  scoreValue(entry: GradeSheetEntry, columnId: string): string {
    const score = entry.scores[columnId];
    return score == null ? '' : String(score);
  }

  isScoreInvalid(entry: GradeSheetEntry, column: GradeSheetColumn): boolean {
    const score = entry.scores[column.id];
    return score != null && (score < 0 || score > column.maxScore);
  }

  rowTotal(entry: GradeSheetEntry): number {
    if (!this.sheet) return 0;
    return this.sheet.columns.reduce((sum, col) => sum + (entry.scores[col.id] ?? 0), 0);
  }

  rowTotalMax(): number {
    if (!this.sheet) return 0;
    return this.sheet.columns.reduce((sum, col) => sum + col.maxScore, 0);
  }

  saveSheet(): void {
    if (!this.sheet) return;
    if (!this.sheet.columns.length) {
      this.toast.info('أضف عموداً واحداً على الأقل قبل الحفظ');
      return;
    }

    this.saving = true;
    this.service.saveGradeSheet(this.sheet).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('تم حفظ كشف الدرجات');
      },
      error: (e) => { this.saving = false; this.toast.fromError(e); }
    });
  }

  private updateDisplayedColumns(): void {
    if (!this.sheet) {
      this.displayedColumns = ['studentName', 'className'];
      return;
    }
    this.displayedColumns = ['studentName', 'className', ...this.sheet.columns.map(c => c.id)];
    if (this.sheet.columns.length) {
      this.displayedColumns.push('total');
    }
  }

  private nextColumnId(): string {
    return `col_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
}
