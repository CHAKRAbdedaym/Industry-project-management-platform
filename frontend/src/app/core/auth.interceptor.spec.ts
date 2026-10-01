import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('attaches the bearer token to API calls', () => {
    localStorage.setItem('ipmp_access_token', 'abc');
    http.get('/api/projects').subscribe();
    expect(httpMock.expectOne('/api/projects').request.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('does not send a token to the login endpoint', () => {
    localStorage.setItem('ipmp_access_token', 'stale');
    http.post('/api/auth/login', {}).subscribe();
    expect(httpMock.expectOne('/api/auth/login').request.headers.has('Authorization')).toBeFalse();
  });

  it('ends the session and redirects to login on 401', () => {
    localStorage.setItem('ipmp_access_token', 'expired');
    http.get('/api/tasks').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/tasks').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(TestBed.inject(AuthService).getToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], jasmine.objectContaining({ queryParams: jasmine.any(Object) }));
  });

  it('leaves the session alone for a failed login', () => {
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    httpMock.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
