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
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { RoleApiService } from '../services/role-api.service';
import { RoleFormDialogComponent } from '../role-form-dialog/role-form-dialog.component';
import { Role } from '../../core/models';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [
    MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatIconModule, MatTooltipModule,
    MatDialogModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent
  ],
  templateUrl: './role-list.component.html',
  styleUrl: './role-list.component.scss'
})
export class RoleListComponent implements OnInit, AfterViewInit {
  private readonly roleService = inject(RoleApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<Role>([]);
  loading = true;
  query = '';
  displayedColumns = ['roleKey', 'roleName', 'description', 'active', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (r, filter) =>
      [r.roleKey, r.roleName, r.description, r.active ? 'نشط' : 'غير نشط'].join(' ').toLowerCase().includes(filter);
    this.loadRoles();
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  loadRoles(): void {
    this.loading = true;
    this.roleService.getAll().subscribe({
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

  openDialog(role?: Role): void {
    const dialogRef = this.dialog.open(RoleFormDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: role ?? null,
      direction: 'rtl'
    });

    dialogRef.afterClosed().subscribe((result: Role | undefined) => {
      if (!result) return;
      const request$ = role?.id
        ? this.roleService.update(role.id, result)
        : this.roleService.create(result);

      request$.subscribe({
        next: () => {
          this.toast.success(role?.id ? 'تم تحديث الدور' : 'تمت إضافة الدور');
          this.loadRoles();
        },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  deleteRole(role: Role): void {
    if (!role.id) return;
    this.confirm.deleteConfirmed(role.roleName, 'الدور').subscribe(() => {
      this.roleService.delete(role.id!).subscribe({
        next: () => { this.toast.success('تم حذف الدور'); this.loadRoles(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
