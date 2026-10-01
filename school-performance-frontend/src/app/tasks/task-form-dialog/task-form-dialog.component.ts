import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { AssignableUser, SchoolTask } from '../../core/models';
import { TaskApiService } from '../services/task-api.service';
import { ToastService } from '../../shared/services/toast.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-task-form-dialog',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>{{ data.task ? 'تعديل مهمة' : 'إسناد مهمة' }}</h2>
    <mat-dialog-content class="max-h-[70vh]">
      <form [formGroup]="form" class="flex min-w-0 flex-col gap-[0.35rem] pt-2" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>عنوان المهمة</mat-label>
          <input matInput formControlName="title" cdkFocusInitial autocomplete="off">
          <mat-error>عنوان المهمة مطلوب</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>وصف المهمة</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
          <mat-error>وصف المهمة مطلوب</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>المكلف بالمهمة</mat-label>
          <mat-select formControlName="assigneeIds" multiple>
            @if (users.length > 1) {
              <mat-option [value]="-1" (click)="selectAll($event)">كل المستخدمين المتاحين</mat-option>
            }
            @for (user of users; track user.id) {
              <mat-option [value]="user.id">{{ user.fullName }} · {{ user.roleLabel }}</mat-option>
            }
          </mat-select>
          <mat-error>اختر مكلفاً واحداً على الأقل</mat-error>
        </mat-form-field>
        <div class="grid grid-cols-2 gap-x-3 max-[599px]:grid-cols-1">
          <mat-form-field appearance="outline">
            <mat-label>تاريخ الاستحقاق</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="dueDate">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>الأولوية</mat-label>
            <mat-select formControlName="priority">
              <mat-option value="LOW">منخفضة</mat-option>
              <mat-option value="MEDIUM">متوسطة</mat-option>
              <mat-option value="HIGH">عالية</mat-option>
              <mat-option value="URGENT">عاجلة</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>ملاحظات</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">
        <app-ui-icon name="check"></app-ui-icon> {{ data.task ? 'حفظ' : 'إسناد' }}
      </button>
    </mat-dialog-actions>
  `
})
export class TaskFormDialogComponent implements OnInit {
  readonly data: { task?: SchoolTask | null } = inject(MAT_DIALOG_DATA) ?? {};
  private readonly dialogRef = inject(MatDialogRef<TaskFormDialogComponent, SchoolTask | undefined>);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(TaskApiService);
  private readonly toast = inject(ToastService);

  users: AssignableUser[] = [];
  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    assigneeIds: [[] as number[], Validators.required],
    dueDate: [null as Date | null],
    priority: ['MEDIUM' as SchoolTask['priority'], Validators.required],
    notes: ['']
  });

  ngOnInit(): void {
    this.api.assignableUsers().subscribe({
      next: users => {
        this.users = users;
        if (!users.length) this.toast.error('لا يوجد مستخدمون يمكنك إسناد المهام إليهم حسب الهيكل التنظيمي.');
      },
      error: error => this.toast.fromError(error)
    });
    const task = this.data.task;
    if (task) {
      this.form.patchValue({
        title: task.title,
        description: task.description,
        assigneeIds: task.assignees?.map(a => a.userId) ?? task.assigneeIds ?? [],
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        priority: task.priority,
        notes: task.notes ?? ''
      });
    }
  }

  selectAll(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.form.controls.assigneeIds.setValue(this.users.map(u => u.id));
  }

  save(): void {
    const ids = (this.form.controls.assigneeIds.value || []).filter(id => id > 0);
    this.form.controls.assigneeIds.setValue(ids);
    if (this.form.invalid || !ids.length) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const dueDate = v.dueDate instanceof Date ? v.dueDate.toISOString().slice(0, 10) : (v.dueDate ? String(v.dueDate).slice(0, 10) : '');
    this.dialogRef.close({
      ...this.data.task,
      title: v.title.trim(),
      description: v.description.trim(),
      assigneeIds: ids,
      assignee: '',
      dueDate,
      priority: v.priority,
      notes: v.notes.trim(),
      status: this.data.task?.status ?? 'NEW'
    });
  }
}
