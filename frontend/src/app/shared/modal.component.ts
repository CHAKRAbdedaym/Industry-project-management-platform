import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  input,
  output,
} from '@angular/core';
import { IconComponent } from './icon.component';

/** Accessible dialog shell: Esc and backdrop close it, focus moves inside and is restored after. */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (mousedown)="onBackdrop($event)">
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        [style.max-width.px]="width()"
      >
        <header>
          <div>
            <h2>{{ title() }}</h2>
            @if (subtitle()) {
              <p class="muted text-sm">{{ subtitle() }}</p>
            }
          </div>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" (click)="closed.emit()" aria-label="Close">
            <app-icon name="x" />
          </button>
        </header>
        <div class="content">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: rgba(10, 13, 25, 0.55);
      backdrop-filter: blur(3px);
      animation: fade 0.15s ease-out;
    }
    .dialog {
      width: 100%;
      max-height: calc(100vh - 2rem);
      overflow: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      animation: rise 0.18s ease-out;
    }
    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem 1.25rem 0;
    }
    header p {
      margin-top: 0.2rem;
    }
    .content {
      padding: 1.25rem;
    }
    @keyframes fade {
      from {
        opacity: 0;
      }
    }
    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
    }
  `,
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  title = input.required<string>();
  subtitle = input<string>('');
  width = input(520);
  closed = output<void>();

  /** Open dialogs, innermost last, so Esc only closes the one on top. */
  private static stack: ModalComponent[] = [];

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private previouslyFocused = document.activeElement as HTMLElement | null;

  ngAfterViewInit(): void {
    ModalComponent.stack.push(this);
    const first = this.host.nativeElement.querySelector<HTMLElement>(
      '.content input, .content textarea, .content select, .content button',
    );
    setTimeout(() => first?.focus());
  }

  ngOnDestroy(): void {
    ModalComponent.stack = ModalComponent.stack.filter((modal) => modal !== this);
    this.previouslyFocused?.focus?.();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (ModalComponent.stack.at(-1) === this) {
      this.closed.emit();
    }
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
