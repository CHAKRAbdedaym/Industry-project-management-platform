import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationService } from '../../core/notification.service';
import { Notification } from '../../core/models/notification.models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  notifications: Notification[] = [];
  loading = true;
  errorMessage: string | null = null;
  sending = false;
  sentMessage: string | null = null;

  form = this.fb.group({
    recipientEmail: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.notificationService.listMine().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'Failed to load notifications.';
        this.loading = false;
      },
    });
  }

  send(): void {
    if (this.form.invalid) {
      return;
    }

    this.sending = true;
    this.sentMessage = null;

    this.notificationService
      .create(this.form.getRawValue() as { recipientEmail: string; message: string })
      .subscribe({
        next: () => {
          this.sending = false;
          this.sentMessage = 'Notification sent.';
          this.form.reset();
          this.load();
        },
        error: (err) => {
          this.sending = false;
          this.errorMessage = err.error?.message ?? 'Failed to send notification.';
        },
      });
  }

  markRead(notification: Notification): void {
    this.notificationService.markRead(notification.id).subscribe({
      next: (updated) => {
        this.notifications = this.notifications.map((n) => (n.id === updated.id ? updated : n));
      },
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'Failed to mark as read.';
      },
    });
  }
}
