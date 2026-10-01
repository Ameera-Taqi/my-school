import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '../../../shared/components/table-skeleton/table-skeleton.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { AuthService } from '../../../core/services/auth.service';
import { DepartmentScopeService } from '../../../core/services/department-scope.service';
import { PrepApprovalRequest, PrepApprovalStatus } from '../../../core/models';
import { LessonPrepMockService } from '../../services/lesson-prep-mock.service';
import { PrepApprovalService } from '../../services/prep-approval.service';
import { PrepApprovalNoteDialogComponent } from '../../dialogs/prep-approval-note-dialog.component';

type Audience = 'department' | 'administration';
type ViewId = 'pending' | 'approved' | 'rejected' | 'returned' | 'all';

@Component({
  selector: 'app-prep-approval-page',
  standalone: true,
  imports: [
    MatButtonModule, MatDialogModule, MatTableModule, PageHeaderComponent,
    EmptyStateComponent, TableSkeletonComponent, AppDatePipe
  ],
  template: `
    <app-page-header [title]="'اعتماد التحاضير'" [subtitle]="subtitle"></app-page-header>
    <div class="prep-filters">
      @for (filter of filters; track filter.id) {
        <button type="button" [class.is-on]="view === filter.id" (click)="select(filter.id)">{{ filter.label }}</button>
      }
    </div>
    @if (loading) {
      <app-table-skeleton [rows]="4" [columns]="6"></app-table-skeleton>
    } @else if (!rows.length) {
      <div class="data-card">
        <app-empty-state icon="fact_check" title="لا توجد تحاضير مرسلة للاعتماد" description="لا تظهر هنا إلا التحاضير التي أرسلها المعلم صراحةً إلى هذه الجهة."></app-empty-state>
      </div>
    } @else {
      <div class="data-card">
        <div class="table-scroll">
          <table mat-table [dataSource]="rows">
            <ng-container matColumnDef="teacher"><th mat-header-cell *matHeaderCellDef>المعلم</th><td mat-cell *matCellDef="let row">{{ row.teacherName }}</td></ng-container>
            <ng-container matColumnDef="lesson"><th mat-header-cell *matHeaderCellDef>التحضير</th><td mat-cell *matCellDef="let row">{{ row.lessonNumber ? row.lessonNumber + ' — ' : '' }}{{ row.title }}</td></ng-container>
            <ng-container matColumnDef="subject"><th mat-header-cell *matHeaderCellDef>المادة</th><td mat-cell *matCellDef="let row">{{ row.subject }} · {{ row.stageName }}</td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>الحالة</th><td mat-cell *matCellDef="let row"><span class="chip" [class]="chip(row.status)">{{ approvals.statusLabel(row.status) }}</span></td></ng-container>
            <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>تاريخ الإرسال</th><td mat-cell *matCellDef="let row">{{ row.submittedAt | appDate }}</td></ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>الإجراءات</th>
              <td mat-cell *matCellDef="let row" class="whitespace-nowrap">
                <button mat-button type="button" (click)="open(row)">عرض</button>
                @if (row.status === 'PENDING') {
                  <button mat-button type="button" color="primary" (click)="approve(row)">اعتماد</button>
                  <button mat-button type="button" color="warn" (click)="reject(row)">رفض</button>
                  <button mat-button type="button" (click)="returnForEdit(row)">إعادة للتعديل</button>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
        </div>
      </div>
    }
  `,
  styles: `
    .prep-filters { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.85rem; }
    .prep-filters button { border: 1px solid var(--color-border); background: var(--color-surface); border-radius: 999px; padding: 0.35rem 0.8rem; cursor: pointer; font-weight: 700; }
    .prep-filters button.is-on { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
  `
})
export class PrepApprovalPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly scope = inject(DepartmentScopeService);
  private readonly preps = inject(LessonPrepMockService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly approvals = inject(PrepApprovalService);

  readonly cols = ['teacher', 'lesson', 'subject', 'status', 'date', 'actions'];
  readonly filters: { id: ViewId; label: string }[] = [
    { id: 'pending', label: 'بانتظار اعتمادي' },
    { id: 'approved', label: 'معتمد' },
    { id: 'rejected', label: 'مرفوض' },
    { id: 'returned', label: 'معاد للتعديل' },
    { id: 'all', label: 'الكل' }
  ];

  loading = true;
  view: ViewId = 'pending';
  private all: PrepApprovalRequest[] = [];
  rows: PrepApprovalRequest[] = [];

  get subtitle(): string {
    return this.audience === 'department'
      ? 'التحاضير المرسلة إلى رئيس الشعبة فقط'
      : 'التحاضير المرسلة إلى الإدارة المدرسية فقط';
  }

  private get audience(): Audience {
    return this.route.snapshot.data['audience'] === 'administration' ? 'administration' : 'department';
  }

  ngOnInit(): void {
    this.auth.refreshCurrentUser().subscribe({ next: () => this.load(), error: () => this.load() });
  }

  select(view: ViewId): void {
    this.view = view;
    this.apply();
  }

  open(row: PrepApprovalRequest): void {
    const prep = this.preps.findById(row.prepId);
    this.dialog.open(PrepApprovalNoteDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      data: { request: row, missing: !prep }
    });
  }

  approve(row: PrepApprovalRequest): void {
    if (!row.id) return;
    this.confirm.open({
      title: 'اعتماد التحضير',
      message: 'سيتم اعتماد هذا التحضير دون إنشاء نسخة جديدة منه.',
      confirmText: 'اعتماد'
    }).subscribe(ok => {
      if (!ok || !row.id) return;
      this.approvals.decide(row.id, 'APPROVED', '').subscribe({
        next: () => { this.toast.success('تم اعتماد التحضير'); this.load(); },
        error: error => this.toast.fromError(error)
      });
    });
  }

  reject(row: PrepApprovalRequest): void {
    this.decideWithNote(row, 'REJECTED', 'رفض التحضير');
  }

  returnForEdit(row: PrepApprovalRequest): void {
    this.decideWithNote(row, 'RETURNED', 'إعادة التحضير للتعديل');
  }

  chip(status: PrepApprovalStatus): string {
    if (status === 'APPROVED') return 'chip success';
    if (status === 'REJECTED') return 'chip danger';
    if (status === 'RETURNED') return 'chip warning';
    return 'chip neutral';
  }

  private decideWithNote(row: PrepApprovalRequest, status: 'REJECTED' | 'RETURNED', title: string): void {
    if (!row.id) return;
    this.dialog.open(PrepApprovalNoteDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: { title, ask: true }
    }).afterClosed().subscribe((comment: string | undefined) => {
      if (comment == null || !row.id) return;
      this.approvals.decide(row.id, status, comment).subscribe({
        next: () => {
          this.toast.success(status === 'REJECTED' ? 'تم رفض التحضير' : 'أُعيد التحضير للتعديل');
          this.load();
        },
        error: error => this.toast.fromError(error)
      });
    });
  }

  private load(): void {
    this.loading = true;
    this.all = this.approvals.list().filter(item => this.inScope(item));
    this.apply();
    this.loading = false;
  }

  private apply(): void {
    this.rows = this.all.filter(item => {
      if (this.view === 'all') return true;
      if (this.view === 'pending') return item.status === 'PENDING';
      if (this.view === 'approved') return item.status === 'APPROVED';
      if (this.view === 'rejected') return item.status === 'REJECTED';
      return item.status === 'RETURNED';
    });
  }

  private inScope(item: PrepApprovalRequest): boolean {
    if (this.audience === 'administration') return item.authority === 'ADMINISTRATION';
    if (item.authority !== 'DEPARTMENT') return false;
    if (this.scope.isScoped()) {
      const departmentId = this.scope.departmentId();
      if (departmentId != null && item.departmentId != null) return item.departmentId === departmentId;
      return !!this.scope.departmentName() && item.departmentName === this.scope.departmentName();
    }
    return this.auth.hasAnyRole(['ADMIN']);
  }
}
