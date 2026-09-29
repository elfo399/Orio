import { ConflictException, Injectable, OnModuleDestroy, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import argon2 from 'argon2';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import postgres from 'postgres';
import type { AuthResponse, AuthUser, LoginInput, PasswordResetConfirmInput, PasswordResetRequestInput, RegisterInput } from '@orio/contracts';
import { passwordResetTokens, sessions, users } from '@orio/database';
import { ResendEmailService } from './resend-email.service.js';

type Database = PostgresJsDatabase;
const databaseUrl = process.env.DATABASE_URL ?? 'postgres://orio:orio@localhost:5432/orio';
const sessionDays = Math.max(1, Number(process.env.SESSION_TTL_DAYS ?? 30));
const passwordResetMinutes = Math.min(120, Math.max(5, Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 30)));

export function readCookie(header: string | string[] | undefined, name: string): string | undefined {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return undefined;
  const prefix = `${name}=`;
  return value.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
}

function tokenHash(token: string): string { return createHash('sha256').update(token).digest('hex'); }
function toUser(row: typeof users.$inferSelect): AuthUser { return { id: row.id, email: row.email, displayName: row.displayName }; }

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly client = postgres(databaseUrl, { max: 5, idle_timeout: 20 });
  private readonly db: Database = drizzle(this.client);

  constructor(private readonly email: ResendEmailService) {}

  async onModuleDestroy(): Promise<void> { await this.client.end({ timeout: 5 }); }

  async register(input: RegisterInput): Promise<{ response: AuthResponse; token: string }> {
    this.assertRegistrationAllowed(input.inviteCode);
    const id = randomUUID();
    const now = new Date();
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
    try {
      const [user] = await this.db.insert(users).values({ id, email: input.email, displayName: input.displayName, passwordHash, createdAt: now, updatedAt: now, lastLoginAt: now }).returning();
      if (!user) throw new ServiceUnavailableException('Could not create the account.');
      const token = await this.createSession(user.id, now);
      return { response: { user: toUser(user) }, token };
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('An account already exists for this email.');
      throw error;
    }
  }

  async login(input: LoginInput): Promise<{ response: AuthResponse; token: string }> {
    const [user] = await this.db.select().from(users).where(eq(users.email, input.email)).limit(1);
    const valid = user ? await argon2.verify(user.passwordHash, input.password) : false;
    if (!user || !valid) throw new UnauthorizedException('Invalid email or password.');
    const now = new Date();
    await this.db.update(users).set({ lastLoginAt: now, updatedAt: now }).where(eq(users.id, user.id));
    return { response: { user: toUser(user) }, token: await this.createSession(user.id, now) };
  }

  async resolveSession(token: string | undefined): Promise<AuthUser | null> {
    if (!token || token.length > 512) return null;
    const now = new Date();
    const rows = await this.db.select({ user: users }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.tokenHash, tokenHash(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, now))).limit(1);
    return rows[0] ? toUser(rows[0].user) : null;
  }

  async logout(token: string | undefined): Promise<void> {
    if (token) await this.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.tokenHash, tokenHash(token)));
  }

  async requestPasswordReset(input: PasswordResetRequestInput): Promise<void> {
    if (!this.email.isConfigured()) throw new ServiceUnavailableException('Password reset email is not configured.');
    const [user] = await this.db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (!user) return;

    const now = new Date();
    const token = randomBytes(32).toString('base64url');
    const hashedToken = tokenHash(token);
    const expiresAt = new Date(now.getTime() + passwordResetMinutes * 60_000);
    await this.db.transaction(async (tx) => {
      await tx.update(passwordResetTokens).set({ usedAt: now }).where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
      await tx.insert(passwordResetTokens).values({ id: randomUUID(), userId: user.id, tokenHash: hashedToken, expiresAt, createdAt: now });
    });

    const origin = (process.env.PUBLIC_ORIGIN || 'http://127.0.0.1:8080').replace(/\/+$/, '');
    try {
      await this.email.sendPasswordReset({ to: user.email, displayName: user.displayName, resetUrl: `${origin}/reset-password?token=${encodeURIComponent(token)}` });
    } catch {
      await this.db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.tokenHash, hashedToken));
      console.error('Password-reset delivery failed; its token was invalidated.');
    }
  }

  async confirmPasswordReset(input: PasswordResetConfirmInput): Promise<void> {
    const now = new Date();
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
    const result = await this.db.transaction(async (tx) => {
      const rows = await tx.select({ reset: passwordResetTokens, user: users }).from(passwordResetTokens).innerJoin(users, eq(passwordResetTokens.userId, users.id)).where(and(eq(passwordResetTokens.tokenHash, tokenHash(input.token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now))).limit(1);
      if (!rows[0]) return false;
      const [claimed] = await tx.update(passwordResetTokens).set({ usedAt: now }).where(and(eq(passwordResetTokens.id, rows[0].reset.id), isNull(passwordResetTokens.usedAt))).returning();
      if (!claimed) return false;
      await tx.update(users).set({ passwordHash, updatedAt: now }).where(eq(users.id, rows[0].user.id));
      await tx.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.userId, rows[0].user.id), isNull(sessions.revokedAt)));
      await tx.update(passwordResetTokens).set({ usedAt: now }).where(and(eq(passwordResetTokens.userId, rows[0].user.id), isNull(passwordResetTokens.usedAt)));
      return true;
    });
    if (!result) throw new UnauthorizedException('This password reset link is invalid or has expired.');
  }

  private async createSession(userId: string, now: Date): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now.getTime() + sessionDays * 86_400_000);
    await this.db.insert(sessions).values({ id: randomUUID(), userId, tokenHash: tokenHash(token), createdAt: now, expiresAt });
    return token;
  }

  private assertRegistrationAllowed(inviteCode: string | undefined): void {
    const mode = process.env.REGISTRATION_MODE ?? (process.env.NODE_ENV === 'production' ? 'invite' : 'open');
    if (mode === 'disabled') throw new UnauthorizedException('Registration is not available.');
    if (mode !== 'open' && mode !== 'invite') throw new ServiceUnavailableException('Invalid registration configuration.');
    if (mode !== 'invite') return;
    const configured = (process.env.INVITE_CODES ?? '').split(',').map((code) => code.trim()).filter(Boolean);
    const candidate = Buffer.from(inviteCode ?? '');
    const accepted = configured.some((code) => {
      const expected = Buffer.from(code);
      return expected.length === candidate.length && timingSafeEqual(expected, candidate);
    });
    if (!accepted) throw new UnauthorizedException('A valid invite code is required.');
  }

  private isUniqueViolation(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505'; }
}
