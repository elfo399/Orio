import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth.service.js';

@Component({
  selector: 'orio-forgot-password', standalone: true, imports: [FormsModule, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="shell auth-shell"><header class="topbar"><a class="brand" routerLink="/login"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 3C9.8 8.2 6.5 14.1 6.5 19.4C6.5 25 10.5 29 16 29s9.5-4 9.5-9.6C25.5 14.1 22.2 8.2 16 3Z" fill="#fff8e8" stroke="#4c765d" stroke-width="2.8"/><path d="M16 9.5c-2.7 2.7-4 5.1-4 7.4 0 2.5 1.7 4.1 4 4.1s4-1.6 4-4.1c0-2.3-1.3-4.7-4-7.4Z" fill="#d9b9de"/><circle cx="16" cy="16.5" r="2.3" fill="#efbf83"/></svg></span><span>ORIO</span></a><span class="connection"><i></i>A little world awaits</span></header>
      <section class="auth-layout"><div class="auth-intro"><p class="eyebrow">A gentle way back</p><h1>Find your way home.</h1><p>Enter your account email and we will send a private, one-time link to choose a new password.</p></div>
      <form class="auth-card card" (ngSubmit)="submit()"><span class="step">PASSWORD RESET</span><h2>Reset your password</h2>
        @if (sent()) { <p class="reset-message">If an account exists for that address, a reset link is on its way. Check your inbox and spam folder.</p><p class="auth-switch"><a routerLink="/login">Back to sign in</a></p> }
        @else { <label for="email">Email</label><input id="email" name="email" [(ngModel)]="email" type="email" autocomplete="email" required [disabled]="busy()"><small class="error" [class.visible]="!!error()">{{ error() }}</small><button class="primary" [disabled]="busy()">{{ busy() ? 'Sending…' : 'Send reset link' }} <span>→</span></button><p class="auth-switch">Remembered it? <a routerLink="/login">Sign in</a></p> }
      </form></section>
    </main>`
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  readonly busy = signal(false);
  readonly sent = signal(false);
  readonly error = signal('');
  email = '';

  submit(): void {
    if (!this.email || this.busy()) return;
    this.busy.set(true); this.error.set('');
    this.auth.requestPasswordReset({ email: this.email }).subscribe({
      next: () => { this.busy.set(false); this.sent.set(true); },
      error: (response: { error?: { message?: string } }) => { this.busy.set(false); this.error.set(response.error?.message ?? 'We could not send the reset link.'); }
    });
  }
}
