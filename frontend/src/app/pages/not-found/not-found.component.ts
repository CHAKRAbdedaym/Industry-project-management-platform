import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="card empty" style="margin-top: 3rem">
        <span class="empty-icon"><app-icon name="search" /></span>
        <h3>Page not found</h3>
        <p>The page you're looking for doesn't exist or has moved.</p>
        <a class="btn btn-primary" routerLink="/dashboard"><app-icon name="arrow-left" [size]="16" /> Back to dashboard</a>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
