import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from '@orio/contracts';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<AuthUser | null>(null);
  private restoration: Promise<boolean> | null = null;

  constructor(private readonly http: HttpClient) {}

  async restore(): Promise<boolean> {
    if (this.restoration) return this.restoration;
    this.restoration = firstValueFrom(this.http.get<AuthResponse>('/api/auth/me', { withCredentials: true }))
      .then((response) => { this.user.set(response.user); return true; })
      .catch(() => { this.user.set(null); return false; });
    return this.restoration;
  }

  login(input: LoginInput) {
    return this.http.post<AuthResponse>('/api/auth/login', input, { withCredentials: true });
  }

  register(input: RegisterInput) {
    return this.http.post<AuthResponse>('/api/auth/register', input, { withCredentials: true });
  }

  logout() {
    return this.http.post<void>('/api/auth/logout', {}, { withCredentials: true });
  }

  setUser(user: AuthUser): void { this.user.set(user); this.restoration = Promise.resolve(true); }
  clear(): void { this.user.set(null); this.restoration = Promise.resolve(false); }
}
