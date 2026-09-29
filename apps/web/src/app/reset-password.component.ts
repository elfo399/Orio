import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from './auth.service.js';

@Component({
  selector: 'orio-reset-password', standalone: true, imports: [FormsModule, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="shell auth-shell"><header class="topbar"><a class="brand" routerLink="/login"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 3C9.8 8.2 6.5 14.1 6.5 19.4C6.5 25 10.5 29 16 29s9.5-4 9.5-9.6C25.5 14.1 22.2 8.2 16 3Z" fill="#fff8e8" stroke="#4c765d" stroke-width="2.8"/><path d="M16 9.5c-2.7 2.7-4 5.1-4 7.4 0 2.5 1.7 4.1 4 4.1s4-1.6 4-4.1c0-2.3-1.3-4.7-4-7.4Z" fill="#d9b9de"/><circle cx="16" cy="16.5" r="2.3" fill="#efbf83"/></svg></span><span>ORIO</span></a><span class="connection"><i></i>A little world awaits</span></header>
      <section class="auth-layout"><div class="auth-intro"><p class="eyebrow">A fresh start</p><h1>Choose a new secret.</h1><p>Use a long, unique password. Signing in again will keep your little world safe.</p></div>
      <form class="auth-card card" (ngSubmit)="submit()"><span class="step">PASSWORD RESET</span><h2>Set a new password</h2>
        @if (complete()) { <p class="reset-message">Your password has been updated. Sign in with the new one to return to your companion.</p><p class="auth-switch"><a routerLink="/login">Sign in</a></p> }
        @else { <label for="password">New password</label><input id="password" name="password" [(ngModel)]="password" type="password" autocomplete="new-password" minlength="12" required [disabled]="busy()"><p class="field-note">At least 12 characters, with uppercase, lowercase and a number.</p><label for="confirmPassword">Confirm new password</label><input id="confirmPassword" name="confirmPassword" [(ngModel)]="confirmPassword" type="password" autocomplete="new-password" required [disabled]="busy()"><small class="error" [class.visible]="!!error()">{{ error() }}</small><button class="primary" [disabled]="busy() || !token">{{ busy() ? 'Saving…' : 'Save new password' }} <span>→</span></button><p class="auth-switch"><a routerLink="/forgot-password">Request a new link</a></p> }
      </form></section>
    </main>`
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly busy = signal(false);
  readonly complete = signal(false);
  readonly error = signal('');
  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  password = '';
  confirmPassword = '';

  constructor() { if (!this.token) this.error.set('This reset link is missing or invalid.'); }

  submit(): void {
    if (!this.token || this.busy()) return;
    this.busy.set(true); this.error.set('');
    this.auth.confirmPasswordReset({ token: this.token, password: this.password, confirmPassword: this.confirmPassword }).subscribe({
      next: () => { this.busy.set(false); this.complete.set(true); },
      error: (response: { error?: { message?: string } }) => { this.busy.set(false); this.error.set(response.error?.message ?? 'This reset link is invalid or has expired.'); }
    });
  }
}
