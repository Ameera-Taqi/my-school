import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { PrepApprovalNoteDialogComponent } from '../../teacher-portal/dialogs/prep-approval-note-dialog.component';
import { RecordDetail, RecordsApiService } from '../services/records-api.service';

@Component({
  selector: 'app-record-detail-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatDialogModule, PageHeaderComponent, AppDatePipe],
  template: `
    <app-page-header [title]="detail?.name || 'السجل'" [subtitle]="detail ? detail.number + ' · ' + detail.statusLabel : ''">
      <a mat-button routerLink="/records">رجوع</a>
    </app-page-header>
    @if (detail) {
      <div class="data-card record-detail">
        <dl>
          <div><dt>النوع</dt><dd>{{ detail.categoryName }}</dd></div>
          <div><dt>المالك</dt><dd>{{ detail.ownerName }}</dd></div>
          <div><dt>تاريخ الرفع</dt><dd>{{ detail.uploadedAt | appDate:'withTime' }}</dd></div>
          <div><dt>آخر تحديث</dt><dd>{{ detail.updatedAt | appDate:'withTime' }}</dd></div>
          <div><dt>جهة الاعتماد</dt><dd>{{ detail.authorityLabel || '—' }}</dd></div>
        </dl>
        @if (detail.description) { <p>{{ detail.description }}</p> }
        @if (previewUrl && image) { <img class="preview" [src]="previewUrl" [alt]="detail.fileName || ''"> }
        @else if (previewUrl) { <iframe class="preview" [src]="previewUrl" title="معاينة الملف"></iframe> }
        @else { <p class="hint">لا تتوفر معاينة لهذا النوع. يمكنك تنزيل الملف.</p> }
        <div class="actions">
          <button mat-stroked-button type="button" (click)="download()">تحميل</button>
          @if (detail.canSubmit) { <button mat-flat-button color="primary" type="button" (click)="submit()">إرسال للاعتماد</button> }
          @if (detail.canCancel) { <button mat-stroked-button type="button" (click)="cancel()">إلغاء</button> }
          @if (detail.canDecide) {
            <button mat-flat-button color="primary" type="button" (click)="approve()">اعتماد</button>
            <button mat-stroked-button color="warn" type="button" (click)="reject()">رفض</button>
            <button mat-stroked-button type="button" (click)="sendBack()">إعادة للتعديل</button>
          }
        </div>
        <h3>سجل الإجراءات</h3>
        <ol>
          @for (event of detail.events; track event.at + event.action) {
            <li>
              <strong>{{ event.actionLabel }}</strong>
              <span>{{ event.userName }} · {{ event.roleLabel }} · {{ event.at | appDate:'withTime' }}</span>
              @if (event.comment) { <em>{{ event.comment }}</em> }
            </li>
          }
        </ol>
      </div>
    }
  `,
  styles: `
    .record-detail { padding: 1rem 1.1rem 1.25rem; }
    dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin: 0 0 1rem; }
    dt { color: #64748b; font-size: 0.78rem; }
    dd { margin: 0.15rem 0 0; font-weight: 800; }
    .preview { width: 100%; min-height: 480px; border: 1px solid #e2e8f0; border-radius: 0.85rem; background: #fff; }
    img.preview { min-height: 0; object-fit: contain; }
    .hint { color: #64748b; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.9rem 0 1.1rem; }
    ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    li { display: flex; flex-direction: column; gap: 0.15rem; padding-inline-start: 0.8rem; border-inline-start: 3px solid #c7d2fe; }
    li span, li em { color: #64748b; font-style: normal; font-size: 0.85rem; }
  `
})
export class RecordDetailPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(RecordsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly dialog = inject(MatDialog);
  private readonly sanitizer = inject(DomSanitizer);

  detail: RecordDetail | null = null;
  previewUrl: SafeResourceUrl | null = null;
  image = false;
  private blobUrl: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
  }

  download(): void {
    if (!this.detail) return;
    this.api.file(this.detail.id).subscribe(blob => this.saveBlob(blob, this.detail?.fileName || 'record'));
  }

  submit(): void {
    if (!this.detail) return;
    this.api.submit(this.detail.id).subscribe({
      next: () => { this.toast.success('أُرسل السجل للاعتماد'); this.load(); },
      error: error => this.toast.fromError(error)
    });
  }

  cancel(): void {
    if (!this.detail) return;
    this.api.cancel(this.detail.id).subscribe({
      next: () => { this.toast.success('أُلغي طلب الاعتماد'); this.load(); },
      error: error => this.toast.fromError(error)
    });
  }

  approve(): void {
    if (!this.detail) return;
    this.confirm.open({ title: 'اعتماد السجل', message: 'سيتم اعتماد هذا السجل.', confirmText: 'اعتماد' }).subscribe(ok => {
      if (!ok || !this.detail) return;
      this.api.approve(this.detail.id, '').subscribe({
        next: () => { this.toast.success('تم اعتماد السجل'); this.load(); },
        error: error => this.toast.fromError(error)
      });
    });
  }

  reject(): void { this.decide('reject', 'رفض السجل'); }
  sendBack(): void { this.decide('return', 'إعادة السجل للتعديل'); }

  private decide(kind: 'reject' | 'return', title: string): void {
    if (!this.detail) return;
    this.dialog.open(PrepApprovalNoteDialogComponent, { width: '480px', data: { title, ask: true } })
      .afterClosed().subscribe((comment: string | undefined) => {
        if (comment == null || !comment.trim() || !this.detail) {
          if (comment != null && !comment.trim()) this.toast.error('سبب القرار مطلوب.');
          return;
        }
        const call = kind === 'reject' ? this.api.reject(this.detail.id, comment) : this.api.returnForEdit(this.detail.id, comment);
        call.subscribe({
          next: () => { this.toast.success(kind === 'reject' ? 'تم رفض السجل' : 'أُعيد السجل للتعديل'); this.load(); },
          error: error => this.toast.fromError(error)
        });
      });
  }

  private load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.detail(id).subscribe({
      next: detail => {
        this.detail = detail;
        this.loadPreview(detail);
      },
      error: error => this.toast.fromError(error)
    });
  }

  private loadPreview(detail: RecordDetail): void {
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
    this.previewUrl = null;
    if (!detail.canPreview) return;
    this.image = (detail.contentType || '').startsWith('image/');
    this.api.file(detail.id).subscribe(blob => {
      this.blobUrl = URL.createObjectURL(blob);
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl);
    });
  }

  private saveBlob(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }
}
