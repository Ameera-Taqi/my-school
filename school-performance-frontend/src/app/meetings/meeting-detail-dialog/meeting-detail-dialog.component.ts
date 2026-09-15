import { Component, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { Meeting } from '../../core/models';
import { RoleApiService } from '../../roles/services/role-api.service';
import { Role } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

export interface MeetingDetailDialogData {
  meeting: Meeting;
  canEdit?: boolean;
}

@Component({
  selector: 'app-meeting-detail-dialog',
  standalone: true,
  imports: [UiIconComponent, MatDialogModule, MatButtonModule, MatDividerModule, AppDatePipe],
  template: `
    <div class="flex items-center gap-[0.9rem] px-6 pt-5">
      <div class="flex size-12 shrink-0 items-center justify-center rounded-sp-sm bg-primary-light text-primary">
        <app-ui-icon name="groups" class="size-7 text-[28px]"></app-ui-icon>
      </div>
      <div class="min-w-0">
        <h2 mat-dialog-title class="!m-0 !p-0 text-[1.2rem] font-bold text-primary">{{ data.meeting.title }}</h2>
        <p class="mt-1 mb-0 flex flex-wrap items-center gap-2 text-[0.85rem] text-muted">
          {{ data.meeting.meetingDate | appDate:'withTime' }}
          @if (isUpcoming) { <span class="chip info">قادم</span> } @else { <span class="chip neutral">منتهٍ</span> }
        </p>
      </div>
    </div>

    <mat-dialog-content class="max-w-[560px] min-w-0 pt-2">
      <div class="mb-4 grid gap-[0.6rem]">
        <div class="flex items-start gap-3 rounded-sp-sm border border-border bg-primary-bg px-4 py-[0.7rem]">
          <app-ui-icon name="event" class="mt-0.5 text-primary-mid"></app-ui-icon>
          <div>
            <span class="mb-[0.15rem] block text-[0.75rem] text-muted">التاريخ والوقت</span>
            <span class="block leading-normal text-text">{{ data.meeting.meetingDate | appDate:'withTime' }}</span>
          </div>
        </div>
        <div class="flex items-start gap-3 rounded-sp-sm border border-border bg-primary-bg px-4 py-[0.7rem]">
          <app-ui-icon name="badge" class="mt-0.5 text-primary-mid"></app-ui-icon>
          <div>
            <span class="mb-[0.15rem] block text-[0.75rem] text-muted">الأدوار المستهدفة</span>
            <span class="block leading-normal text-text">{{ formatRoleLabels(data.meeting.targetRoleKeys) }}</span>
          </div>
        </div>
        <div class="flex items-start gap-3 rounded-sp-sm border border-border bg-primary-bg px-4 py-[0.7rem]">
          <app-ui-icon name="people" class="mt-0.5 text-primary-mid"></app-ui-icon>
          <div>
            <span class="mb-[0.15rem] block text-[0.75rem] text-muted">الحضور</span>
            <span class="block leading-normal text-text">{{ data.meeting.attendees || '—' }}</span>
          </div>
        </div>
      </div>

      <mat-divider></mat-divider>

      <section class="my-4">
        <h3 class="mb-2 flex items-center gap-2 text-[0.95rem] text-primary"><app-ui-icon name="list_alt" class="size-5 text-xl"></app-ui-icon> جدول الأعمال</h3>
        <p class="m-0 rounded-sp-sm border border-border bg-[#fafbfe] px-4 py-3 leading-7 whitespace-pre-wrap text-text">{{ data.meeting.agenda || '—' }}</p>
      </section>

      <section class="my-4">
        <h3 class="mb-2 flex items-center gap-2 text-[0.95rem] text-primary"><app-ui-icon name="description" class="size-5 text-xl"></app-ui-icon> محضر الاجتماع</h3>
        <p class="m-0 rounded-sp-sm border border-[#ffe082] bg-[#fff8e1] px-4 py-3 leading-7 whitespace-pre-wrap text-text">{{ data.meeting.minutes || 'لم يُسجَّل محضر بعد.' }}</p>
      </section>

      <section class="my-4">
        <h3 class="mb-2 flex items-center gap-2 text-[0.95rem] text-primary"><app-ui-icon name="task_alt" class="size-5 text-xl"></app-ui-icon> المهام الناتجة</h3>
        <p class="m-0 rounded-sp-sm border border-border bg-[#fafbfe] px-4 py-3 leading-7 whitespace-pre-wrap text-text">{{ data.meeting.followUpTasks || 'لا توجد مهام ناتجة.' }}</p>
      </section>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="gap-2 px-6 pt-3 pb-5">
      @if (data.canEdit) {
        <button mat-stroked-button color="primary" type="button" (click)="edit()">
          <app-ui-icon name="edit"></app-ui-icon>
          تعديل
        </button>
      }
      <button mat-flat-button color="primary" type="button" mat-dialog-close>إغلاق</button>
    </mat-dialog-actions>
  `
})
export class MeetingDetailDialogComponent implements OnInit {
  readonly data: MeetingDetailDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MeetingDetailDialogComponent>);
  private readonly roleApi = inject(RoleApiService);

  roleLabels = new Map<string, string>();

  get isUpcoming(): boolean {
    const d = new Date(this.data.meeting.meetingDate);
    return !Number.isNaN(d.getTime()) && d.getTime() >= Date.now();
  }

  ngOnInit(): void {
    this.roleApi.getAll().subscribe((roles: Role[]) => {
      roles.forEach(r => this.roleLabels.set(r.roleKey, r.roleName));
    });
  }

  formatRoleLabels(keys?: string[]): string {
    if (!keys?.length) return '—';
    return keys.map(k => this.roleLabels.get(k) ?? k).join('، ');
  }

  edit(): void {
    this.dialogRef.close({ action: 'edit', meeting: this.data.meeting });
  }
}
