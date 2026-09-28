import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service.js';

@Component({
  selector: 'orio-register', standalone: true, imports: [FormsModule, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="shell auth-shell"><header class="topbar"><a class="brand" routerLink="/login"><span class="brand-orb">o</span><span>ORIO</span></a><span class="connection"><i></i>A small world awaits</span></header>
      <section class="auth-layout"><div class="auth-intro"><p class="eyebrow">A small world is waiting</p><h1>Start something gentle.</h1><p>Your account gives your ORIO a private home on this server.</p></div>
      <form class="auth-card card" (ngSubmit)="submit()"><span class="step">01 / CREATE ACCOUNT</span><h2>Make it yours</h2><label for="displayName">Your name</label><input id="displayName" name="displayName" [(ngModel)]="displayName" autocomplete="name" minlength="2" maxlength="80" required [disabled]="busy()"><label for="email">Email</label><input id="email" name="email" [(ngModel)]="email" type="email" autocomplete="email" required [disabled]="busy()"><label for="password">Password</label><input id="password" name="password" [(ngModel)]="password" type="password" autocomplete="new-password" minlength="12" required [disabled]="busy()"><p class="field-note">At least 12 characters, with uppercase, lowercase and a number.</p><label for="confirmPassword">Confirm password</label><input id="confirmPassword" name="confirmPassword" [(ngModel)]="confirmPassword" type="password" autocomplete="new-password" required [disabled]="busy()"><label for="inviteCode">Invite code <span class="optional">if required</span></label><input id="inviteCode" name="inviteCode" [(ngModel)]="inviteCode" autocomplete="off" [disabled]="busy()"><small class="error" [class.visible]="!!error()">{{ error() }}</small><button class="primary" [disabled]="busy()">{{ busy() ? 'Creating…' : 'Create account' }} <span>→</span></button><p class="auth-switch">Already have an account? <a routerLink="/login">Sign in</a></p></form></section>
    </main>`
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal('');
  displayName = '';
  email = '';
  password = '';
  confirmPassword = '';
  inviteCode = '';

  submit(): void {
    this.busy.set(true); this.error.set('');
    this.auth.register({ email: this.email, displayName: this.displayName, password: this.password, confirmPassword: this.confirmPassword, inviteCode: this.inviteCode || undefined }).subscribe({
      next: (response) => { this.auth.setUser(response.user); void this.router.navigateByUrl('/dashboard'); },
      error: (response: { error?: { message?: string | string[] } }) => { this.busy.set(false); const message = response.error?.message; this.error.set(Array.isArray(message) ? message[0] : message ?? 'We could not create your account.'); }
    });
  }
}
