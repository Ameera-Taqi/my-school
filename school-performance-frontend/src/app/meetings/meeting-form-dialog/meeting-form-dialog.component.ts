import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Meeting, Role } from '../../core/models';
import { RoleApiService } from '../../roles/services/role-api.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-meeting-form-dialog',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogModule, MatDatepickerModule, MatTimepickerModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل اجتماع' : 'اجتماع جديد' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>عنوان الاجتماع</mat-label>
          <input matInput formControlName="title" cdkFocusInitial autocomplete="off">
          <app-ui-icon name="title" matSuffix></app-ui-icon>
          <mat-error>عنوان الاجتماع مطلوب</mat-error>
        </mat-form-field>

        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>التاريخ</mat-label>
            <input matInput [matDatepicker]="datePicker" formControlName="meetingDay">
            <mat-datepicker-toggle matIconSuffix [for]="datePicker"></mat-datepicker-toggle>
            <mat-datepicker #datePicker></mat-datepicker>
            <mat-error>التاريخ مطلوب</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>الوقت</mat-label>
            <input matInput [matTimepicker]="timePicker" formControlName="meetingTime">
            <mat-timepicker-toggle matIconSuffix [for]="timePicker"></mat-timepicker-toggle>
            <mat-timepicker #timePicker interval="15m"></mat-timepicker>
            <mat-error>الوقت مطلوب</mat-error>
          </mat-form-field>
        </div>

        <div class="roles-group" [class.invalid]="form.controls.targetRoleKeys.invalid && form.controls.targetRoleKeys.touched">
          <div class="roles-group-header">
            <app-ui-icon name="groups"></app-ui-icon>
            <div>
              <strong>الأدوار المستهدفة</strong>
              <span>يظهر الاجتماع في تقويم من يملك أحد هذه الأدوار</span>
            </div>
          </div>
          <div class="roles-checkboxes">
            @for (role of roles; track role.roleKey) {
              <mat-checkbox
                [checked]="isRoleSelected(role.roleKey)"
                (change)="toggleRole(role.roleKey, $event.checked)">
                {{ role.roleName }}
              </mat-checkbox>
            }
          </div>
          @if (form.controls.targetRoleKeys.invalid && form.controls.targetRoleKeys.touched) {
            <p class="roles-error"><app-ui-icon name="error_outline"></app-ui-icon> اختر دوراً واحداً على الأقل</p>
          }
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>الحضور</mat-label>
          <textarea matInput formControlName="attendees" rows="2"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>جدول الأعمال</mat-label>
          <textarea matInput formControlName="agenda" rows="2"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>محضر الاجتماع</mat-label>
          <textarea matInput formControlName="minutes" rows="2"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>المهام الناتجة</mat-label>
          <textarea matInput formControlName="followUpTasks" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <app-ui-icon name="check"></app-ui-icon> {{ data ? 'حفظ التعديلات' : 'حفظ الاجتماع' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 0.35rem; padding-top: 0.5rem; min-width: 0; }
    .full-width { width: 100%; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 .75rem; }
    @media (max-width: 599px) { .two-col { grid-template-columns: 1fr; } }
    mat-dialog-content { max-height: 70vh; }
    .roles-group {
      border: 1px solid var(--sp-border);
      border-radius: var(--sp-radius-sm);
      padding: 0.9rem 1rem;
      margin-bottom: 1rem;
      background: var(--sp-primary-bg);
      transition: border-color 0.15s, background 0.15s;
    }
    .roles-group.invalid {
      border-color: var(--sp-danger);
      background: var(--sp-danger-bg);
    }
    .roles-group-header {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      margin-bottom: 0.75rem;
      color: var(--sp-primary);
    }
    .roles-group-header app-ui-icon { margin-top: 2px; }
    .roles-group-header strong { display: block; font-size: 0.95rem; margin-bottom: 0.15rem; }
    .roles-group-header span { display: block; font-size: 0.8rem; color: var(--sp-text-muted); line-height: 1.4; }
    .roles-checkboxes {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.35rem 0.75rem;
    }
    .roles-error {
      display: flex; align-items: center; gap: 0.3rem;
      margin: 0.6rem 0 0;
      color: var(--sp-danger);
      font-size: 0.8rem;
      app-ui-icon { font-size: 16px; width: 16px; height: 16px; }
    }
  `]
})
export class MeetingFormDialogComponent implements OnInit {
  readonly data: Meeting | null = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MeetingFormDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly roleApi = inject(RoleApiService);

  roles: Role[] = [];

  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    meetingDay: [null as Date | null, Validators.required],
    meetingTime: [null as Date | null, Validators.required],
    targetRoleKeys: [[] as string[], [requireAtLeastOneRole]],
    attendees: [''],
    agenda: [''],
    minutes: [''],
    followUpTasks: ['']
  });

  ngOnInit(): void {
    this.roleApi.getAll().subscribe(roles => {
      this.roles = roles.filter(r => r.active !== false);
    });

    if (this.data?.meetingDate) {
      const { date, time } = this.parseMeetingDate(this.data.meetingDate);
      this.form.patchValue({
        title: this.data.title,
        meetingDay: date,
        meetingTime: time,
        targetRoleKeys: this.data.targetRoleKeys ?? [],
        attendees: this.data.attendees,
        agenda: this.data.agenda,
        minutes: this.data.minutes,
        followUpTasks: this.data.followUpTasks
      });
    } else {
      const now = new Date();
      this.form.patchValue({
        meetingDay: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        meetingTime: new Date(1970, 0, 1, 9, 0)
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.dialogRef.close({
      ...this.data,
      title: v.title,
      meetingDate: this.combineDateTime(v.meetingDay, v.meetingTime),
      targetRoleKeys: v.targetRoleKeys,
      attendees: v.attendees,
      agenda: v.agenda,
      minutes: v.minutes,
      followUpTasks: v.followUpTasks,
      calendarEventId: this.data?.calendarEventId
    });
  }

  isRoleSelected(roleKey: string): boolean {
    return this.form.controls.targetRoleKeys.value.includes(roleKey);
  }

  toggleRole(roleKey: string, checked: boolean): void {
    const current = [...this.form.controls.targetRoleKeys.value];
    if (checked && !current.includes(roleKey)) {
      current.push(roleKey);
    } else if (!checked) {
      const index = current.indexOf(roleKey);
      if (index >= 0) current.splice(index, 1);
    }
    this.form.controls.targetRoleKeys.setValue(current);
    this.form.controls.targetRoleKeys.markAsTouched();
  }

  private parseMeetingDate(value: string): { date: Date | null; time: Date | null } {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return { date: null, time: null };
    }
    return {
      date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      time: new Date(1970, 0, 1, d.getHours(), d.getMinutes())
    };
  }

  private combineDateTime(date: Date | null, time: Date | null): string {
    if (!date || !time) return '';
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const da = String(date.getDate()).padStart(2, '0');
    const h = String(time.getHours()).padStart(2, '0');
    const mi = String(time.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${da}T${h}:${mi}`;
  }
}

function requireAtLeastOneRole(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string[] | null;
  return Array.isArray(value) && value.length > 0 ? null : { required: true };
}
