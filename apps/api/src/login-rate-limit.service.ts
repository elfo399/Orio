import { Injectable } from '@nestjs/common';

@Injectable()
export class LoginRateLimitService {
  private readonly attempts = new Map<string, number[]>();

  allowed(ip: string, email: string): boolean {
    const now = Date.now();
    const key = `${ip}:${email}`;
    const recent = (this.attempts.get(key) ?? []).filter((time) => time > now - 15 * 60_000);
    this.attempts.set(key, recent);
    return recent.length < 5;
  }

  failed(ip: string, email: string): void {
    const key = `${ip}:${email}`;
    this.attempts.set(key, [...(this.attempts.get(key) ?? []), Date.now()]);
  }

  succeeded(ip: string, email: string): void { this.attempts.delete(`${ip}:${email}`); }
}
