import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/http-error';
import { ToastService } from '../../core/toast.service';
import { AuthLayoutComponent } from '../../shared/auth-layout.component';
import { IconComponent } from '../../shared/icon.component';

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.component.html',
  styles: `
    .strength {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .bars {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      flex: 1;
    }
    .bars span {
      height: 4px;
      border-radius: 2px;
      background: var(--border);
      transition: background-color 0.2s;
    }
    .s1 .bars span:nth-child(-n + 1) {
      background: var(--danger);
    }
    .s2 .bars span:nth-child(-n + 2) {
      background: var(--warning);
    }
    .s3 .bars span:nth-child(-n + 3) {
      background: var(--status-todo);
    }
    .s4 .bars span {
      background: var(--success);
    }
    .strength-label {
      min-width: 58px;
      text-align: right;
    }
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
  });

  loading = signal(false);
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);

  private password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });

  strength = computed(() => {
    const value = this.password();
    if (value.length < 8) {
      return 0;
    }
    let score = 1;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value) || value.length >= 14) score++;
    return Math.min(score, 4);
  });

  strengthLabel = computed(() => STRENGTH_LABELS[this.strength()]);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.getRawValue();

    // Sign the new user straight in rather than bouncing them through the login form.
    this.auth
      .register(this.form.getRawValue())
      .pipe(switchMap(() => this.auth.login({ email, password })))
      .subscribe({
        next: () => {
          this.toast.success('Welcome to IndustryPM! Your account is ready.');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(errorMessage(err, 'Registration failed. Please try again.'));
        },
      });
  }
}
