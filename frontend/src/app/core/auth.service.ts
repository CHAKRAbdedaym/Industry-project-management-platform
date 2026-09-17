import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from './models/auth.models';

const TOKEN_KEY = 'ipmp_access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  register(payload: RegisterRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${environment.apiBaseUrl}/auth/register`, payload);
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, payload)
      .pipe(tap((res) => localStorage.setItem(TOKEN_KEY, res.accessToken)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    const claims = this.decodeToken();
    if (!claims) {
      return false;
    }
    return claims.exp * 1000 > Date.now();
  }

  currentUserEmail(): string | null {
    return this.decodeToken()?.sub ?? null;
  }

  private decodeToken(): { sub: string; exp: number } | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }
}
