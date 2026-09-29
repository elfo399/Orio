import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard.js';
import { DashboardComponent } from './app.component.js';
import { ForgotPasswordComponent } from './forgot-password.component.js';
import { LoginComponent } from './login.component.js';
import { RegisterComponent } from './register.component.js';
import { ResetPasswordComponent } from './reset-password.component.js';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPasswordComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' }
];
