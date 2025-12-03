import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { HttpLoaderFactory } from './shared/infrastructure/i18n/translate-loader';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { BOOKING_REPOSITORY } from './features/booking/domain/repositories/booking.tokens';
import { BookingService } from './features/booking/services/booking.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';

/**
 * @summary Global application configuration providers.
 * Configures router, animations, HttpClient with interceptors, domain repository bindings,
 * and i18n with English as the default and fallback language.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: BOOKING_REPOSITORY, useExisting: BookingService },
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        },
        fallbackLang: 'en'
      }),
      MatSnackBarModule
    )
  ]
};
