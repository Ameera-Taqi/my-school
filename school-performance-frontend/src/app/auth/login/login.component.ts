import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

const REMEMBER_KEY = 'sp_remembered_username';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [UiIconComponent, CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCheckboxModule, MatProgressSpinnerModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);

  loading = false;
  errorMessage = '';
  hidePassword = true;
  readonly year = new Date().getFullYear();

  form = this.fb.nonNullable.group({
    username: [readRemembered(), Validators.required],
    password: ['', Validators.required],
    remember: [!!readRemembered()]
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const { username, password, remember } = this.form.getRawValue();

    this.authService.login({ username: username.trim(), password }).subscribe({
      next: () => {
        this.loading = false;
        try {
          if (remember) localStorage.setItem(REMEMBER_KEY, username.trim());
          else localStorage.removeItem(REMEMBER_KEY);
        } catch { /* ignore storage errors */ }
        this.router.navigateByUrl(this.permissionService.getDefaultRoute());
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 0) {
          this.errorMessage = 'تعذر الاتصال بالخادم. تأكد أن الـ API يعمل ثم حاول مجدداً.';
        } else if (err.status === 401) {
          this.errorMessage = err.error?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة.';
        } else {
          this.errorMessage = err.error?.message || 'فشل تسجيل الدخول. حاول مرة أخرى.';
        }
        this.form.controls.password.reset('');
      }
    });
  }
}

function readRemembered(): string {
  try { return localStorage.getItem(REMEMBER_KEY) ?? ''; } catch { return ''; }
}
