import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmService } from '../core/confirm.service';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirm.pending(); as request) {
      <app-modal [title]="request.title" [width]="420" (closed)="confirm.close(false)">
        <p class="message">{{ request.message }}</p>
        <div class="actions">
          <button type="button" class="btn btn-secondary" (click)="confirm.close(false)">Cancel</button>
          <button
            type="button"
            class="btn"
            [class.btn-danger]="request.danger"
            [class.btn-primary]="!request.danger"
            (click)="confirm.close(true)"
          >
            {{ request.confirmLabel ?? 'Confirm' }}
          </button>
        </div>
      </app-modal>
    }
  `,
  styles: `
    .message {
      color: var(--text-2);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }
  `,
})
export class ConfirmDialogComponent {
  confirm = inject(ConfirmService);
}
