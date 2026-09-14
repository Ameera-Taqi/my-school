import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LanguageService } from '../../core/services/language.service';

/** Consistent, color-coded snack bars. Use instead of MatSnackBar directly. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly lang = inject(LanguageService);

  success(message: string): void {
    this.show(message, 'toast-success', 2500);
  }

  error(message?: string): void {
    this.show(message || this.lang.translate('toast.genericError'), 'toast-error', 4500);
  }

  info(message: string): void {
    this.show(message, 'toast-info', 3000);
  }

  /** Extracts the API error message when present, otherwise a generic one. */
  fromError(err: unknown): void {
    const message = (err as { error?: { message?: string } })?.error?.message;
    this.error(message);
  }

  private show(message: string, panelClass: string, duration: number): void {
    this.snackBar.open(message, this.lang.translate('common.close'), {
      duration,
      panelClass,
      direction: this.lang.direction(),
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}
