import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
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
  imports: [UiIconComponent, FormsModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, MatMenuModule, PageHeaderComponent, EmptyStateComponent, TableSkeletonComponent, HasPermissionPipe],
  templateUrl: './users-page.component.html'
})
export class UsersPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(UserApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly authService = inject(AuthService);

  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<AppUser>([]);
  loading = true;
  filtersOpen = true;
  draftQuery = '';
  draftStatus: 'all' | 'active' | 'inactive' = 'all';
  query = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  cols = ['fullName', 'username', 'departmentName', 'active', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }
  get currentUsername(): string { return this.authService.user()?.username ?? ''; }
  get activeFilterCount(): number {
    let n = 0;
    if (this.query.trim()) n++;
    if (this.statusFilter !== 'all') n++;
    return n;
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (u, filter) => {
      const parsed = this.parseFilter(filter);
      if (parsed.status === 'active' && !u.active) return false;
      if (parsed.status === 'inactive' && u.active) return false;
      if (!parsed.text) return true;
      return [u.fullName, u.username, u.email, u.roleName, u.departmentName].join(' ').toLowerCase().includes(parsed.text);
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
        this.commitFilter();
        setTimeout(() => this.attachTableControls());
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  applyFilters(): void {
    this.query = this.draftQuery;
    this.statusFilter = this.draftStatus;
    this.commitFilter();
  }

  resetFilters(): void {
    this.draftQuery = '';
    this.draftStatus = 'all';
    this.query = '';
    this.statusFilter = 'all';
    this.commitFilter();
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
    if (!u.id || u.username === this.currentUsername) return;
    this.confirm.deleteConfirmed(u.fullName, 'المستخدم').subscribe(() => {
      this.service.delete(u.id!).subscribe({
        next: () => { this.toast.success('تم حذف المستخدم'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  private commitFilter(): void {
    this.dataSource.filter = JSON.stringify({
      text: this.query.trim().toLowerCase(),
      status: this.statusFilter
    });
    this.paginator?.firstPage();
  }

  private parseFilter(raw: string): { text: string; status: 'all' | 'active' | 'inactive' } {
    if (!raw) return { text: '', status: 'all' };
    try {
      const parsed = JSON.parse(raw) as { text?: string; status?: 'all' | 'active' | 'inactive' };
      return { text: parsed.text ?? '', status: parsed.status ?? 'all' };
    } catch {
      return { text: raw.toLowerCase(), status: 'all' };
    }
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
