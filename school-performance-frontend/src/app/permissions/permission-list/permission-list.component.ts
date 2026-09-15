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
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { PermissionApiService } from '../services/permission-api.service';
import { PermissionFormDialogComponent } from '../permission-form-dialog/permission-form-dialog.component';
import { Permission } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-permission-list',
  standalone: true,
  imports: [UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent],
  templateUrl: './permission-list.component.html'
})
export class PermissionListComponent implements OnInit, AfterViewInit {
  private readonly permissionService = inject(PermissionApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<Permission>([]);
  loading = true;
  query = '';
  displayedColumns = ['permissionKey', 'permissionName', 'moduleName', 'description', 'active', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (p, filter) =>
      [p.permissionKey, p.permissionName, p.moduleName, p.description, p.active ? 'نشط' : 'غير نشط']
        .join(' ').toLowerCase().includes(filter);
    this.loadPermissions();
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  loadPermissions(): void {
    this.loading = true;
    this.permissionService.getAll().subscribe({
      next: (data) => {
        this.dataSource.data = data;
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

  openDialog(permission?: Permission): void {
    const dialogRef = this.dialog.open(PermissionFormDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      data: permission ?? null,
    });

    dialogRef.afterClosed().subscribe((result: Permission | undefined) => {
      if (!result) return;
      const request$ = permission?.id
        ? this.permissionService.update(permission.id, result)
        : this.permissionService.create(result);

      request$.subscribe({
        next: () => {
          this.toast.success(permission?.id ? 'تم تحديث الصلاحية' : 'تمت إضافة الصلاحية');
          this.loadPermissions();
        },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  deletePermission(permission: Permission): void {
    if (!permission.id) return;
    this.confirm.deleteConfirmed(permission.permissionName, 'الصلاحية').subscribe(() => {
      this.permissionService.delete(permission.id!).subscribe({
        next: () => { this.toast.success('تم حذف الصلاحية'); this.loadPermissions(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
