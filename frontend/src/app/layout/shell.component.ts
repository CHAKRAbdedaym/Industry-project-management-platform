import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, interval } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { NotificationService } from '../core/notification.service';
import { ThemeService } from '../core/theme.service';
import { AvatarComponent } from '../shared/avatar.component';
import { IconComponent } from '../shared/icon.component';

const UNREAD_POLL_MS = 30_000;

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  notifications = inject(NotificationService);
  theme = inject(ThemeService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  sidebarOpen = signal(false);
  userMenuOpen = signal(false);

  readonly nav = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/projects', label: 'Projects', icon: 'folder' },
    { path: '/my-tasks', label: 'My tasks', icon: 'tasks' },
    { path: '/notifications', label: 'Notifications', icon: 'bell' },
  ];

  ngOnInit(): void {
    this.auth.loadProfile();
    this.notifications.refreshUnreadCount();

    interval(UNREAD_POLL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.notifications.refreshUnreadCount());

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.sidebarOpen.set(false);
        this.userMenuOpen.set(false);
      });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  closeMenus(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('.user-area')) {
      this.userMenuOpen.set(false);
    }
  }
}
