export type PetStatus = 'neutral' | 'happy' | 'hungry' | 'sad' | 'sleeping' | 'sick';
export type PetAction = 'feed' | 'play' | 'clean' | 'sleep' | 'wake';

export interface PetStats {
  satiety: number;
  happiness: number;
  energy: number;
  hygiene: number;
  health: number;
}

export interface PetState {
  id: number;
  name: string;
  speciesSlug: string;
  stats: PetStats;
  isSleeping: boolean;
  adoptedAt: Date;
  lastSimulatedAt: Date;
}

export interface GameRules {
  maxOfflineHours: number;
  satietyDecayPerHour: number;
  happinessDecayPerHour: number;
  awakeEnergyDecayPerHour: number;
  hygieneDecayPerHour: number;
  sleepEnergyRecoveryPerHour: number;
  healthDecayPerHour: number;
  healthRecoveryPerHour: number;
  fundamentalNeedThreshold: number;
  healthyNeedThreshold: number;
  actions: Record<Exclude<PetAction, 'sleep' | 'wake'>, { delta: Partial<PetStats>; cooldownMinutes: number }>;
  minigames: Record<Exclude<PetAction, 'sleep' | 'wake'>, MiniGameRule>;
}

export interface MiniGameRule {
  rewardStat: 'satiety' | 'happiness' | 'hygiene';
  maximumReward: number;
  cooldownMinutes: number;
  durationSeconds?: number;
  minimumCompletionSeconds?: number;
  minimumEnergy?: number;
  energyCost?: number;
  levels?: number;
  maxEvents?: number;
  zones?: string[];
}

export interface GameEvent {
  type: 'simulated' | 'action';
  action?: PetAction;
  occurredAt: Date;
  message: string;
}

export interface SimulationResult {
  state: PetState;
  elapsedHours: number;
  status: PetStatus;
  event?: GameEvent;
}

export const DEFAULT_GAME_RULES: GameRules = {
  maxOfflineHours: 24,
  satietyDecayPerHour: 4,
  happinessDecayPerHour: 2,
  awakeEnergyDecayPerHour: 3,
  hygieneDecayPerHour: 2,
  sleepEnergyRecoveryPerHour: 12,
  healthDecayPerHour: 4,
  healthRecoveryPerHour: 1,
  fundamentalNeedThreshold: 25,
  healthyNeedThreshold: 60,
  actions: {
    feed: { delta: { satiety: 20 }, cooldownMinutes: 5 },
    play: { delta: { happiness: 15, energy: -10, satiety: -5 }, cooldownMinutes: 5 },
    clean: { delta: { hygiene: 25 }, cooldownMinutes: 10 }
  },
  minigames: {
    feed: { rewardStat: 'satiety', maximumReward: 20, cooldownMinutes: 5, durationSeconds: 30, minimumCompletionSeconds: 20, maxEvents: 40 },
    play: { rewardStat: 'happiness', maximumReward: 15, cooldownMinutes: 5, minimumCompletionSeconds: 1, minimumEnergy: 15, energyCost: 10, levels: 5 },
    clean: { rewardStat: 'hygiene', maximumReward: 25, cooldownMinutes: 10, durationSeconds: 30, zones: ['ear-left', 'ear-right', 'forehead', 'cheek-left', 'cheek-right', 'chin', 'body-left', 'body-right'] }
  }
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 100) / 100));
const cloneState = (state: PetState): PetState => ({ ...state, stats: { ...state.stats }, adoptedAt: new Date(state.adoptedAt), lastSimulatedAt: new Date(state.lastSimulatedAt) });

export function getPetStatus(state: Pick<PetState, 'stats' | 'isSleeping'>): PetStatus {
  if (state.isSleeping) return 'sleeping';
  if (state.stats.health < 30) return 'sick';
  if (state.stats.satiety < 30) return 'hungry';
  if (state.stats.happiness < 30 || state.stats.energy < 25 || state.stats.hygiene < 25) return 'sad';
  if (state.stats.satiety > 70 && state.stats.happiness > 70 && state.stats.energy > 55 && state.stats.hygiene > 60 && state.stats.health > 70) return 'happy';
  return 'neutral';
}

export function simulate(state: PetState, now: Date, rules: GameRules = DEFAULT_GAME_RULES): SimulationResult {
  const next = cloneState(state);
  const requestedHours = Math.max(0, (now.getTime() - state.lastSimulatedAt.getTime()) / 3_600_000);
  const elapsedHours = Math.min(requestedHours, rules.maxOfflineHours);
  if (elapsedHours === 0) return { state: next, elapsedHours, status: getPetStatus(next) };

  next.stats.satiety = clamp(next.stats.satiety - rules.satietyDecayPerHour * elapsedHours);
  next.stats.happiness = clamp(next.stats.happiness - rules.happinessDecayPerHour * elapsedHours);
  next.stats.hygiene = clamp(next.stats.hygiene - rules.hygieneDecayPerHour * elapsedHours);
  next.stats.energy = clamp(next.stats.energy + (next.isSleeping ? rules.sleepEnergyRecoveryPerHour : -rules.awakeEnergyDecayPerHour) * elapsedHours);

  const needs = [next.stats.satiety, next.stats.happiness, next.stats.energy, next.stats.hygiene];
  const unmetNeeds = needs.filter((need) => need < rules.fundamentalNeedThreshold).length;
  const allFavourable = needs.every((need) => need >= rules.healthyNeedThreshold);
  if (unmetNeeds > 0) next.stats.health = clamp(next.stats.health - rules.healthDecayPerHour * elapsedHours * (unmetNeeds / needs.length));
  else if (allFavourable) next.stats.health = clamp(next.stats.health + rules.healthRecoveryPerHour * elapsedHours);

  next.lastSimulatedAt = new Date(now);
  return { state: next, elapsedHours, status: getPetStatus(next), event: { type: 'simulated', occurredAt: new Date(now), message: 'Time passed naturally.' } };
}

export function applyAction(state: PetState, action: PetAction, now: Date, rules: GameRules = DEFAULT_GAME_RULES): SimulationResult {
  const simulated = simulate(state, now, rules);
  const next = simulated.state;
  if (action === 'sleep') {
    if (next.isSleeping) throw new Error('ORIO is already asleep.');
    next.isSleeping = true;
  } else if (action === 'wake') {
    if (!next.isSleeping) throw new Error('ORIO is already awake.');
    next.isSleeping = false;
  } else {
    if (next.isSleeping) throw new Error('Let ORIO rest before doing that.');
    for (const [key, delta] of Object.entries(rules.actions[action].delta) as Array<[keyof PetStats, number]>) next.stats[key] = clamp(next.stats[key] + delta);
  }
  next.lastSimulatedAt = new Date(now);
  const labels: Record<PetAction, string> = { feed: 'A delicious snack!', play: 'What a joyful playtime!', clean: 'Fresh and sparkling!', sleep: 'Good night, little star.', wake: 'Good morning, sunshine!' };
  return { state: next, elapsedHours: simulated.elapsedHours, status: getPetStatus(next), event: { type: 'action', action, occurredAt: new Date(now), message: labels[action] } };
}

export function cooldownFor(action: PetAction, now: Date, rules: GameRules = DEFAULT_GAME_RULES): Date | undefined {
  const definition = action === 'sleep' || action === 'wake' ? undefined : rules.minigames[action];
  return definition ? new Date(now.getTime() + definition.cooldownMinutes * 60_000) : undefined;
}

/** The browser reports interactions, never a trusted final score. These helpers keep the balance rules server-side. */
export function scoreSnackCatch(events: Array<{ kind: 'good' | 'spoiled' }>): number {
  const good = events.filter((event) => event.kind === 'good').length;
  const spoiled = events.filter((event) => event.kind === 'spoiled').length;
  return Math.max(0, Math.min(100, good * 8 - spoiled * 12));
}

export function scoreMemoryLights(completedLevels: number, levels: number): number {
  return Math.max(0, Math.min(100, Math.round((Math.max(0, Math.min(completedLevels, levels)) / levels) * 100)));
}

export function scoreBubbleBath(cleanedZones: number, zones: number): number {
  if (zones <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Math.max(0, Math.min(cleanedZones, zones)) / zones) * 100)));
}

export function minigameReward(score: number, maximumReward: number): number {
  return Math.round((Math.max(0, Math.min(100, score)) / 100) * maximumReward);
}
