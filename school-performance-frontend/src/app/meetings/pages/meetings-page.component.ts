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
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { MeetingApiService } from '../services/meeting-api.service';
import { MeetingFormDialogComponent } from '../meeting-form-dialog/meeting-form-dialog.component';
import { MeetingDetailDialogComponent } from '../meeting-detail-dialog/meeting-detail-dialog.component';
import { Meeting } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { RoleApiService } from '../../roles/services/role-api.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-meetings-page',
  standalone: true,
  imports: [UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, MatDialogModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent, AppDatePipe],
  templateUrl: './meetings-page.component.html'
})
export class MeetingsPageComponent implements OnInit, AfterViewInit {
  private readonly service = inject(MeetingApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly authService = inject(AuthService);
  private readonly roleApi = inject(RoleApiService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<Meeting>([]);
  roleLabels = new Map<string, string>();
  loading = true;
  query = '';
  cols = ['title', 'meetingDate', 'targetRoles', 'attendees', 'agenda', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  get canManage(): boolean {
    return this.authService.hasAnyPermission(['meetings.create', 'meetings.view']);
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (m, filter) =>
      [m.title, m.attendees, m.agenda, m.minutes, this.formatRoleLabels(m.targetRoleKeys)].join(' ').toLowerCase().includes(filter);
    this.roleApi.getAll().subscribe(roles => {
      roles.forEach(r => this.roleLabels.set(r.roleKey, r.roleName));
    });
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

  openDialog(m?: Meeting): void {
    const ref = this.dialog.open(MeetingFormDialogComponent, { width: '560px', maxWidth: '95vw', data: m ?? null });
    ref.afterClosed().subscribe((result: Meeting | undefined) => {
      if (!result) return;
      const req$ = m?.id ? this.service.update(m.id, result) : this.service.create(result);
      req$.subscribe({
        next: () => {
          const msg = result.targetRoleKeys?.length
            ? 'تم الحفظ وإضافة الاجتماع إلى تقويم الأدوار المحددة'
            : 'تم الحفظ';
          this.toast.success(msg);
          this.load();
        },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  view(m: Meeting): void {
    const ref = this.dialog.open(MeetingDetailDialogComponent, {
      width: '560px',
      maxWidth: '95vw',

      data: {
        meeting: m,
        canEdit: this.authService.hasAnyPermission(['meetings.create', 'meetings.view'])
      }
    });
    ref.afterClosed().subscribe((result?: { action: string; meeting: Meeting }) => {
      if (result?.action === 'edit') {
        this.openDialog(result.meeting);
      }
    });
  }

  delete(m: Meeting): void {
    if (!m.id) return;
    this.confirm.deleteConfirmed(m.title, 'الاجتماع').subscribe(() => {
      this.service.delete(m.id!).subscribe({
        next: () => { this.toast.success('تم حذف الاجتماع'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  isUpcoming(m: Meeting): boolean {
    const d = new Date(m.meetingDate);
    return !Number.isNaN(d.getTime()) && d.getTime() >= Date.now();
  }

  formatRoleLabels(keys?: string[]): string {
    if (!keys?.length) return '—';
    return keys.map(k => this.roleLabels.get(k) ?? k).join('، ');
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
