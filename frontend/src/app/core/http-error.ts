import { HttpErrorResponse } from '@angular/common/http';

/** Turns an HTTP failure into a sentence a user can act on. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Cannot reach the server. Check that the API gateway is running.';
    }
    if (typeof err.error?.message === 'string' && err.error.message) {
      return err.error.message;
    }
    if (err.status >= 500) {
      return 'The server ran into a problem. Please try again in a moment.';
    }
  }
  return fallback;
}
