import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ToastService } from '../../shared/services/toast.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    PageHeaderComponent, TranslatePipe, UiIconComponent
  ],
  template: `
    <app-page-header [title]="'profile.title' | translate" [subtitle]="'profile.subtitle' | translate">
      <button mat-flat-button color="primary" type="button" (click)="save()" [disabled]="loading || saving">
        @if (saving) {
          <mat-spinner diameter="20"></mat-spinner> {{ 'profile.saving' | translate }}
        } @else {
          <ng-container><app-ui-icon name="save"></app-ui-icon> {{ 'profile.save' | translate }}</ng-container>
        }
      </button>
    </app-page-header>

    @if (loading) {
      <div class="data-card p-6" aria-busy="true">
        <span class="skeleton mb-5 block h-[18px] w-[200px]"></span>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 max-md:grid-cols-1">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) { <span class="skeleton mb-3 block h-[52px] rounded-sp-sm"></span> }
        </div>
      </div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="save()" class="data-card p-6">
        <h3 class="mb-[1.1rem] flex items-center gap-[0.6rem] text-base font-bold text-primary">
          <span class="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-primary-light text-primary-mid">
            <app-ui-icon name="badge" class="size-5 text-xl"></app-ui-icon>
          </span>
          {{ 'profile.account' | translate }}
        </h3>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 max-md:grid-cols-1">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'profile.username' | translate }}</mat-label>
            <input matInput [value]="username" readonly>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'profile.role' | translate }}</mat-label>
            <input matInput [value]="roleLabel" readonly>
          </mat-form-field>
          @if (department) {
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'profile.department' | translate }}</mat-label>
              <input matInput [value]="department" readonly>
            </mat-form-field>
          }
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'profile.fullName' | translate }}</mat-label>
            <input matInput formControlName="fullName" autocomplete="name">
            @if (form.controls.fullName.hasError('required') && form.controls.fullName.touched) {
              <mat-error>{{ 'profile.fullNameRequired' | translate }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'profile.email' | translate }}</mat-label>
            <input matInput formControlName="email" autocomplete="email">
            @if (form.controls.email.hasError('email') && form.controls.email.touched) {
              <mat-error>{{ 'profile.emailInvalid' | translate }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'profile.phone' | translate }}</mat-label>
            <input matInput formControlName="phone" autocomplete="tel">
          </mat-form-field>
        </div>

        <h3 class="mb-[0.35rem] mt-6 flex items-center gap-[0.6rem] border-t border-border pt-5 text-base font-bold text-primary">
          <span class="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-primary-light text-primary-mid">
            <app-ui-icon name="lock" class="size-5 text-xl"></app-ui-icon>
          </span>
          {{ 'profile.passwordSection' | translate }}
        </h3>
        <p class="mb-4 mt-0 text-[0.85rem] text-muted">{{ 'profile.passwordHint' | translate }}</p>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 max-md:grid-cols-1">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'profile.currentPassword' | translate }}</mat-label>
            <input matInput type="password" formControlName="currentPassword" autocomplete="current-password">
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'profile.newPassword' | translate }}</mat-label>
            <input matInput type="password" formControlName="newPassword" autocomplete="new-password">
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'profile.confirmPassword' | translate }}</mat-label>
            <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password">
          </mat-form-field>
        </div>
        @if (passwordError) {
          <p class="mb-0 mt-1 text-[0.85rem] text-danger">{{ passwordError }}</p>
        }
      </form>
    }
  `
})
export class ProfilePageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly lang = inject(LanguageService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  loading = true;
  saving = false;
  username = '';
  roleLabel = '';
  department = '';
  passwordError = '';

  readonly form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', Validators.email],
    phone: [''],
    currentPassword: [''],
    newPassword: [''],
    confirmPassword: ['']
  });

  ngOnInit(): void {
    this.auth.getProfile().subscribe({
      next: profile => {
        this.username = profile.username;
        this.roleLabel = this.lang.roleLabel(profile.roles?.[0], profile.roleNames?.[0]);
        this.department = profile.departmentName ?? '';
        this.form.patchValue({
          fullName: profile.fullName ?? '',
          email: profile.email ?? '',
          phone: profile.phone ?? ''
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error(this.lang.translate('profile.loadError'));
      }
    });
  }

  save(): void {
    this.passwordError = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const changingPassword = !!(value.currentPassword || value.newPassword || value.confirmPassword);
    if (changingPassword) {
      if (!value.currentPassword) {
        this.passwordError = this.lang.translate('profile.currentRequired');
        return;
      }
      if (value.newPassword.length < 6) {
        this.passwordError = this.lang.translate('profile.passwordShort');
        return;
      }
      if (value.newPassword !== value.confirmPassword) {
        this.passwordError = this.lang.translate('profile.passwordMismatch');
        return;
      }
    }

    this.saving = true;
    this.auth.updateProfile({
      fullName: value.fullName.trim(),
      email: value.email.trim() || null,
      phone: value.phone.trim() || null,
      currentPassword: changingPassword ? value.currentPassword : null,
      newPassword: changingPassword ? value.newPassword : null
    }).subscribe({
      next: profile => {
        this.form.patchValue({
          fullName: profile.fullName ?? '',
          email: profile.email ?? '',
          phone: profile.phone ?? '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        this.auth.refreshCurrentUser().subscribe({
          next: () => this.finishSave(),
          error: () => this.finishSave()
        });
      },
      error: (error: HttpErrorResponse) => {
        this.saving = false;
        const message = error.error?.message;
        this.toast.error(typeof message === 'string' && message ? message : this.lang.translate('profile.loadError'));
      }
    });
  }

  private finishSave(): void {
    this.saving = false;
    this.toast.success(this.lang.translate('profile.saved'));
  }
}
