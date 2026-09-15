import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DepartmentApiService } from '../services/department-api.service';
import { Department } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [UiIconComponent, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatTooltipModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent],
  template: `
    <app-page-header title="الشعب" subtitle="إدارة الشعب الأكاديمية">
      <button mat-flat-button color="primary" (click)="addSample()">
        <app-ui-icon name="add"></app-ui-icon>
        إضافة شعبة (تجريبية)
      </button>
    </app-page-header>

    <div class="data-card">
      <div class="list-toolbar">
        <app-search-field placeholder="ابحث بالرمز أو اسم الشعبة" (search)="onSearch($event)" class="toolbar-search"></app-search-field>
        @if (!loading) {
          <span class="toolbar-count">
            @if (query) { {{ filteredCount }} من {{ total }} شعبة } @else { {{ total }} شعبة }
          </span>
        }
      </div>

      @if (loading) {
        <app-table-skeleton [rows]="5" [columns]="4"></app-table-skeleton>
      } @else if (total === 0) {
        <app-empty-state icon="domain" title="لا توجد شعب بعد" description="أضف أول شعبة لبدء تنظيم المعلمين والمواد.">
          <button mat-flat-button color="primary" (click)="addSample()"><app-ui-icon name="add"></app-ui-icon> إضافة شعبة (تجريبية)</button>
        </app-empty-state>
      } @else if (filteredCount === 0) {
        <app-empty-state icon="search_off" title="لا توجد نتائج مطابقة" [description]="'لم نجد شعبة تطابق «' + query + '». جرّب كلمة أخرى.'" [compact]="true"></app-empty-state>
      } @else {
        <div class="table-scroll">
          <table mat-table [dataSource]="dataSource" matSort matSortActive="name" matSortDirection="asc">
            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>الرمز</th>
              <td mat-cell *matCellDef="let r"><code>{{ r.code }}</code></td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>الاسم</th>
              <td mat-cell *matCellDef="let r" class="name">{{ r.name }}</td>
            </ng-container>
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>الوصف</th>
              <td mat-cell *matCellDef="let r" class="muted">{{ r.description || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="actions-cell">الإجراءات</th>
              <td mat-cell *matCellDef="let r" class="actions-cell">
                <div class="row-actions">
                  <button mat-icon-button class="danger" matTooltip="حذف" (click)="deleteDept(r)"><app-ui-icon name="delete"></app-ui-icon></button>
                </div>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          </table>
        </div>
        <mat-paginator [pageSizeOptions]="[10, 25, 50]" [pageSize]="10" showFirstLastButtons></mat-paginator>
      }
    </div>
  `,
  styles: [`
    .toolbar-search { flex: 1; max-width: 440px; }
    .actions-cell { width: 1%; white-space: nowrap; }
    .name { font-weight: 600; }
    .muted { color: var(--sp-text-muted); }
  `]
})
export class DepartmentListComponent implements OnInit, AfterViewInit {
  private readonly deptService = inject(DepartmentApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  // Setter form: the table lives inside @if blocks, so attach the moment Angular creates the paginator.
  @ViewChild(MatPaginator) set paginatorRef(p: MatPaginator | undefined) { this.paginator = p; this.attachTableControls(); }
  paginator?: MatPaginator;
  @ViewChild(MatSort) set sortRef(s: MatSort | undefined) { this.sort = s; this.attachTableControls(); }
  sort?: MatSort;

  readonly dataSource = new MatTableDataSource<Department>([]);
  loading = true;
  query = '';
  cols = ['code', 'name', 'description', 'actions'];

  get total(): number { return this.dataSource.data.length; }
  get filteredCount(): number { return this.dataSource.filteredData.length; }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (d, filter) =>
      [d.code, d.name, d.description].join(' ').toLowerCase().includes(filter);
    this.load();
  }

  ngAfterViewInit(): void { this.attachTableControls(); }

  load(): void {
    this.loading = true;
    this.deptService.getAll().subscribe({
      next: (d) => {
        this.dataSource.data = d;
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

  addSample(): void {
    const n = this.total + 1;
    this.deptService.create({
      code: `DEPT${n}`,
      name: `شعبة تجريبية ${n}`,
      description: 'شعبة أكاديمية',
      active: true
    }).subscribe({
      next: () => { this.toast.success('تمت إضافة الشعبة'); this.load(); },
      error: (e) => this.toast.fromError(e)
    });
  }

  deleteDept(d: Department): void {
    if (!d.id) return;
    this.confirm.deleteConfirmed(d.name, 'الشعبة').subscribe(() => {
      this.deptService.delete(d.id!).subscribe({
        next: () => { this.toast.success('تم حذف الشعبة'); this.load(); },
        error: (e) => this.toast.fromError(e)
      });
    });
  }

  private attachTableControls(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
  }
}
