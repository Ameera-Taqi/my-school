import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';

/**
 * One date format for the whole app: "9 سبتمبر 2026" (Arabic month names, Latin digits)
 * or "9 Sep 2026" in English mode. Accepts ISO strings (yyyy-MM-dd or full ISO) and Date objects.
 * Optional 'withTime' shows the time, 'short' gives dd/MM/yyyy.
 */
@Pipe({ name: 'appDate', standalone: true, pure: false })
export class AppDatePipe implements PipeTransform {
  private readonly lang = inject(LanguageService);

  transform(value: string | Date | null | undefined, mode: 'default' | 'withTime' | 'short' = 'default'): string {
    if (!value) return '—';
    const date = typeof value === 'string' ? parseDate(value) : value;
    if (!date || isNaN(date.getTime())) return typeof value === 'string' ? value : '—';

    const locale = this.lang.current() === 'en' ? 'en-GB' : 'ar-u-nu-latn';
    const options: Intl.DateTimeFormatOptions = mode === 'short'
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric' };
    if (mode === 'withTime') {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Intl.DateTimeFormat(locale, options).format(date);
  }
}

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}
