import { Injectable, computed, signal } from '@angular/core';
import { AppLanguage, TRANSLATIONS } from '../i18n/translations';

const STORAGE_KEY = 'sp_language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly _lang = signal<AppLanguage>(this.load());

  readonly current = this._lang.asReadonly();
  readonly isEnglish = computed(() => this._lang() === 'en');
  readonly direction = computed(() => (this._lang() === 'ar' ? 'rtl' : 'ltr'));

  constructor() {
    this.apply(this._lang());
  }

  translate(key: string): string {
    const lang = this._lang();
    return TRANSLATIONS[lang][key] ?? TRANSLATIONS.ar[key] ?? key;
  }

  setLanguage(lang: AppLanguage): void {
    if (this._lang() === lang) return;
    this._lang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    this.apply(lang);
  }

  setEnglish(enabled: boolean): void {
    this.setLanguage(enabled ? 'en' : 'ar');
  }

  private load(): AppLanguage {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'ar';
  }

  private apply(lang: AppLanguage): void {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.body.dir = dir;
  }
}
