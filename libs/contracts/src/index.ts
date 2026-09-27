import { z } from 'zod';

export const PET_NAME_MIN_LENGTH = 2;
export const PET_NAME_MAX_LENGTH = 24;

export const adoptionSchema = z.object({
  name: z.string().trim().min(PET_NAME_MIN_LENGTH).max(PET_NAME_MAX_LENGTH).regex(/^[\p{L}\p{N}][\p{L}\p{N} '\-]*$/u, 'Use letters, numbers, spaces, apostrophes or hyphens.')
});

export const idempotencySchema = z.object({
  idempotencyKey: z.string().uuid().optional()
});

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
