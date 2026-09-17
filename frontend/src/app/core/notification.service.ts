import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateNotificationRequest, Notification } from './models/notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly base = `${environment.apiBaseUrl}/notifications`;

  constructor(private http: HttpClient) {}

  listMine(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.base}/me`);
  }

  create(payload: CreateNotificationRequest): Observable<Notification> {
    return this.http.post<Notification>(this.base, payload);
  }

  markRead(id: string): Observable<Notification> {
    return this.http.patch<Notification>(`${this.base}/${id}/read`, {});
  }
}
