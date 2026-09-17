import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

function buildToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS384', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('is not logged in with no stored token', () => {
    expect(service.isLoggedIn()).toBeFalse();
    expect(service.currentUserEmail()).toBeNull();
  });

  it('stores the access token and reports logged-in state after a successful login', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = buildToken({ sub: 'jane@example.com', exp: futureExp });

    service.login({ email: 'jane@example.com', password: 'password123' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ accessToken: token, expiresIn: 3600 });

    expect(service.isLoggedIn()).toBeTrue();
    expect(service.currentUserEmail()).toBe('jane@example.com');
  });

  it('reports logged-out for an expired token', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    const token = buildToken({ sub: 'jane@example.com', exp: pastExp });
    localStorage.setItem('ipmp_access_token', token);

    expect(service.isLoggedIn()).toBeFalse();
  });

  it('clears the token on logout', () => {
    localStorage.setItem('ipmp_access_token', 'some-token');
    service.logout();
    expect(service.getToken()).toBeNull();
  });
});
