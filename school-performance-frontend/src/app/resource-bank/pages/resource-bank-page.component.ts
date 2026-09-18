import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
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
import { ResourceBankMockService } from '../services/resource-bank-mock.service';
import { ResourceFileFormDialogComponent } from '../resource-file-form-dialog/resource-file-form-dialog.component';
import { ResourceFile } from '../../core/models';
import { DepartmentScopeService } from '../../core/services/department-scope.service';
import { AuthService } from '../../core/services/auth.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-resource-bank-page',
  standalone: true,
  imports: [UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe, AppDatePipe],
  templateUrl: './resource-bank-page.component.html'
})
export class ResourceBankPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(ResourceBankMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly departmentScope = inject(DepartmentScopeService);
  private readonly authService = inject(AuthService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<ResourceFile>([]);
  loading = true;
  query = '';
  cols = ['title', 'fileType', 'subject', 'stageName', 'teacherName', 'description', 'uploadedAt', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (f, filter) =>
      [f.title, f.fileName, f.fileType, f.subject, f.stageName, f.teacherName, f.description]
        .join(' ').toLowerCase().includes(filter);
    this.authService.refreshCurrentUser().subscribe(() => this.load());
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

  openDialog(): void {
    const ref = this.dialog.open(ResourceFileFormDialogComponent, { width: '560px', maxWidth: '95vw'});
    ref.afterClosed().subscribe((result: ResourceFile | undefined) => {
      if (!result) return;
      this.service.create(result).subscribe({
        next: () => { this.toast.success('تم رفع الملف بنجاح'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  delete(f: ResourceFile): void {
    if (!f.id) return;
    this.confirm.deleteConfirmed(f.title, 'الملف').subscribe(() => {
      this.service.delete(f.id!).subscribe({
        next: () => { this.toast.success('تم حذف الملف'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  download(file: ResourceFile): void {
    this.service.download(file);
    this.toast.success('بدأ تحميل الملف');
  }

  fileIcon(type: string): string {
    switch ((type || '').toUpperCase()) {
      case 'PDF': return 'picture_as_pdf';
      case 'PPTX': return 'slideshow';
      case 'DOCX': return 'description';
      case 'VIDEO': return 'videocam';
      default: return 'insert_drive_file';
    }
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
