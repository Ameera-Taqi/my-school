import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../shared/services/toast.service';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

const REMEMBER_KEY = 'sp_remembered_username';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [UiIconComponent, CommonModule, ReactiveFormsModule, MatProgressSpinnerModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  loading = false;
  hidePassword = true;
  submitted = false;
  focused: 'username' | 'password' | null = null;
  readonly year = new Date().getFullYear();

  form = this.fb.nonNullable.group({
    username: [readRemembered(), Validators.required],
    password: ['', Validators.required],
    remember: [!!readRemembered()]
  });

  showError(controlName: 'username' | 'password'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.submitted);
  }

  showValid(controlName: 'username' | 'password'): boolean {
    const control = this.form.controls[controlName];
    return control.valid && !!control.value && (control.touched || this.submitted);
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('تحقق من الحقول المطلوبة');
      return;
    }

    this.loading = true;
    const { username, password, remember } = this.form.getRawValue();

    this.authService.login({ username: username.trim(), password }).subscribe({
      next: () => {
        this.loading = false;
        try {
          if (remember) localStorage.setItem(REMEMBER_KEY, username.trim());
          else localStorage.removeItem(REMEMBER_KEY);
        } catch { /* ignore storage errors */ }
        this.toast.success('تم تسجيل الدخول بنجاح');
        this.router.navigateByUrl(this.permissionService.getDefaultRoute());
      },
      error: (err) => {
        this.loading = false;
        let message = 'فشل تسجيل الدخول. حاول مرة أخرى.';
        if (err.status === 0) {
          message = 'تعذر الاتصال بالخادم. تأكد أن الـ API يعمل ثم حاول مجدداً.';
        } else if (err.status === 401) {
          message = err.error?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة.';
        } else if (err.error?.message) {
          message = err.error.message;
        }
        this.toast.error(message);
        this.form.controls.password.reset('');
      }
    });
  }
}

function readRemembered(): string {
  try { return localStorage.getItem(REMEMBER_KEY) ?? ''; } catch { return ''; }
}
