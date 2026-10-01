import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchFieldComponent } from '../../shared/components/search-field/search-field.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../shared/components/table-skeleton/table-skeleton.component';
import { HasPermissionPipe } from '../../shared/pipes/has-permission.pipe';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';
import { RecordCategory, RecordItem, RecordListResponse, RecordsApiService } from '../services/records-api.service';
import { RecordFormDialogComponent, RecordFormResult } from '../dialogs/record-form-dialog.component';

type ViewId = 'mine' | 'awaiting' | 'approved' | 'returned' | 'all';

@Component({
  selector: 'app-records-list-page',
  standalone: true,
  imports: [
    FormsModule, RouterLink, MatButtonModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatTableModule,
    MatTooltipModule, PageHeaderComponent, SearchFieldComponent, EmptyStateComponent, TableSkeletonComponent,
    HasPermissionPipe, AppDatePipe, UiIconComponent
  ],
  template: `
    <app-page-header title="السجلات" subtitle="سجلك الخاص، وما أُحيل إليك للاعتماد حسب موقعك في الهيكل.">
      @if ('records.manage' | hasPermission) {
        <button mat-flat-button color="primary" type="button" (click)="openForm()">
          <app-ui-icon name="add"></app-ui-icon>
          إضافة سجل
        </button>
      }
    </app-page-header>

    @if (data) {
      <div class="record-summary">
        <article><span>إجمالي السجلات</span><strong>{{ data.summary.total }}</strong></article>
        <article><span>بانتظار الاعتماد</span><strong>{{ data.summary.pending }}</strong></article>
        <article><span>المعتمدة</span><strong>{{ data.summary.approved }}</strong></article>
        <article><span>المعادة للتعديل</span><strong>{{ data.summary.returned }}</strong></article>
      </div>
    }
    <div class="record-filters">
      @for (filter of filters; track filter.id) {
        <button type="button" [class.is-on]="view === filter.id" (click)="select(filter.id)">{{ filter.label }}</button>
      }
    </div>
    <div class="data-card">
      <div class="list-toolbar records-toolbar">
        <app-search-field
          placeholder="ابحث بالاسم أو الرقم أو المالك"
          (search)="onSearch($event)"
          class="records-toolbar__search"
        ></app-search-field>
        <div class="records-toolbar__filters">
          <mat-form-field appearance="outline" class="records-toolbar__field" subscriptSizing="dynamic">
            <mat-label>النوع</mat-label>
            <mat-select [(ngModel)]="categoryId" (selectionChange)="load()">
              <mat-option [value]="null">الكل</mat-option>
              @for (category of categories; track category.id) {
                <mat-option [value]="category.id">{{ category.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="records-toolbar__field" subscriptSizing="dynamic">
            <mat-label>الحالة</mat-label>
            <mat-select [(ngModel)]="status" (selectionChange)="load()">
              <mat-option value="">الكل</mat-option>
              <mat-option value="Draft">مسودة</mat-option>
              <mat-option value="PendingApproval">بانتظار الاعتماد</mat-option>
              <mat-option value="Approved">معتمد</mat-option>
              <mat-option value="Rejected">مرفوض</mat-option>
              <mat-option value="ReturnedForRevision">معاد للتعديل</mat-option>
              <mat-option value="Cancelled">ملغي</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>
      @if (loading) {
        <app-table-skeleton [rows]="4" [columns]="6"></app-table-skeleton>
      } @else if (!rows.length) {
        <app-empty-state icon="folder" title="لا توجد سجلات" description="الرفع لا يرسل السجل للاعتماد. يظهر هنا فقط ما يخصك أو ما أُحيل إليك."></app-empty-state>
      } @else {
        <div class="table-scroll">
          <table mat-table [dataSource]="rows">
            <ng-container matColumnDef="number"><th mat-header-cell *matHeaderCellDef>رقم السجل</th><td mat-cell *matCellDef="let row">{{ row.number }}</td></ng-container>
            <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>اسم السجل</th><td mat-cell *matCellDef="let row">{{ row.name }}</td></ng-container>
            <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>نوع السجل</th><td mat-cell *matCellDef="let row">{{ row.categoryName }}</td></ng-container>
            <ng-container matColumnDef="owner"><th mat-header-cell *matHeaderCellDef>المالك</th><td mat-cell *matCellDef="let row">{{ row.ownerName }}</td></ng-container>
            <ng-container matColumnDef="file"><th mat-header-cell *matHeaderCellDef>الملف</th><td mat-cell *matCellDef="let row">{{ row.fileName || '—' }}</td></ng-container>
            <ng-container matColumnDef="uploaded"><th mat-header-cell *matHeaderCellDef>تاريخ الرفع</th><td mat-cell *matCellDef="let row">{{ row.uploadedAt | appDate }}</td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>حالة الاعتماد</th><td mat-cell *matCellDef="let row"><span class="chip" [class]="chip(row.status)">{{ row.statusLabel }}</span></td></ng-container>
            <ng-container matColumnDef="authority"><th mat-header-cell *matHeaderCellDef>جهة الاعتماد</th><td mat-cell *matCellDef="let row">{{ row.authorityLabel || '—' }}</td></ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="w-px whitespace-nowrap">الإجراءات</th>
              <td mat-cell *matCellDef="let row" class="w-px whitespace-nowrap">
                <div class="row-actions">
                  <a mat-icon-button class="icon-view" [routerLink]="['/records', row.id]" matTooltip="عرض" aria-label="عرض">
                    <app-ui-icon name="visibility"></app-ui-icon>
                  </a>
                  <button mat-icon-button type="button" class="icon-download" matTooltip="تحميل" aria-label="تحميل" [disabled]="!row.fileName" (click)="download(row)">
                    <app-ui-icon name="download"></app-ui-icon>
                  </button>
                  @if (row.canEdit) {
                    <button mat-icon-button type="button" class="icon-edit" matTooltip="تعديل" aria-label="تعديل" (click)="openForm(row)">
                      <app-ui-icon name="edit"></app-ui-icon>
                    </button>
                  }
                  @if (row.canSubmit) {
                    <button mat-icon-button type="button" class="icon-send" matTooltip="إرسال للاعتماد" aria-label="إرسال للاعتماد" (click)="submit(row)">
                      <app-ui-icon name="fact_check"></app-ui-icon>
                    </button>
                  }
                  @if (row.canDelete) {
                    <button mat-icon-button type="button" class="danger" matTooltip="حذف" aria-label="حذف" (click)="remove(row)">
                      <app-ui-icon name="delete"></app-ui-icon>
                    </button>
                  }
                </div>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
        </div>
      }
    </div>
  `,
  styles: `
    .record-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; margin-bottom: 0.85rem; }
    @media (max-width: 720px) { .record-summary { grid-template-columns: 1fr 1fr; } }
    .record-summary article { background: #fff; border: 1px solid #f1f5f9; border-radius: 0.9rem; padding: 0.75rem 0.9rem; }
    .record-summary span { display: block; color: #64748b; font-size: 0.78rem; }
    .record-summary strong { font-size: 1.25rem; }
    .record-filters { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.85rem; }
    .record-filters button { border: 1px solid var(--color-border); background: #fff; border-radius: 999px; padding: 0.35rem 0.8rem; cursor: pointer; font-weight: 700; }
    .record-filters button.is-on { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
    .records-toolbar {
      align-items: flex-end;
      gap: 0.75rem 1rem;
    }
    .records-toolbar__search {
      flex: 1 1 16rem;
      min-width: 0;
      max-width: 28rem;
    }
    .records-toolbar__filters {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.65rem;
    }
    .records-toolbar__field {
      width: 11.5rem;
      margin: 0;
      flex: 0 0 auto;
    }
    .records-toolbar__field.mat-mdc-form-field {
      --mat-form-field-container-height: 42px;
      --mat-form-field-container-vertical-padding: 8px;
    }
    @media (max-width: 640px) {
      .records-toolbar__search { max-width: none; }
      .records-toolbar__field { flex: 1 1 9.5rem; width: auto; min-width: 9.5rem; }
    }
    .icon-view:not(:disabled) { color: #2563eb; --mdc-icon-button-icon-color: #2563eb; }
    .icon-download:not(:disabled) { color: var(--color-success, #16a34a); --mdc-icon-button-icon-color: var(--color-success, #16a34a); }
    .icon-edit:not(:disabled) { color: var(--color-warning, #d97706); --mdc-icon-button-icon-color: var(--color-warning, #d97706); }
    .icon-send:not(:disabled) { color: var(--color-primary); --mdc-icon-button-icon-color: var(--color-primary); }
  `
})
export class RecordsListPageComponent implements OnInit {
  private readonly api = inject(RecordsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly cols = ['number', 'name', 'type', 'owner', 'file', 'uploaded', 'status', 'authority', 'actions'];
  readonly filters: { id: ViewId; label: string }[] = [
    { id: 'mine', label: 'سجلاتي' },
    { id: 'awaiting', label: 'بانتظار اعتمادي' },
    { id: 'approved', label: 'تم اعتمادها' },
    { id: 'returned', label: 'معادة للتعديل' },
    { id: 'all', label: 'الكل' }
  ];
  view: ViewId = 'mine';
  query = '';
  status = '';
  categoryId: number | null = null;
  categories: RecordCategory[] = [];
  loading = true;
  data: RecordListResponse | null = null;
  rows: RecordItem[] = [];

  ngOnInit(): void {
    this.api.categories().subscribe({ next: rows => this.categories = rows });
    this.load();
  }

  select(view: ViewId): void {
    this.view = view;
    this.load();
  }

  onSearch(query: string): void {
    this.query = query;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.list(this.view, this.query, this.status, this.categoryId).subscribe({
      next: data => { this.data = data; this.rows = data.items; this.loading = false; },
      error: error => { this.loading = false; this.toast.fromError(error); }
    });
  }

  openForm(record?: RecordItem): void {
    this.dialog.open(RecordFormDialogComponent, {
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      data: { categories: this.categories, record }
    }).afterClosed().subscribe((result: RecordFormResult | undefined) => {
      if (!result) return;
      this.api.save({ ...result, id: record?.id, rowVersion: record?.rowVersion }).subscribe({
        next: () => { this.toast.success(record ? 'تم تحديث السجل' : 'تم حفظ السجل كمسودة'); this.load(); },
        error: error => this.toast.fromError(error)
      });
    });
  }

  submit(row: RecordItem): void {
    this.confirm.open({ title: 'إرسال للاعتماد', message: 'سيُحال السجل إلى المسؤول الأعلى حسب الهيكل التنظيمي.', confirmText: 'إرسال' })
      .subscribe(ok => {
        if (!ok) return;
        this.api.submit(row.id).subscribe({
          next: () => { this.toast.success('أُرسل السجل للاعتماد'); this.load(); },
          error: error => this.toast.fromError(error)
        });
      });
  }

  download(row: RecordItem): void {
    this.api.file(row.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = row.fileName || row.number;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: error => this.toast.fromError(error)
    });
  }

  remove(row: RecordItem): void {
    this.confirm.deleteConfirmed(row.name, 'السجل').subscribe(() => {
      this.api.remove(row.id).subscribe({
        next: () => { this.toast.success('تم حذف السجل'); this.load(); },
        error: error => this.toast.fromError(error)
      });
    });
  }

  chip(status: string): string {
    if (status === 'Approved') return 'chip success';
    if (status === 'Rejected') return 'chip danger';
    if (status === 'ReturnedForRevision' || status === 'PendingApproval') return 'chip warning';
    return 'chip neutral';
  }
}
