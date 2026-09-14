import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, filter, map } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog.component';
import { LanguageService } from '../../core/services/language.service';

/**
 * Replaces window.confirm(). Emits once with true when the user confirms;
 * completes silently when cancelled so callers can simply subscribe to the "yes" path.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(MatDialog);
  private readonly lang = inject(LanguageService);

  open(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog.open(ConfirmDialogComponent, {
      data,
      width: '420px',
      maxWidth: '95vw',
      direction: this.lang.direction(),
      autoFocus: false,
      restoreFocus: true
    }).afterClosed().pipe(map(result => result === true));
  }

  /** Shorthand for a destructive delete prompt naming the item. */
  delete(itemName: string, entityLabel = ''): Observable<boolean> {
    const what = entityLabel ? `${entityLabel} ` : '';
    return this.open({
      title: `حذف ${what}`.trim(),
      message: 'سيتم حذف هذا العنصر نهائياً ولا يمكن التراجع عن هذه الخطوة.',
      itemName,
      danger: true,
      confirmText: 'نعم، احذف'
    });
  }

  /** Emits only when confirmed. */
  confirmed(data: ConfirmDialogData): Observable<true> {
    return this.open(data).pipe(filter((ok): ok is true => ok));
  }

  deleteConfirmed(itemName: string, entityLabel = ''): Observable<true> {
    return this.delete(itemName, entityLabel).pipe(filter((ok): ok is true => ok));
  }
}
