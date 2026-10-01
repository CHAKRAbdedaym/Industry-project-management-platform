import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from './models/auth.models';

const TOKEN_KEY = 'ipmp_access_token';

interface TokenClaims {
  sub: string;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  /** Mirrors the stored token so templates react to login/logout. */
  private readonly token = signal<string | null>(this.getToken());

  /** Full profile from auth-service; null until {@link loadProfile} resolves. */
  readonly user = signal<UserResponse | null>(null);

  readonly email = computed(() => decode(this.token())?.sub ?? null);
  readonly displayName = computed(() => this.user()?.fullName ?? this.email() ?? '');

  register(payload: RegisterRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${environment.apiBaseUrl}/auth/register`, payload);
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, payload)
      .pipe(tap((res) => this.setToken(res.accessToken)));
  }

  loadProfile(): void {
    this.http.get<UserResponse>(`${environment.apiBaseUrl}/auth/me`).subscribe({
      next: (user) => this.user.set(user),
      error: () => this.user.set(null),
    });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.user.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    const claims = decode(this.getToken());
    return !!claims && claims.exp * 1000 > Date.now();
  }

  currentUserEmail(): string | null {
    return decode(this.getToken())?.sub ?? null;
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
  }
}

function decode(token: string | null): TokenClaims | null {
  if (!token) {
    return null;
  }
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}
