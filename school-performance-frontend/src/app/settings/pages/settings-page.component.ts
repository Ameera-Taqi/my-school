import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { SettingsMockService } from '../services/settings-mock.service';
import { LanguageService } from '../../core/services/language.service';
import { SystemSettings } from '../../core/models';
import { UiIconComponent } from '../../shared/icons/ui-icon.component';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [UiIconComponent, ReactiveFormsModule, MatTabsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatTooltipModule, MatSlideToggleModule, MatProgressSpinnerModule, MatDividerModule, PageHeaderComponent],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss'
})
export class SettingsPageComponent implements OnInit {
  private readonly service = inject(SettingsMockService);
  private readonly langService = inject(LanguageService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  loading = true;
  saving = false;

  readonly termOptions = ['الفصل الأول', 'الفصل الثاني', 'الفصل الثالث'];
  readonly dateFormatOptions = [
    { value: 'dd/MM/yyyy', label: 'يوم/شهر/سنة (31/12/2026)' },
    { value: 'yyyy-MM-dd', label: 'سنة-شهر-يوم (2026-12-31)' }
  ];
  readonly languageOptions = [
    { value: 'ar', label: 'العربية' },
    { value: 'en', label: 'English' }
  ];

  form = this.fb.group({
    school: this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      address: [''],
      phone: [''],
      email: ['', Validators.email],
      principalName: ['']
    }),
    academic: this.fb.group({
      year: ['', Validators.required],
      currentTerm: ['', Validators.required],
      passMark: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
      maxGrade: [100, [Validators.required, Validators.min(1)]]
    }),
    attendance: this.fb.group({
      lateAfterMinutes: [15, [Validators.required, Validators.min(1)]],
      absentAlertThreshold: [3, [Validators.required, Validators.min(1)]],
      countLateAsPartial: [true]
    }),
    notifications: this.fb.group({
      emailEnabled: [true],
      smsEnabled: [false],
      absenceAlerts: [true],
      gradeAlerts: [true],
      meetingReminders: [true]
    }),
    system: this.fb.group({
      dateFormat: ['dd/MM/yyyy', Validators.required],
      maintenanceMode: [false],
      sessionTimeoutMinutes: [60, [Validators.required, Validators.min(5)]],
      defaultLanguage: ['ar', Validators.required]
    })
  });

  /** True when the tab group has validation errors and has been touched (shown as a badge after a failed save). */
  tabHasError(group: 'school' | 'academic' | 'attendance' | 'notifications' | 'system'): boolean {
    const g = this.form.controls[group];
    return g.invalid && g.touched;
  }

  ngOnInit(): void {
    this.service.getSettings().subscribe({
      next: (settings) => {
        this.form.patchValue(settings);
        this.langService.setLanguage(settings.system.defaultLanguage as 'ar' | 'en');
        this.loading = false;
      },
      error: (e) => { this.loading = false; this.toast.fromError(e); }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('يرجى تعبئة الحقول المطلوبة بشكل صحيح');
      return;
    }

    this.saving = true;
    const settings = this.form.getRawValue() as SystemSettings;
    this.langService.setLanguage(settings.system.defaultLanguage as 'ar' | 'en');
    this.service.saveSettings(settings).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('تم حفظ الإعدادات بنجاح');
      },
      error: (e) => { this.saving = false; this.toast.fromError(e); }
    });
  }

  resetDefaults(): void {
    this.confirm.confirmed({
      title: 'استعادة الإعدادات الافتراضية',
      message: 'سيتم استبدال جميع الإعدادات الحالية بالقيم الافتراضية وفقدان التعديلات الحالية.',
      confirmText: 'نعم، استعد الافتراضي',
      danger: true,
      icon: 'restart_alt'
    }).subscribe(() => {
      this.saving = true;
      this.service.resetToDefaults().subscribe({
        next: (settings) => {
          this.form.patchValue(settings);
          this.form.markAsUntouched();
          this.saving = false;
          this.toast.success('تمت استعادة الإعدادات الافتراضية');
        },
        error: (e) => { this.saving = false; this.toast.fromError(e); }
      });
    });
  }
}
