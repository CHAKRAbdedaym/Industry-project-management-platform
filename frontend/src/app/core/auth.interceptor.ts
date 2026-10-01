import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const token = auth.getToken();
  const isPublicAuthCall = PUBLIC_AUTH_PATHS.some((path) => req.url.endsWith(path));

  const authorized =
    token && !isPublicAuthCall ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authorized).pipe(
    catchError((err: unknown) => {
      // A 401 on a protected call means the token is missing, expired or was rejected:
      // end the session once and send the user back to sign in where they left off.
      if (err instanceof HttpErrorResponse && err.status === 401 && !isPublicAuthCall && auth.getToken()) {
        auth.logout();
        toast.info('Your session has expired. Please sign in again.');
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => err);
    }),
  );
};
