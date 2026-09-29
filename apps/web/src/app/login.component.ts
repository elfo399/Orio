import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service.js';

@Component({
  selector: 'orio-login', standalone: true, imports: [FormsModule, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="shell auth-shell"><header class="topbar"><a class="brand" routerLink="/login"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 3C9.8 8.2 6.5 14.1 6.5 19.4C6.5 25 10.5 29 16 29s9.5-4 9.5-9.6C25.5 14.1 22.2 8.2 16 3Z" fill="#fff8e8" stroke="#4c765d" stroke-width="2.8"/><path d="M16 9.5c-2.7 2.7-4 5.1-4 7.4 0 2.5 1.7 4.1 4 4.1s4-1.6 4-4.1c0-2.3-1.3-4.7-4-7.4Z" fill="#d9b9de"/><circle cx="16" cy="16.5" r="2.3" fill="#efbf83"/></svg></span><span>ORIO</span></a><span class="connection"><i></i>A little world awaits</span></header>
      <section class="auth-layout"><div class="auth-intro"><p class="eyebrow">Welcome back</p><h1>Your little world is still here.</h1><p>Sign in to spend a quiet moment with your ORIO.</p></div>
      <form class="auth-card card" (ngSubmit)="submit()"><span class="step">01 / SIGN IN</span><h2>Continue your day</h2><label for="email">Email</label><input id="email" name="email" [(ngModel)]="email" type="email" autocomplete="email" required [disabled]="busy()"><label for="password">Password</label><input id="password" name="password" [(ngModel)]="password" type="password" autocomplete="current-password" required [disabled]="busy()"><p class="password-help"><a routerLink="/forgot-password">Forgot your password?</a></p><small class="error" [class.visible]="!!error()">{{ error() }}</small><button class="primary" [disabled]="busy()">{{ busy() ? 'Signing in…' : 'Sign in' }} <span>→</span></button><p class="auth-switch">New here? <a routerLink="/register">Create an account</a></p></form></section>
    </main>`
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal('');
  email = '';
  password = '';

  submit(): void {
    this.busy.set(true); this.error.set('');
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => { this.auth.setUser(response.user); void this.router.navigateByUrl('/dashboard'); },
      error: () => { this.busy.set(false); this.error.set('Email or password is not valid.'); }
    });
  }
}
