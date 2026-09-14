import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { CalendarEvent } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';

export interface CalendarEventFormDialogData {
  event?: CalendarEvent;
  defaultDate?: string;
}

@Component({
  selector: 'app-calendar-event-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDialogModule, MatDatepickerModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.event ? 'تعديل حدث' : 'إضافة حدث' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>عنوان الحدث</mat-label>
          <input matInput formControlName="title" cdkFocusInitial autocomplete="off">
          <mat-error>عنوان الحدث مطلوب</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>وصف الحدث</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>تاريخ البداية</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate">
            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
            <mat-error>تاريخ البداية مطلوب</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>تاريخ النهاية (اختياري)</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate">
            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>
        </div>
        <div class="two-col">
          @if (canCreatePublic) {
            <mat-form-field appearance="outline">
              <mat-label>نوع الحدث</mat-label>
              <mat-select formControlName="eventType">
                <mat-option value="PERSONAL">شخصي</mat-option>
                <mat-option value="PUBLIC">مدرسي (عام)</mat-option>
              </mat-select>
              <mat-error>نوع الحدث مطلوب</mat-error>
            </mat-form-field>
          }
          <mat-form-field appearance="outline">
            <mat-label>اللون (اختياري)</mat-label>
            <input matInput type="color" formControlName="color" class="color-input">
            <mat-icon matSuffix>palette</mat-icon>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>ملاحظات</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <mat-icon>check</mat-icon> {{ data.event ? 'حفظ التعديلات' : 'إضافة الحدث' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 0.35rem; padding-top: 0.5rem; min-width: 0; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 0.75rem; }
    @media (max-width: 599px) { .two-col { grid-template-columns: 1fr; } }
    .full-width { width: 100%; }
    .color-input { height: 28px; padding: 0; cursor: pointer; }
    mat-dialog-content { max-height: 70vh; }
  `]
})
export class CalendarEventFormDialogComponent {
  readonly data: CalendarEventFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<CalendarEventFormDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly canCreatePublic = this.authService.hasPermission('calendar.public.create');

  form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    startDate: [null as Date | null, Validators.required],
    endDate: [null as Date | null],
    eventType: ['PERSONAL' as CalendarEvent['eventType'], Validators.required],
    color: ['#388e3c'],
    notes: ['']
  });

  constructor() {
    const event = this.data.event;
    if (event) {
      this.form.patchValue({
        title: event.title,
        description: event.description ?? '',
        startDate: this.parseDate(event.startDate),
        endDate: this.parseDate(event.endDate),
        eventType: event.eventType,
        color: event.color || (event.eventType === 'PUBLIC' ? '#1976d2' : '#388e3c'),
        notes: event.notes ?? ''
      });
    } else if (this.data.defaultDate) {
      this.form.patchValue({ startDate: this.parseDate(this.data.defaultDate) });
    }
    if (!this.canCreatePublic) {
      this.form.controls.eventType.setValue('PERSONAL');
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const startDate = this.toDateString(v.startDate);
    const endDate = v.endDate ? this.toDateString(v.endDate) : undefined;
    this.dialogRef.close({
      ...this.data.event,
      title: v.title!.trim(),
      description: v.description || undefined,
      startDate,
      endDate,
      eventType: v.eventType!,
      color: v.color || undefined,
      notes: v.notes || undefined
    } as CalendarEvent);
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const [year, month, day] = value.split('T')[0].split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  private toDateString(value: Date | null): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
