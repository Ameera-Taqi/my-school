import { AfterViewInit, Component, Input, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
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
import { TeacherPortalMockService } from '../../services/teacher-portal-mock.service';
import { TeacherNoteFormDialogComponent } from '../../dialogs/teacher-note-form-dialog.component';
import { TeacherNote } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { UiIconComponent } from '../../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-teacher-notes-page',
  standalone: true,
  imports: [UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatDialogModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, AppDatePipe],
  templateUrl: './teacher-notes-page.component.html'
})
export class TeacherNotesPageComponent implements OnInit, AfterViewInit {
  /** Limits the list to this class when the page is shown under a class tab. */
  @Input() lockedClass = '';

  private readonly service = inject(TeacherPortalMockService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly auth = inject(AuthService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  /** When opened from a class, only that class's notes are shown. */
  className = '';
  readonly dataSource = new MatTableDataSource<TeacherNote>([]);
  loading = true;
  query = '';
  cols = ['studentName', 'noteType', 'noteDate', 'actions'];
  private notes: TeacherNote[] = [];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.className = this.lockedClass || (this.route.snapshot.queryParamMap.get('className') ?? '');
    this.dataSource.filterPredicate = (n, filter) =>
      [n.studentName, n.className, n.content, this.typeLabel(n.noteType)].join(' ').toLowerCase().includes(filter);
    this.auth.refreshCurrentUser().subscribe({
      next: () => this.load(),
      error: () => this.load()
    });
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  load(): void {
    this.loading = true;
    this.service.getNotes().pipe(catchError(() => of([] as TeacherNote[]))).subscribe({
      next: notes => {
        this.notes = notes;
        this.applyClass();
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

  typeLabel(t: string): string {
    return t === 'BEHAVIOR' ? 'سلوكية' : 'أكاديمية';
  }

  typeChip(t: string): string {
    return t === 'BEHAVIOR' ? 'warning' : 'info';
  }

  openDialog(item?: TeacherNote): void {
    if (!item && !this.className) return;
    const draft: TeacherNote | null = item ?? (this.className
      ? { studentName: '', className: this.className, noteType: 'BEHAVIOR', content: '', noteDate: '' }
      : null);
    const ref = this.dialog.open(TeacherNoteFormDialogComponent, {
      width: '680px',
      maxWidth: 'calc(100vw - 32px)',
      panelClass: 'sp-teacher-note-dialog',
      data: draft
    });
    ref.afterClosed().subscribe((result: TeacherNote | undefined) => {
      if (!result) return;
      this.service.saveNote(result).subscribe({
        next: () => { this.toast.success(item?.id ? 'تم تحديث الملاحظة' : 'تمت إضافة الملاحظة'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  delete(item: TeacherNote): void {
    if (!item.id) return;
    this.confirm.deleteConfirmed(item.studentName, 'الملاحظة').subscribe(() => {
      this.service.deleteNote(item.id!).subscribe({
        next: () => { this.toast.success('تم حذف الملاحظة'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  private applyClass(): void {
    this.dataSource.data = this.className
      ? this.notes.filter(note => note.className === this.className)
      : this.notes;
    this.dataSource.filter = this.query.toLowerCase();
    this.paginator?.firstPage();
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
