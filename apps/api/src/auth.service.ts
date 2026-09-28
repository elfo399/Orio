import { ConflictException, Injectable, OnModuleDestroy, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import argon2 from 'argon2';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import postgres from 'postgres';
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from '@orio/contracts';
import { sessions, users } from '@orio/database';

type Database = PostgresJsDatabase;
const databaseUrl = process.env.DATABASE_URL ?? 'postgres://orio:orio@localhost:5432/orio';
const sessionDays = Math.max(1, Number(process.env.SESSION_TTL_DAYS ?? 30));

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
