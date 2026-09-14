import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DetailDialogService } from '../../shared/services/detail-dialog.service';
import { BehaviorMockService } from '../services/behavior-mock.service';
import { BehaviorFormDialogComponent } from '../behavior-form-dialog/behavior-form-dialog.component';
import { BEHAVIOR_TYPE_LABELS } from '../../shared/constants/labels';
import { BehaviorNote } from '../../core/models';

@Component({
  selector: 'app-behavior-page',
  standalone: true,
  imports: [
    MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatIconModule, MatTooltipModule, MatDialogModule,
    PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe, AppDatePipe
  ],
  templateUrl: './behavior-page.component.html',
  styleUrl: './behavior-page.component.scss'
})
export class BehaviorPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(BehaviorMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly details = inject(DetailDialogService);
  private readonly datePipe = new AppDatePipe();

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly typeLabels = BEHAVIOR_TYPE_LABELS;
  readonly dataSource = new MatTableDataSource<BehaviorNote>([]);
  loading = true;
  query = '';
  cols = ['studentName', 'type', 'description', 'noteDate', 'recordedBy', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (n, filter) =>
      [n.studentName, this.typeLabels[n.type], n.description, n.recordedBy].join(' ').toLowerCase().includes(filter);
    this.load();
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => { this.dataSource.data = data; this.loading = false; setTimeout(() => this.attachTableControls()); },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  onSearch(query: string): void {
    this.query = query;
    this.dataSource.filter = query.toLowerCase();
    this.paginator?.firstPage();
  }

  openDialog(note?: BehaviorNote): void {
    const ref = this.dialog.open(BehaviorFormDialogComponent, { width: '520px', maxWidth: '95vw', direction: 'rtl', data: note ?? null });
    ref.afterClosed().subscribe((result: BehaviorNote | undefined) => {
      if (!result) return;
      const req$ = note?.id ? this.service.update(note.id, result) : this.service.create(result);
      req$.subscribe({
        next: () => { this.toast.success(note?.id ? 'تم تحديث الملاحظة' : 'تم تسجيل الملاحظة'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  view(note: BehaviorNote): void {
    this.details.open({
      title: note.studentName,
      subtitle: `ملاحظة ${this.typeLabels[note.type] ?? note.type}`,
      icon: this.typeIcon(note.type),
      fields: [
        { label: 'النوع', value: this.typeLabels[note.type] ?? note.type, chip: this.typeChip(note.type) },
        { label: 'الوصف', value: note.description },
        { label: 'التاريخ', value: this.datePipe.transform(note.noteDate) },
        { label: 'المسجل', value: note.recordedBy }
      ]
    });
  }

  delete(note: BehaviorNote): void {
    if (!note.id) return;
    this.confirm.deleteConfirmed(`ملاحظة ${note.studentName}`, 'الملاحظة').subscribe(() => {
      this.service.delete(note.id!).subscribe({
        next: () => { this.toast.success('تم حذف الملاحظة'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  typeChip(type: string): 'success' | 'danger' | 'warning' | 'neutral' {
    switch (type) {
      case 'POSITIVE': return 'success';
      case 'NEGATIVE': return 'danger';
      case 'WARNING': return 'warning';
      default: return 'neutral';
    }
  }

  typeIcon(type: string): string {
    switch (type) {
      case 'POSITIVE': return 'thumb_up';
      case 'NEGATIVE': return 'thumb_down';
      case 'WARNING': return 'warning';
      default: return 'note';
    }
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
