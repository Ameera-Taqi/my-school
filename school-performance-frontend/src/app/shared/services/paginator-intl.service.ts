import { Injectable, effect, inject } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { LanguageService } from '../../core/services/language.service';

/** Localised paginator labels that follow the app language. */
@Injectable()
export class AppPaginatorIntl extends MatPaginatorIntl {
  private readonly lang = inject(LanguageService);

  constructor() {
    super();
    // Re-label whenever the language signal changes (runs once immediately).
    effect(() => {
      this.lang.current();
      this.apply();
    });
  }

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    const en = this.lang.current() === 'en';
    if (length === 0 || pageSize === 0) {
      return en ? `Showing 0 of ${length} entries` : `عرض 0 من ${length} سجل`;
    }
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, length);
    return en
      ? `Showing ${start} to ${end} of ${length} entries`
      : `عرض ${start} إلى ${end} من ${length} سجل`;
  };

  private apply(): void {
    const en = this.lang.current() === 'en';
    this.itemsPerPageLabel = en ? 'Items per page' : 'عدد الصفوف';
    this.nextPageLabel = en ? 'Next page' : 'الصفحة التالية';
    this.previousPageLabel = en ? 'Previous page' : 'الصفحة السابقة';
    this.firstPageLabel = en ? 'First page' : 'الصفحة الأولى';
    this.lastPageLabel = en ? 'Last page' : 'الصفحة الأخيرة';
    this.changes.next();
  }
}
