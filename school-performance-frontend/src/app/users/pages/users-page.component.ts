import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { UserApiService } from '../services/user-api.service';
import { UserFormDialogComponent } from '../user-form-dialog/user-form-dialog.component';
import { AppUser } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, MatMenuModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss'
})
export class UsersPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(UserApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly authService = inject(AuthService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<AppUser>([]);
  loading = true;
  query = '';
  cols = ['fullName', 'username', 'departmentName', 'active', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }
  get currentUsername(): string { return this.authService.user()?.username ?? ''; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (u, filter) => {
      const haystack = [u.fullName, u.username, u.email, u.roleName, u.departmentName].join(' ').toLowerCase();
      return haystack.includes(filter);
    };
    this.load();
  }

  ngAfterViewInit(): void {
    this.attachTableControls();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
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

  openDialog(u?: AppUser): void {
    const ref = this.dialog.open(UserFormDialogComponent, { width: '520px', maxWidth: '95vw', data: u ?? null });
    ref.afterClosed().subscribe((result: AppUser | undefined) => {
      if (!result) return;
      const req$ = u?.id ? this.service.update(u.id, result) : this.service.create(result);
      req$.subscribe({
        next: () => { this.toast.success(u?.id ? 'تم تحديث المستخدم' : 'تمت إضافة المستخدم'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  toggleActive(u: AppUser): void {
    if (!u.id) return;
    this.service.toggleActive(u).subscribe({
      next: () => { this.toast.success(u.active ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب'); this.load(); },
      error: (e) => this.toast.fromError(e)
    });
  }

  delete(u: AppUser): void {
    if (!u.id) return;
    this.confirm.deleteConfirmed(u.fullName, 'المستخدم').subscribe(() => {
      this.service.delete(u.id!).subscribe({
        next: () => { this.toast.success('تم حذف المستخدم'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
