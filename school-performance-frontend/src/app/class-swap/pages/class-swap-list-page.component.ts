import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';
import { ClassSwapApiService, ClassSwapListItem, ClassSwapListResponse } from '../services/class-swap-api.service';

@Component({
  selector: 'app-class-swap-list-page',
  standalone: true,
  imports: [
    RouterLink, MatButtonModule, MatTableModule, PageHeaderComponent, EmptyStateComponent,
    TableSkeletonComponent, HasPermissionPipe, AppDatePipe, UiIconComponent
  ],
  template: `
    <app-page-header title="تبديل حصة" subtitle="تبديل توقيت حصة ليوم واحد دون تغيير الجدول الأسبوعي">
      @if ('class_swap.request' | hasPermission) {
        <a mat-flat-button color="primary" routerLink="/class-swaps/new">
          <app-ui-icon name="add"></app-ui-icon>
          طلب تبديل حصة
        </a>
      }
    </app-page-header>

    @if (data) {
      <div class="swap-summary">
        <article><span>بانتظار الموافقة</span><strong>{{ data.summary.pending }}</strong></article>
        <article><span>معتمد</span><strong>{{ data.summary.approved }}</strong></article>
        <article><span>مرفوض</span><strong>{{ data.summary.rejected }}</strong></article>
        <article><span>تم التنفيذ</span><strong>{{ data.summary.executed }}</strong></article>
      </div>
      <div class="swap-filters">
        @for (filter of filters; track filter.id) {
          <button type="button" [class.is-on]="view === filter.id" (click)="select(filter.id)">{{ filter.label }}</button>
        }
      </div>
    }

    @if (loading) {
      <app-table-skeleton></app-table-skeleton>
    } @else if (!rows.length) {
      <div class="data-card">
        <app-empty-state icon="swap_horiz" title="لا توجد طلبات" description="لا توجد طلبات تبديل في هذا التصنيف."></app-empty-state>
      </div>
    } @else {
      <div class="data-card swap-table">
        <table mat-table [dataSource]="rows">
          <ng-container matColumnDef="number"><th mat-header-cell *matHeaderCellDef>رقم الطلب</th><td mat-cell *matCellDef="let row">{{ row.number }}</td></ng-container>
          <ng-container matColumnDef="kind"><th mat-header-cell *matHeaderCellDef>النوع</th><td mat-cell *matCellDef="let row"><span class="swap-kind" [attr.data-kind]="row.kind">{{ row.kindLabel }}</span></td></ng-container>
          <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>التاريخ</th><td mat-cell *matCellDef="let row">{{ row.date }} · {{ row.dayLabel }}</td></ng-container>
          <ng-container matColumnDef="mine"><th mat-header-cell *matHeaderCellDef>الحصة الأولى</th><td mat-cell *matCellDef="let row">{{ row.requesterTeacher }} · ح{{ row.requesterPeriod }} · {{ row.requesterSubject }} · {{ row.requesterClassName }}</td></ng-container>
          <ng-container matColumnDef="other"><th mat-header-cell *matHeaderCellDef>الحصة الثانية</th><td mat-cell *matCellDef="let row">{{ row.counterpartyTeacher }} · ح{{ row.counterpartyPeriod }} · {{ row.counterpartySubject }} · {{ row.counterpartyClassName }}</td></ng-container>
          <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>الحالة</th><td mat-cell *matCellDef="let row"><span class="swap-status" [attr.data-status]="row.status">{{ row.statusLabel }}</span></td></ng-container>
          <ng-container matColumnDef="created"><th mat-header-cell *matHeaderCellDef>تاريخ الطلب</th><td mat-cell *matCellDef="let row">{{ row.createdAt | appDate }}</td></ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>الإجراءات</th>
            <td mat-cell *matCellDef="let row">
              <a mat-button color="primary" [routerLink]="['/class-swaps', row.id]">عرض</a>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
      </div>
    }
  `,
  styles: [`
    .swap-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; margin-bottom: 0.85rem; }
    @media (max-width: 720px) { .swap-summary { grid-template-columns: 1fr 1fr; } }
    .swap-summary article { background: #fff; border: 1px solid #f1f5f9; border-radius: 0.9rem; padding: 0.75rem 0.9rem; }
    .swap-summary span { display: block; color: #64748b; font-size: 0.78rem; }
    .swap-summary strong { font-size: 1.25rem; }
    .swap-filters { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.85rem; }
    .swap-filters button { border: 1px solid #e2e8f0; background: #fff; border-radius: 999px; padding: 0.35rem 0.8rem; cursor: pointer; font-weight: 700; }
    .swap-filters button.is-on { background: #312e81; color: #fff; border-color: #312e81; }
    .swap-table { overflow: auto; }
    table { width: 100%; }
    .swap-status { font-weight: 800; font-size: 0.78rem; }
    .swap-status[data-status="Rejected"], .swap-status[data-status="Cancelled"] { color: #e11d48; }
    .swap-status[data-status="Approved"], .swap-status[data-status="Executed"] { color: #059669; }
    .swap-kind {
      display: inline-block;
      font-weight: 800;
      font-size: 0.75rem;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      background: #eef2ff;
      color: #4338ca;
    }
    .swap-kind[data-kind="TakeOnly"] { background: #fff7ed; color: #c2410c; }
  `]
})
export class ClassSwapListPageComponent implements OnInit {
  private readonly api = inject(ClassSwapApiService);
  private readonly toast = inject(ToastService);

  loading = true;
  data: ClassSwapListResponse | null = null;
  rows: ClassSwapListItem[] = [];
  view = 'all';
  readonly cols = ['number', 'kind', 'date', 'mine', 'other', 'status', 'created', 'actions'];

  get filters(): { id: string; label: string }[] {
    switch (this.data?.perspective) {
      case 'administration':
        return [
          { id: 'awaiting', label: 'بانتظار الموافقة' },
          { id: 'ready', label: 'جاهز للتنفيذ' },
          { id: 'executed', label: 'تم التنفيذ' },
          { id: 'rejected', label: 'مرفوض' },
          { id: 'all', label: 'الكل' }
        ];
      case 'department':
        return [
          { id: 'mine', label: 'بانتظار موافقتي' },
          { id: 'approved', label: 'تمت الموافقة' },
          { id: 'rejected', label: 'مرفوض' },
          { id: 'all', label: 'الكل' }
        ];
      default:
        return [
          { id: 'awaiting', label: 'بانتظار الموافقة' },
          { id: 'approved', label: 'معتمد' },
          { id: 'rejected', label: 'مرفوض' },
          { id: 'executed', label: 'تم التنفيذ' },
          { id: 'all', label: 'الكل' }
        ];
    }
  }

  ngOnInit(): void { this.load(true); }

  select(view: string): void {
    this.view = view;
    this.load(false);
  }

  private load(first: boolean): void {
    this.loading = true;
    this.api.list(first ? undefined : this.view).subscribe({
      next: data => {
        this.data = data;
        if (first) this.view = data.perspective === 'department' ? 'mine' : data.perspective === 'administration' ? 'awaiting' : 'awaiting';
        this.rows = first ? data.items.filter(row => this.matchesDefault(row, data.perspective)) : data.items;
        this.loading = false;
        if (first) this.load(false);
      },
      error: error => { this.loading = false; this.toast.fromError(error); }
    });
  }

  private matchesDefault(row: ClassSwapListItem, perspective: string): boolean {
    if (perspective === 'department') return row.status === 'PendingDepartmentHeadApproval';
    if (perspective === 'administration') return row.status === 'PendingAdministrationApproval';
    return row.status.startsWith('Pending');
  }
}
