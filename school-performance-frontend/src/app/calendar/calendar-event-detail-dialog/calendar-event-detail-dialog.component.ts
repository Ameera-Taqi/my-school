import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { CalendarEvent } from '../../core/models';
import { CALENDAR_EVENT_TYPE_LABELS } from '../../shared/constants/labels';
import { AuthService } from '../../core/services/auth.service';

export interface CalendarEventDetailDialogData {
  event: CalendarEvent;
}

@Component({
  selector: 'app-calendar-event-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule, AppDatePipe],
  template: `
    <div class="detail-head">
      <span class="head-icon" [style.background]="chipColor"><mat-icon>event</mat-icon></span>
      <div class="head-text">
        <h2 mat-dialog-title>{{ data.event.title }}</h2>
        <span class="chip type-chip" [style.background]="chipColor">{{ typeLabel }}</span>
      </div>
    </div>
    <mat-dialog-content class="detail-content">
      <dl class="fields">
        <div class="field">
          <dt>التاريخ</dt>
          <dd>{{ data.event.startDate | appDate }}@if (data.event.endDate && data.event.endDate !== data.event.startDate) { — {{ data.event.endDate | appDate }} }</dd>
        </div>
        @if (data.event.targetRoleKeys?.length) {
          <div class="field">
            <dt>الأدوار المستهدفة</dt>
            <dd class="chips">
              @for (key of data.event.targetRoleKeys; track key) { <span class="chip neutral">{{ key }}</span> }
            </dd>
          </div>
        }
        @if (data.event.description) {
          <div class="field">
            <dt>الوصف</dt>
            <dd>{{ data.event.description }}</dd>
          </div>
        }
        @if (data.event.notes) {
          <div class="field">
            <dt>ملاحظات</dt>
            <dd>{{ data.event.notes }}</dd>
          </div>
        }
        @if (data.event.createdByName) {
          <div class="field">
            <dt>أنشأه</dt>
            <dd>{{ data.event.createdByName }}</dd>
          </div>
        }
      </dl>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (canManage) {
        <div class="row-actions manage-actions">
          <button mat-icon-button matTooltip="تعديل" type="button" (click)="edit()"><mat-icon>edit</mat-icon></button>
          <button mat-icon-button class="danger" matTooltip="حذف" type="button" (click)="remove()"><mat-icon>delete</mat-icon></button>
        </div>
      }
      <button mat-flat-button color="primary" mat-dialog-close type="button">إغلاق</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .detail-head { display: flex; align-items: center; gap: 0.85rem; padding: 1.25rem 1.5rem 0; }
    .head-icon {
      width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0; color: #fff;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 26px; width: 26px; height: 26px; }
    }
    .head-text { display: flex; flex-direction: column; align-items: flex-start; gap: 0.35rem; min-width: 0; }
    .head-text h2 { margin: 0; padding: 0; font-size: 1.15rem; line-height: 1.4; }
    .head-text h2::before { display: none; }
    .type-chip { color: #fff; }
    .detail-content { line-height: 1.7; padding-top: 0.75rem; }
    .fields { margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }
    .field { display: flex; flex-direction: column; gap: 0.1rem; padding-bottom: 0.6rem; border-bottom: 1px solid var(--sp-border); }
    .field:last-child { border-bottom: none; padding-bottom: 0; }
    dt { font-size: 0.78rem; font-weight: 700; color: var(--sp-text-muted); }
    dd { margin: 0; color: var(--sp-text); }
    dd.chips { display: flex; flex-wrap: wrap; gap: 0.3rem; padding-top: 0.2rem; }
    .manage-actions { margin-inline-end: auto; }
  `]
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
