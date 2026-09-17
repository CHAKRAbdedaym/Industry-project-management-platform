import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  loading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    this.auth
      .register(
        this.form.getRawValue() as { email: string; password: string; fullName: string },
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.successMessage = 'Account created — you can log in now.';
          setTimeout(() => this.router.navigate(['/login']), 1200);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message ?? 'Registration failed. Please try again.';
        },
      });
  }
}
