import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { PrepApprovalRequest } from '../../core/models';
import { LessonPrepMockService } from '../services/lesson-prep-mock.service';

export interface PrepApprovalNoteData {
  title?: string;
  ask?: boolean;
  request?: PrepApprovalRequest;
  missing?: boolean;
}

@Component({
  selector: 'app-prep-approval-note-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, AppDatePipe],
  template: `
    <h2 mat-dialog-title>{{ data.title || data.request?.title || 'التحضير' }}</h2>
    <mat-dialog-content>
      @if (data.request) {
        <p class="m-0 text-[0.9rem]">{{ data.request.teacherName }} · {{ data.request.subject }} · {{ data.request.stageName }}</p>
        @if (data.request.note) {
          <p class="mt-2 mb-0 text-[0.85rem]">{{ data.request.note }}</p>
        }
        @if (data.missing) {
          <p class="mt-2 mb-0 text-[0.85rem] text-danger">ملف التحضير الأصلي لم يعد متاحاً. يبقى سجل الاعتماد محفوظاً.</p>
        } @else {
          <button mat-stroked-button type="button" class="mt-3" (click)="openFile()">فتح الملف</button>
        }
        <ol class="mt-3 mb-0 list-none p-0">
          @for (event of data.request.events; track event.at + event.action) {
            <li class="mb-2 text-[0.85rem]">
              <strong>{{ event.actionLabel }}</strong>
              · {{ event.userName }} · {{ event.roleLabel }} · {{ event.at | appDate }}
              @if (event.comment) { <span class="block text-muted">{{ event.comment }}</span> }
            </li>
          }
        </ol>
      }
      @if (data.ask) {
        <mat-form-field appearance="outline" class="mt-2 w-full">
          <mat-label>ملاحظة</mat-label>
          <textarea matInput rows="3" maxlength="500" [(ngModel)]="comment"></textarea>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>إغلاق</button>
      @if (data.ask) {
        <button mat-flat-button color="primary" type="button" (click)="confirm()">تأكيد</button>
      }
    </mat-dialog-actions>
  `
})
export class PrepApprovalNoteDialogComponent {
  readonly data = inject<PrepApprovalNoteData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PrepApprovalNoteDialogComponent, string | undefined>);
  private readonly preps = inject(LessonPrepMockService);
  comment = '';

  openFile(): void {
    const prepId = this.data.request?.prepId;
    const prep = prepId == null ? undefined : this.preps.findById(prepId);
    if (prep) this.preps.download(prep);
  }

  confirm(): void {
    this.dialogRef.close(this.comment);
  }
}
