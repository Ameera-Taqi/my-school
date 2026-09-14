import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { SystemSettings } from '../../core/models';

const STORAGE_KEY = 'school_system_settings';

const DEFAULT_SETTINGS: SystemSettings = {
  school: {
    name: 'مدرسة النجاح الخاصة',
    code: 'SCH-001',
    address: 'مسقط، سلطنة عُمان',
    phone: '96824000000',
    email: 'info@school.local',
    principalName: 'د. سالم الحارثي'
  },
  academic: {
    year: '2025-2026',
    currentTerm: 'الفصل الثاني',
    passMark: 50,
    maxGrade: 100
  },
  attendance: {
    lateAfterMinutes: 15,
    absentAlertThreshold: 3,
    countLateAsPartial: true
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    absenceAlerts: true,
    gradeAlerts: true,
    meetingReminders: true
  },
  system: {
    dateFormat: 'dd/MM/yyyy',
    maintenanceMode: false,
    sessionTimeoutMinutes: 60,
    defaultLanguage: 'ar'
  }
};

@Injectable({ providedIn: 'root' })
export class SettingsMockService {
  private settings: SystemSettings = this.loadFromStorage();

  getSettings(): Observable<SystemSettings> {
    return of(this.clone(this.settings)).pipe(delay(200));
  }

  saveSettings(settings: SystemSettings): Observable<SystemSettings> {
    this.settings = this.clone(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    return of(this.clone(this.settings)).pipe(delay(300));
  }

  resetToDefaults(): Observable<SystemSettings> {
    this.settings = this.clone(DEFAULT_SETTINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    return of(this.clone(this.settings)).pipe(delay(200));
  }

  private loadFromStorage(): SystemSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SystemSettings>;
        return {
          school: { ...DEFAULT_SETTINGS.school, ...parsed.school },
          academic: { ...DEFAULT_SETTINGS.academic, ...parsed.academic },
          attendance: { ...DEFAULT_SETTINGS.attendance, ...parsed.attendance },
          notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
          system: { ...DEFAULT_SETTINGS.system, ...parsed.system }
        };
      }
    } catch { /* ignore */ }
    return this.clone(DEFAULT_SETTINGS);
  }

  private clone(s: SystemSettings): SystemSettings {
    return JSON.parse(JSON.stringify(s));
  }
}
