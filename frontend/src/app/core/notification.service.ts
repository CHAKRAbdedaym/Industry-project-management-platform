import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateNotificationRequest, Notification } from './models/notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/notifications`;

  /** Shared unread counter for the sidebar badge; refreshed by every list call. */
  readonly unreadCount = signal(0);

  listMine(): Observable<Notification[]> {
    return this.http
      .get<Notification[]>(`${this.base}/me`)
      .pipe(tap((list) => this.unreadCount.set(list.filter((n) => !n.read).length)));
  }

  refreshUnreadCount(): void {
    this.listMine().subscribe({ error: () => undefined });
  }

  create(payload: CreateNotificationRequest): Observable<Notification> {
    return this.http.post<Notification>(this.base, payload);
  }

  markRead(id: string): Observable<Notification> {
    return this.http
      .patch<Notification>(`${this.base}/${id}/read`, {})
      .pipe(tap(() => this.unreadCount.update((count) => Math.max(0, count - 1))));
  }

  markAllRead(notifications: Notification[]): Observable<Notification[]> {
    const unread = notifications.filter((n) => !n.read);
    return unread.length ? forkJoin(unread.map((n) => this.markRead(n.id))) : of([]);
  }
}
