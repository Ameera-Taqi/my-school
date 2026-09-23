import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
import { AcademicLookupService } from '../../core/services/academic-lookup.service';
import { AuthService } from '../../core/services/auth.service';
import { ScheduleApiService } from '../../class-schedule/services/schedule-api.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

interface StageCard {
  name: string;
  count: number;
}

@Component({
  selector: 'app-resource-bank-page',
  standalone: true,
  imports: [UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe, AppDatePipe],
  templateUrl: './resource-bank-page.component.html',
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
export class ResourceBankPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(ResourceBankMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly departmentScope = inject(DepartmentScopeService);
  private readonly lookup = inject(AcademicLookupService);
  private readonly schedule = inject(ScheduleApiService);
  private readonly authService = inject(AuthService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<ResourceFile>([]);
  private allFiles: ResourceFile[] = [];
  stages: StageCard[] = [];
  selectedStage = '';
  loading = true;
  query = '';
  cols = ['title', 'fileType', 'subject', 'description', 'uploadedAt', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (f, filter) =>
      [f.title, f.fileName, f.fileType, f.subject, f.stageName, f.description]
        .join(' ').toLowerCase().includes(filter);
    this.authService.refreshCurrentUser().subscribe(() => this.load());
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  load(): void {
    this.loading = true;
    forkJoin({
      files: this.service.getAll(),
      stageNames: this.lookup.getStageNames().pipe(catchError(() => of([] as string[]))),
      overview: this.schedule.getOverview().pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ files, stageNames, overview }) => {
        this.allFiles = files;
        const fromClasses = (overview?.classes ?? []).map(item => item.stageName);
        this.stages = this.buildStages(files, [...stageNames, ...fromClasses]);
        if (!this.stages.some(stage => stage.name === this.selectedStage)) {
          this.selectedStage = this.stages[0]?.name ?? '';
        }
        this.applyView();
        this.loading = false;
        setTimeout(() => this.attachTableControls());
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  selectStage(name: string): void {
    this.selectedStage = name;
    this.applyView();
    this.paginator?.firstPage();
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
        next: () => {
          if (result.stageName) this.selectedStage = result.stageName;
          this.toast.success('تم رفع الملف بنجاح');
          this.load();
        },
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

  private applyView(): void {
    this.dataSource.data = this.selectedStage
      ? this.allFiles.filter(file => file.stageName === this.selectedStage)
      : this.allFiles;
  }

  private buildStages(files: ResourceFile[], names: string[]): StageCard[] {
    const ordered: string[] = [];
    const add = (name?: string) => {
      const value = (name ?? '').trim();
      if (value && !ordered.includes(value)) ordered.push(value);
    };
    names.forEach(add);
    files.forEach(file => add(file.stageName));
    return ordered.map(name => ({
      name,
      count: files.filter(file => file.stageName === name).length
    }));
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
