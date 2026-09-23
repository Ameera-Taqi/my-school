import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
import { ReportPdfService } from '../../reports/services/report-pdf.service';
import { ReportResult } from '../../reports/services/report-mock.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-behavior-page',
  standalone: true,
  imports: [UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, MatProgressSpinnerModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe, AppDatePipe],
  templateUrl: './behavior-page.component.html'
})
export class BehaviorPageComponent implements OnInit, AfterViewInit {
  /** Hides the page title when shown inside a class page. */
  @Input() embedded = false;
  /** When set, only notes for these students are shown. */
  @Input() studentNames: string[] | null = null;
  @ViewChild('pdfExportRoot') pdfExportRoot?: ElementRef<HTMLElement>;

  private readonly service = inject(BehaviorMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly details = inject(DetailDialogService);
  private readonly pdfService = inject(ReportPdfService);
  private readonly datePipe = new AppDatePipe();

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly typeLabels = BEHAVIOR_TYPE_LABELS;
  readonly dataSource = new MatTableDataSource<BehaviorNote>([]);
  loading = true;
  exportingPdf = false;
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
      next: (data) => {
        const names = this.studentNames;
        this.dataSource.data = names ? data.filter(note => this.belongsToClass(note.studentName, names)) : data;
        this.loading = false;
        setTimeout(() => this.attachTableControls());
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  /** Matches a note to a class roster even when the stored name is a shorter form. */
  private belongsToClass(noteName: string, names: string[]): boolean {
    const note = this.normalizeName(noteName);
    return names.some(name => {
      const student = this.normalizeName(name);
      return student === note || student.includes(note) || note.includes(student);
    });
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ');
  }

  onSearch(query: string): void {
    this.query = query;
    this.dataSource.filter = query.toLowerCase();
    this.paginator?.firstPage();
  }

  openDialog(note?: BehaviorNote): void {
    const ref = this.dialog.open(BehaviorFormDialogComponent, { width: '520px', maxWidth: '95vw', data: note ?? null });
    ref.afterClosed().subscribe((result: BehaviorNote | undefined) => {
      if (!result) return;
      const req$ = note?.id ? this.service.update(note.id, result) : this.service.create(result);
      req$.subscribe({
        next: () => { this.toast.success(note?.id ? 'تم تحديث الملاحظة' : 'تم تسجيل الملاحظة'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  exportPdf(): void {
    const rows = this.dataSource.filteredData;
    if (!rows.length) {
      this.toast.info('لا توجد ملاحظات لتصديرها');
      return;
    }
    const root = this.pdfExportRoot?.nativeElement;
    if (!root) {
      this.toast.error('فشل تجهيز التقرير للتصدير');
      return;
    }
    const report = this.buildPdfReport(rows);
    this.exportingPdf = true;
    const widthPx = this.pdfService.getContentWidthPx(report);
    root.style.width = `${widthPx}px`;
    root.style.maxWidth = `${widthPx}px`;
    root.innerHTML = this.pdfService.buildExportHtml(report);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.pdfService.export(root, report)
          .then(() => this.toast.success('تم تنزيل تقرير السلوك والانضباط PDF'))
          .catch((err: Error) => {
            console.error('Behavior PDF export failed:', err);
            try {
              this.pdfService.exportViaPrint(report);
              this.toast.info('تم فتح نافذة الطباعة — اختر «حفظ كـ PDF»');
            } catch (printErr) {
              this.toast.error(printErr instanceof Error ? printErr.message : 'فشل تصدير PDF');
            }
          })
          .finally(() => {
            root.innerHTML = '';
            root.style.width = '';
            root.style.maxWidth = '';
            this.exportingPdf = false;
          });
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

  private buildPdfReport(notes: BehaviorNote[]): ReportResult {
    const count = (type: BehaviorNote['type']) => notes.filter(n => n.type === type).length;
    return {
      title: 'تقرير السلوك والانضباط',
      generatedAt: this.datePipe.transform(new Date(), 'withTime'),
      summary: [
        { label: 'إجمالي الملاحظات', value: notes.length },
        { label: this.typeLabels['POSITIVE'] ?? 'إيجابية', value: count('POSITIVE') },
        { label: this.typeLabels['NEGATIVE'] ?? 'سلبية', value: count('NEGATIVE') },
        { label: this.typeLabels['WARNING'] ?? 'إنذار', value: count('WARNING') }
      ],
      columns: ['studentName', 'type', 'description', 'noteDate', 'recordedBy'],
      columnLabels: {
        studentName: 'المتعلم',
        type: 'النوع',
        description: 'الوصف',
        noteDate: 'التاريخ',
        recordedBy: 'المسجل'
      },
      rows: notes.map(n => ({
        studentName: n.studentName,
        type: this.typeLabels[n.type] ?? n.type,
        description: n.description || '—',
        noteDate: this.datePipe.transform(n.noteDate),
        recordedBy: n.recordedBy || '—'
      }))
    };
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
