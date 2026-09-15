import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { CalendarEvent } from '../../core/models';
import { CALENDAR_EVENT_TYPE_LABELS } from '../../shared/constants/labels';
import { AuthService } from '../../core/services/auth.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

export interface CalendarEventDetailDialogData {
  event: CalendarEvent;
}

@Component({
  selector: 'app-calendar-event-detail-dialog',
  standalone: true,
  imports: [UiIconComponent, MatDialogModule, MatButtonModule, MatTooltipModule, AppDatePipe],
  template: `
    <div class="flex items-center gap-[0.85rem] px-6 pt-5">
      <span class="flex size-[46px] shrink-0 items-center justify-center rounded-sp text-white" [style.background]="chipColor">
        <app-ui-icon name="event" class="size-[26px] text-[26px]"></app-ui-icon>
      </span>
      <div class="flex min-w-0 flex-col items-start gap-[0.35rem]">
        <h2 mat-dialog-title class="!m-0 !p-0 text-[1.15rem] leading-snug before:hidden">{{ data.event.title }}</h2>
        <span class="chip text-white" [style.background]="chipColor">{{ typeLabel }}</span>
      </div>
    </div>
    <mat-dialog-content class="pt-3 leading-7">
      <dl class="m-0 flex flex-col gap-[0.6rem]">
        <div class="flex flex-col gap-[0.1rem] border-b border-border pb-[0.6rem] last:border-b-0 last:pb-0">
          <dt class="text-[0.78rem] font-bold text-muted">التاريخ</dt>
          <dd class="m-0 text-text">{{ data.event.startDate | appDate }}@if (data.event.endDate && data.event.endDate !== data.event.startDate) { — {{ data.event.endDate | appDate }} }</dd>
        </div>
        @if (data.event.targetRoleKeys?.length) {
          <div class="flex flex-col gap-[0.1rem] border-b border-border pb-[0.6rem] last:border-b-0 last:pb-0">
            <dt class="text-[0.78rem] font-bold text-muted">الأدوار المستهدفة</dt>
            <dd class="m-0 flex flex-wrap gap-[0.3rem] pt-[0.2rem]">
              @for (key of data.event.targetRoleKeys; track key) { <span class="chip neutral">{{ key }}</span> }
            </dd>
          </div>
        }
        @if (data.event.description) {
          <div class="flex flex-col gap-[0.1rem] border-b border-border pb-[0.6rem] last:border-b-0 last:pb-0">
            <dt class="text-[0.78rem] font-bold text-muted">الوصف</dt>
            <dd class="m-0 text-text">{{ data.event.description }}</dd>
          </div>
        }
        @if (data.event.notes) {
          <div class="flex flex-col gap-[0.1rem] border-b border-border pb-[0.6rem] last:border-b-0 last:pb-0">
            <dt class="text-[0.78rem] font-bold text-muted">ملاحظات</dt>
            <dd class="m-0 text-text">{{ data.event.notes }}</dd>
          </div>
        }
        @if (data.event.createdByName) {
          <div class="flex flex-col gap-[0.1rem] border-b border-border pb-[0.6rem] last:border-b-0 last:pb-0">
            <dt class="text-[0.78rem] font-bold text-muted">أنشأه</dt>
            <dd class="m-0 text-text">{{ data.event.createdByName }}</dd>
          </div>
        }
      </dl>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (canManage) {
        <div class="row-actions me-auto">
          <button mat-icon-button matTooltip="تعديل" type="button" (click)="edit()"><app-ui-icon name="edit"></app-ui-icon></button>
          <button mat-icon-button class="danger" matTooltip="حذف" type="button" (click)="remove()"><app-ui-icon name="delete"></app-ui-icon></button>
        </div>
      }
      <button mat-flat-button color="primary" mat-dialog-close type="button">إغلاق</button>
    </mat-dialog-actions>
  `
})
export class CalendarEventDetailDialogComponent {
  readonly data: CalendarEventDetailDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<CalendarEventDetailDialogComponent>);
  private readonly authService = inject(AuthService);

  readonly typeLabels = CALENDAR_EVENT_TYPE_LABELS;

  get chipColor(): string {
    if (this.data.event.color) return this.data.event.color;
    if (this.data.event.targetRoleKeys?.length) return '#7b1fa2';
    return this.data.event.eventType === 'PUBLIC' ? '#1976d2' : '#388e3c';
  }

  get typeLabel(): string {
    if (this.data.event.targetRoleKeys?.length) return this.typeLabels['ROLE'];
    return this.typeLabels[this.data.event.eventType];
  }

  get canManage(): boolean {
    const e = this.data.event;
    if (e.eventType === 'PUBLIC') {
      if (e.targetRoleKeys?.length) {
        return this.authService.hasAnyPermission(['meetings.create', 'calendar.public.manage']);
      }
      return this.authService.hasPermission('calendar.public.manage');
    }
    return !!e.ownedByCurrentUser;
  }

  edit(): void {
    this.dialogRef.close({ action: 'edit', event: this.data.event });
  }

  remove(): void {
    this.dialogRef.close({ action: 'delete', event: this.data.event });
  }
}
