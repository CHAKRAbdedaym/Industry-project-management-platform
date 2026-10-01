import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="'toast ' + toast.kind" role="status">
          <app-icon [name]="toast.kind === 'success' ? 'check-circle' : toast.kind === 'error' ? 'alert' : 'info'" />
          <span>{{ toast.message }}</span>
          <button type="button" (click)="toasts.dismiss(toast.id)" aria-label="Dismiss">
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .stack {
      position: fixed;
      right: 1.25rem;
      bottom: 1.25rem;
      z-index: 200;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: min(400px, calc(100vw - 2rem));
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.75rem 0.85rem;
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
      border-left: 3px solid var(--primary);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      font-size: 0.875rem;
      animation: slide 0.2s ease-out;
    }
    .toast.success {
      border-left-color: var(--success);
    }
    .toast.success app-icon {
      color: var(--success);
    }
    .toast.error {
      border-left-color: var(--danger);
    }
    .toast.error app-icon {
      color: var(--danger);
    }
    .toast.info app-icon {
      color: var(--primary-text);
    }
    span {
      flex: 1;
    }
    button {
      display: grid;
      place-items: center;
      padding: 0.2rem;
      border: 0;
      background: none;
      color: var(--text-3);
      cursor: pointer;
      border-radius: 4px;
    }
    button:hover {
      color: var(--text);
    }
    @keyframes slide {
      from {
        opacity: 0;
        transform: translateX(16px);
      }
    }
  `,
})
export class ToastContainerComponent {
  toasts = inject(ToastService);
}
