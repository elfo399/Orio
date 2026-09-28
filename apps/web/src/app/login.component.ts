import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service.js';

@Component({
  selector: 'orio-login', standalone: true, imports: [FormsModule, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="shell auth-shell"><header class="topbar"><a class="brand" routerLink="/login"><span class="brand-orb">o</span><span>ORIO</span></a><span class="connection"><i></i>A little world awaits</span></header>
      <section class="auth-layout"><div class="auth-intro"><p class="eyebrow">Welcome back</p><h1>Your little world is still here.</h1><p>Sign in to spend a quiet moment with your ORIO.</p></div>
      <form class="auth-card card" (ngSubmit)="submit()"><span class="step">01 / SIGN IN</span><h2>Continue your day</h2><label for="email">Email</label><input id="email" name="email" [(ngModel)]="email" type="email" autocomplete="email" required [disabled]="busy()"><label for="password">Password</label><input id="password" name="password" [(ngModel)]="password" type="password" autocomplete="current-password" required [disabled]="busy()"><small class="error" [class.visible]="!!error()">{{ error() }}</small><button class="primary" [disabled]="busy()">{{ busy() ? 'Signing in…' : 'Sign in' }} <span>→</span></button><p class="auth-switch">New here? <a routerLink="/register">Create an account</a></p></form></section>
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
