import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

/** Split-screen frame shared by the sign-in and sign-up pages. */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.css',
})
export class AuthLayoutComponent {
  heading = input.required<string>();
  subheading = input<string>('');

  readonly features = [
    { icon: 'kanban', title: 'Kanban boards', text: 'Drag tasks across To do, In progress and Done.' },
    { icon: 'bell', title: 'Real-time updates', text: 'Get notified the moment work is assigned to you.' },
    { icon: 'shield', title: 'Secure by design', text: 'Stateless JWT auth across independent microservices.' },
  ];
}
