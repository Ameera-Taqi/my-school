import { Injectable, inject } from '@angular/core';
import { IndividualConfig, ToastrService } from 'ngx-toastr';
import { LanguageService } from '../../core/services/language.service';

/** App-wide toast notifications (ngx-toastr). Prefer this over MatSnackBar. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastr = inject(ToastrService);
  private readonly lang = inject(LanguageService);

  success(message: string, title?: string): void {
    this.toastr.success(message, title ?? '', this.opts(2800));
  }

  error(message?: string, title?: string): void {
    this.toastr.error(message || this.lang.translate('toast.genericError'), title ?? '', this.opts(4500));
  }

  info(message: string, title?: string): void {
    this.toastr.info(message, title ?? '', this.opts(3200));
  }

  warning(message: string, title?: string): void {
    this.toastr.warning(message, title ?? '', this.opts(3800));
  }

  /** Extracts the API error message when present, otherwise a generic one. */
  fromError(err: unknown): void {
    const message = (err as { error?: { message?: string } })?.error?.message;
    this.error(message);
  }

  private opts(timeOut: number): Partial<IndividualConfig> {
    return {
      timeOut,
      extendedTimeOut: 1200,
      progressBar: true,
      closeButton: true,
      newestOnTop: true,
      enableHtml: false,
      tapToDismiss: true
    };
  }
}
