import type { AuthUser } from '@orio/contracts';

export type AuthenticatedRequest = { headers: Record<string, string | string[] | undefined>; ip?: string; socket?: { remoteAddress?: string }; user?: AuthUser };
