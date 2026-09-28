import { z } from 'zod';

export const PET_NAME_MIN_LENGTH = 2;
export const PET_NAME_MAX_LENGTH = 24;

export const adoptionSchema = z.object({
  name: z.string().trim().min(PET_NAME_MIN_LENGTH).max(PET_NAME_MAX_LENGTH).regex(/^[\p{L}\p{N}][\p{L}\p{N} '\-]*$/u, 'Use letters, numbers, spaces, apostrophes or hyphens.')
});

export const idempotencySchema = z.object({
  idempotencyKey: z.string().uuid().optional()
});

const normalizedEmail = z.string().trim().email().max(320).transform((email) => email.toLowerCase());
const passwordSchema = z.string().min(12, 'Use at least 12 characters.').max(128).regex(/[a-z]/, 'Include a lowercase letter.').regex(/[A-Z]/, 'Include an uppercase letter.').regex(/\d/, 'Include a number.');

export const registerSchema = z.object({
  email: normalizedEmail,
  displayName: z.string().trim().min(2).max(80),
  password: passwordSchema,
  confirmPassword: z.string(),
  inviteCode: z.string().trim().max(256).optional()
}).superRefine((value, context) => {
  if (value.password !== value.confirmPassword) context.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match.' });
});

export const loginSchema = z.object({ email: normalizedEmail, password: z.string().min(1).max(128) });
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthUser { id: string; email: string; displayName: string; }
export interface AuthResponse { user: AuthUser; }

export const petActionSchema = z.enum(['feed', 'play', 'clean', 'sleep', 'wake']);
export type PetAction = z.infer<typeof petActionSchema>;
export type AdoptionInput = z.infer<typeof adoptionSchema>;
export type IdempotencyInput = z.infer<typeof idempotencySchema>;

export interface ApiPet {
  id: number;
  name: string;
  species: { slug: string; displayName: string };
  stats: { satiety: number; happiness: number; energy: number; hygiene: number; health: number };
  status: 'neutral' | 'happy' | 'hungry' | 'sad' | 'sleeping' | 'sick';
  isSleeping: boolean;
  adoptedAt: string;
  lastSimulatedAt: string;
  ageMinutes: number;
}

export interface PetResponse { pet: ApiPet; cooldowns: Partial<Record<PetAction, string>>; }
export interface ActionResponse extends PetResponse { message: string; replayed?: boolean; }
