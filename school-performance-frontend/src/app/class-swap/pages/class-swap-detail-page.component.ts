import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ClassSwapApiService, ClassSwapDetail, ClassSwapPreview } from '../services/class-swap-api.service';
import { ClassSwapPreviewComponent } from '../components/class-swap-preview.component';

@Component({
  selector: 'app-class-swap-detail-page',
  standalone: true,
  imports: [
    FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule,
    PageHeaderComponent, AppDatePipe, ClassSwapPreviewComponent
  ],
  template: `
    @if (detail) {
      <app-page-header [title]="detail.number" [subtitle]="detail.statusLabel + ' · ' + detail.date + ' · ' + detail.dayLabel">
        <a mat-button routerLink="/class-swaps">رجوع</a>
      </app-page-header>

      <div class="swap-detail">
        <section class="data-card">
          <h3>معلومات الطلب</h3>
          <p>نوع الطلب: {{ detail.kindLabel }}</p>
          <p>تاريخ الطلب: {{ detail.createdAt | appDate }}</p>
          <p>الحالة: {{ detail.statusLabel }}</p>
          <p>الشعبتان: {{ detail.requesterDepartment }} / {{ detail.counterpartyDepartment }}</p>
        </section>

        <section class="data-card">
          <h3>{{ detail.kind === 'TakeOnly' ? 'قبل وبعد أخذ التوقيت' : 'الجدول قبل التبديل وبعده' }}</h3>
          <app-class-swap-preview
            [beforeA]="detail.beforeRequester"
            [beforeB]="detail.beforeCounterparty"
            [afterA]="detail.afterRequester"
            [afterB]="detail.afterCounterparty">
          </app-class-swap-preview>
        </section>

        <section class="data-card">
          <h3>سبب الطلب</h3>
          <p>{{ detail.reason || '—' }}</p>
        </section>

        <section class="data-card">
          <h3>حالة الموافقات</h3>
          <ul>
            @for (step of detail.approvals; track step.stage + (step.departmentName || '')) {
              <li>
                <strong>{{ step.stageLabel }}{{ step.departmentName ? ' · ' + step.departmentName : '' }}</strong>
                <span>{{ step.decisionLabel }}</span>
                @if (step.actedBy) { <span>{{ step.actedBy }} · {{ step.actedAt | appDate }}</span> }
                @if (step.comment) { <span>{{ step.comment }}</span> }
              </li>
            }
          </ul>
        </section>

        <section class="data-card">
          <h3>سجل الإجراءات</h3>
          <ol>
            @for (event of detail.history; track event.at + event.action) {
              <li>
                <strong>{{ event.actionLabel }}</strong>
                <span>{{ event.userName }} · {{ event.roleLabel }} · {{ event.at | appDate }}</span>
                @if (event.comment) { <span>{{ event.comment }}</span> }
              </li>
            }
          </ol>
        </section>

        @if (execution && !execution.valid) {
          <section class="data-card">
            <h3>تعذر التنفيذ</h3>
            <ul class="swap-errors">
              @for (error of execution.errors; track error) { <li>{{ error }}</li> }
            </ul>
          </section>
        }

        @if (detail.canApprove || detail.canReject || detail.canCancel || detail.canExecute) {
          <section class="data-card">
            <h3>الإجراءات المتاحة</h3>
            @if (detail.canReject) {
              <mat-form-field appearance="outline" class="swap-field" subscriptSizing="dynamic">
                <mat-label>ملاحظة أو سبب الرفض</mat-label>
                <textarea matInput rows="2" [(ngModel)]="comment" maxlength="500"></textarea>
              </mat-form-field>
            }
            <div class="swap-actions">
              @if (detail.canApprove) { <button mat-flat-button color="primary" type="button" (click)="approve()">موافقة</button> }
              @if (detail.canReject) { <button mat-stroked-button color="warn" type="button" (click)="reject()">رفض</button> }
              @if (detail.canCancel) { <button mat-stroked-button type="button" (click)="cancel()">إلغاء الطلب</button> }
              @if (detail.canExecute) { <button mat-flat-button color="primary" type="button" (click)="execute()">تنفيذ التبديل</button> }
            </div>
          </section>
        }
      </div>
    }
  `,
  styles: [`
    .swap-detail { display: flex; flex-direction: column; gap: 0.85rem; }
    section { padding: 1rem 1.1rem; }
    h3 { margin: 0 0 0.65rem; font-size: 0.95rem; font-weight: 800; }
    p, li { margin: 0.2rem 0; line-height: 1.6; }
    li { display: flex; flex-direction: column; gap: 0.1rem; margin-bottom: 0.55rem; }
    .swap-field { width: 100%; }
    .swap-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .swap-errors { color: #e11d48; margin: 0; padding-inline-start: 1.1rem; }
  `]
})
export class ClassSwapDetailPageComponent implements OnInit {
  private readonly api = inject(ClassSwapApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  detail: ClassSwapDetail | null = null;
  execution: ClassSwapPreview | null = null;
  comment = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(id);
  }

  approve(): void {
    if (!this.detail) return;
    this.api.approve(this.detail.id, this.comment).subscribe({
      next: detail => { this.detail = detail; this.comment = ''; this.toast.success('تم تسجيل الموافقة.'); this.loadPreview(); },
      error: error => this.toast.fromError(error)
    });
  }

  reject(): void {
    if (!this.detail) return;
    this.confirm.confirmed({
      title: 'رفض الطلب',
      message: 'سيتوقف مسار الموافقات عند الرفض.',
      confirmText: 'رفض',
      danger: true
    }).subscribe(() => {
      this.api.reject(this.detail!.id, this.comment).subscribe({
        next: detail => { this.detail = detail; this.toast.success('تم رفض الطلب.'); },
        error: error => this.toast.fromError(error)
      });
    });
  }

  cancel(): void {
    if (!this.detail) return;
    this.confirm.confirmed({
      title: 'إلغاء الطلب',
      message: 'لن يُستكمل مسار الموافقة بعد الإلغاء.',
      confirmText: 'إلغاء الطلب',
      danger: true
    }).subscribe(() => {
      this.api.cancel(this.detail!.id).subscribe({
        next: detail => { this.detail = detail; this.toast.success('أُلغي الطلب.'); },
        error: error => this.toast.fromError(error)
      });
    });
  }

  execute(): void {
    if (!this.detail) return;
    this.api.executionPreview(this.detail.id).subscribe({
      next: preview => {
        this.execution = preview;
        if (!preview.valid) {
          this.toast.error(preview.errors[0] || 'يوجد تعارض يمنع التنفيذ.');
          return;
        }
        this.confirm.confirmed({
          title: 'تنفيذ التبديل',
          message: 'سيُطبَّق التبديل على هذا التاريخ فقط، ويبقى الجدول الأسبوعي كما هو.',
          confirmText: 'تنفيذ التبديل'
        }).subscribe(() => {
          this.api.execute(this.detail!.id).subscribe({
            next: detail => { this.detail = detail; this.execution = null; this.toast.success('تم تنفيذ التبديل لهذا التاريخ.'); },
            error: error => this.toast.fromError(error)
          });
        });
      },
      error: error => this.toast.fromError(error)
    });
  }

  private load(id: number): void {
    this.api.detail(id).subscribe({
      next: detail => { this.detail = detail; this.loadPreview(); },
      error: error => this.toast.fromError(error)
    });
  }

  private loadPreview(): void {
    if (!this.detail?.canExecute) { this.execution = null; return; }
    this.api.executionPreview(this.detail.id).subscribe({
      next: preview => this.execution = preview.valid ? null : preview,
      error: () => undefined
    });
  }
}
