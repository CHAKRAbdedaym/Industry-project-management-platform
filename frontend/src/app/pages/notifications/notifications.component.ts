import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage } from '../../core/http-error';
import { Notification } from '../../core/models/notification.models';
import { NotificationService } from '../../core/notification.service';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { TimeAgoPipe } from '../../shared/time-ago.pipe';

type Filter = 'all' | 'unread';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, ModalComponent, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  loading = signal(true);
  error = signal<string | null>(null);
  notifications = signal<Notification[]>([]);
  filter = signal<Filter>('all');
  composing = signal(false);
  sending = signal(false);
  sendError = signal<string | null>(null);

  unread = computed(() => this.notifications().filter((n) => !n.read).length);
  visible = computed(() => this.notifications().filter((n) => this.filter() === 'all' || !n.read));

  form = this.fb.nonNullable.group({
    recipientEmail: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notificationService.listMine().subscribe({
      next: (list) => {
        this.notifications.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'Could not load notifications.'));
        this.loading.set(false);
      },
    });
  }

  markRead(notification: Notification): void {
    if (notification.read) {
      return;
    }
    this.notificationService.markRead(notification.id).subscribe({
      next: (updated) => this.notifications.update((list) => list.map((n) => (n.id === updated.id ? updated : n))),
      error: (err) => this.toast.error(errorMessage(err, 'Could not mark as read.')),
    });
  }

  markAllRead(): void {
    this.notificationService.markAllRead(this.notifications()).subscribe({
      next: () => {
        this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
        this.toast.success('All caught up');
      },
      error: (err) => {
        this.toast.error(errorMessage(err, 'Could not mark everything as read.'));
        this.load();
      },
    });
  }

  openCompose(): void {
    this.form.reset();
    this.sendError.set(null);
    this.composing.set(true);
  }

  send(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.sendError.set(null);
    const value = this.form.getRawValue();
    this.notificationService.create({ recipientEmail: value.recipientEmail.trim(), message: value.message.trim() }).subscribe({
      next: () => {
        this.sending.set(false);
        this.composing.set(false);
        this.toast.success(`Message sent to ${value.recipientEmail}`);
        this.load();
      },
      error: (err) => {
        this.sending.set(false);
        this.sendError.set(errorMessage(err, 'Could not send the message.'));
      },
    });
  }

  iconFor(n: Notification): string {
    if (/assigned you/i.test(n.message)) return 'target';
    if (/moved/i.test(n.message)) return 'activity';
    return 'mail';
  }
}
