import { Directionality } from '@angular/cdk/bidi';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MAT_TOOLTIP_DEFAULT_OPTIONS } from '@angular/material/tooltip';
import { provideToastr } from 'ngx-toastr';
import { AppPaginatorIntl } from './shared/services/paginator-intl.service';
import { AppDirectionality } from './core/services/app-directionality';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    provideToastr({
      timeOut: 3200,
      positionClass: 'toast-top-center',
      preventDuplicates: true,
      progressBar: true,
      closeButton: true,
      newestOnTop: true,
      maxOpened: 4,
      autoDismiss: true,
      easeTime: 280
    }),
    AppDirectionality,
    { provide: Directionality, useExisting: AppDirectionality },
    { provide: MatPaginatorIntl, useClass: AppPaginatorIntl },
    { provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: { showDelay: 300, position: 'above' } }
  ]
};
