import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppUser, Department, Role } from '../../core/models';
import { RoleApiService } from '../../roles/services/role-api.service';
import { DepartmentApiService } from '../../departments/services/department-api.service';

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule,
    MatButtonModule, MatDialogModule, MatSlideToggleModule, MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'تعديل مستخدم' : 'إضافة مستخدم' }}</h2>
    <mat-dialog-content>
      @if (rolesLoading) {
        <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {
        <form [formGroup]="form" class="dialog-form" (ngSubmit)="save()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>الاسم الكامل</mat-label>
            <input matInput formControlName="fullName" cdkFocusInitial autocomplete="off">
            <mat-error>الاسم مطلوب</mat-error>
          </mat-form-field>

          <div class="two-col">
            <mat-form-field appearance="outline">
              <mat-label>اسم المستخدم</mat-label>
              <input matInput formControlName="username" [readonly]="!!data" autocomplete="off" dir="ltr">
              <mat-icon matSuffix>badge</mat-icon>
              @if (form.controls.username.hasError('required')) { <mat-error>اسم المستخدم مطلوب</mat-error> }
              @if (form.controls.username.hasError('pattern')) { <mat-error>حروف إنجليزية وأرقام و . _ - فقط</mat-error> }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>البريد الإلكتروني</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="off" dir="ltr">
              <mat-icon matSuffix>mail</mat-icon>
              @if (form.controls.email.hasError('required')) { <mat-error>البريد مطلوب</mat-error> }
              @if (form.controls.email.hasError('email')) { <mat-error>صيغة البريد غير صحيحة</mat-error> }
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ data ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور' }}</mat-label>
            <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" autocomplete="new-password" dir="ltr">
            <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword" [attr.aria-label]="hidePassword ? 'إظهار' : 'إخفاء'">
              <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-hint>{{ data ? 'اتركه فارغاً للإبقاء على كلمة المرور الحالية' : '6 أحرف على الأقل' }}</mat-hint>
            @if (form.controls.password.hasError('required')) { <mat-error>كلمة المرور مطلوبة</mat-error> }
            @if (form.controls.password.hasError('minlength')) { <mat-error>6 أحرف على الأقل</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>الأدوار</mat-label>
            <mat-select formControlName="roleIds" multiple (selectionChange)="updateDepartmentValidators()">
              @for (role of roles; track role.id) {
                <mat-option [value]="role.id">{{ role.roleName }}</mat-option>
              }
            </mat-select>
            <mat-hint>يمكن اختيار أكثر من دور</mat-hint>
            <mat-error>اختر دوراً واحداً على الأقل</mat-error>
          </mat-form-field>

          @if (isTeacherRole) {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>القسم</mat-label>
              <mat-select formControlName="departmentId">
                @for (dept of departments; track dept.id) {
                  <mat-option [value]="dept.id">{{ dept.name }}</mat-option>
                }
              </mat-select>
              <mat-hint>سيُنشأ ملف معلم مرتبط بهذا القسم تلقائياً</mat-hint>
              <mat-error>القسم مطلوب للمعلم</mat-error>
            </mat-form-field>
          }

          <mat-slide-toggle formControlName="active" class="active-toggle">الحساب نشط</mat-slide-toggle>
        </form>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">إلغاء</button>
      <button mat-flat-button color="primary" type="button" (click)="save()" [disabled]="rolesLoading">
        <mat-icon>check</mat-icon> {{ data ? 'حفظ التعديلات' : 'إضافة المستخدم' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 0.35rem; padding-top: 0.5rem; min-width: 0; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    @media (max-width: 599px) { .two-col { grid-template-columns: 1fr; } }
    .full-width { width: 100%; }
    .loading { display: flex; justify-content: center; padding: 2rem; }
    .active-toggle { margin: 0.5rem 0 0.25rem; }
    mat-dialog-content { max-height: 70vh; }
  `]
})
export class UserFormDialogComponent implements OnInit {
  readonly data: AppUser | null = inject(MAT_DIALOG_DATA);
  roles: Role[] = [];
  departments: Department[] = [];
  rolesLoading = true;
  isTeacherRole = false;
  hidePassword = true;

  private readonly dialogRef = inject(MatDialogRef<UserFormDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly roleApi = inject(RoleApiService);
  private readonly departmentApi = inject(DepartmentApiService);

  form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]+$/)]],
    password: [''],
    roleIds: [[] as number[], Validators.required],
    departmentId: [null as number | null],
    active: [true]
  });

  ngOnInit(): void {
    if (!this.data) {
      this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    } else {
      this.form.controls.password.setValidators([Validators.minLength(6)]);
    }
    this.form.controls.password.updateValueAndValidity();

    forkJoin({
      roles: this.roleApi.getAll().pipe(catchError(() => of([] as Role[]))),
      departments: this.departmentApi.getAll().pipe(catchError(() => of([] as Department[])))
    }).subscribe(({ roles, departments }) => {
      this.roles = roles.filter(r => r.active !== false && r.id != null);
      this.departments = departments;
      this.patchForm();
      this.updateDepartmentValidators();
      this.rolesLoading = false;
    });
  }

  updateDepartmentValidators(): void {
    const selected = this.form.controls.roleIds.value ?? [];
    this.isTeacherRole = this.roles.some(r => r.roleKey === 'TEACHER' && selected.includes(r.id!));
    const departmentControl = this.form.controls.departmentId;
    if (this.isTeacherRole) {
      departmentControl.setValidators(Validators.required);
    } else {
      departmentControl.clearValidators();
      departmentControl.setValue(null);
    }
    departmentControl.updateValueAndValidity();
  }

  private patchForm(): void {
    if (!this.data) {
      const defaultRole = this.roles.find(r => r.roleKey === 'TEACHER') ?? this.roles[0];
      if (defaultRole?.id) this.form.patchValue({ roleIds: [defaultRole.id] });
      return;
    }

    let roleIds = this.data.roleIds?.length ? [...this.data.roleIds] : (this.data.roleId != null ? [this.data.roleId] : []);
    if (!roleIds.length && this.data.roleName) {
      const byName = this.roles.find(r => r.roleName === this.data!.roleName)?.id;
      if (byName) roleIds = [byName];
    }

    this.form.patchValue({
      fullName: this.data.fullName,
      email: this.data.email,
      username: this.data.username,
      roleIds,
      departmentId: this.data.departmentId ?? null,
      active: this.data.active
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const roleIds = raw.roleIds ?? [];
    const selectedRoles = this.roles.filter(r => roleIds.includes(r.id!));
    const selectedDepartment = this.departments.find(d => d.id === raw.departmentId);
    this.dialogRef.close({
      ...this.data,
      fullName: raw.fullName!.trim(),
      email: raw.email!.trim(),
      username: raw.username!.trim(),
      password: raw.password || undefined,
      roleId: undefined,
      roleIds,
      roleName: selectedRoles.map(r => r.roleName).join('، '),
      roleNames: selectedRoles.map(r => r.roleName),
      departmentId: this.isTeacherRole ? (raw.departmentId ?? undefined) : undefined,
      departmentName: this.isTeacherRole ? selectedDepartment?.name : undefined,
      active: raw.active ?? true
    } as AppUser);
  }
}
