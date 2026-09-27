import { describe, expect, it } from 'vitest';
import { applyAction, DEFAULT_GAME_RULES, simulate, type PetState } from './index';

const origin = new Date('2026-01-01T12:00:00.000Z');
const pet = (overrides: Partial<PetState> = {}): PetState => ({ id: 1, name: 'Miso', speciesSlug: 'orio', stats: { satiety: 80, happiness: 80, energy: 70, hygiene: 80, health: 80 }, isSleeping: false, adoptedAt: origin, lastSimulatedAt: origin, ...overrides });

describe('ORIO game engine', () => {
  it('simulates the published awake decay deterministically', () => {
    const now = new Date(origin.getTime() + 2 * 3_600_000);
    const first = simulate(pet(), now);
    const second = simulate(pet(), now);
    expect(first).toEqual(second);
    expect(first.state.stats).toMatchObject({ satiety: 72, happiness: 76, energy: 64, hygiene: 76, health: 82 });
  });

  it('caps negative offline time at 24 hours', () => {
    const result = simulate(pet(), new Date(origin.getTime() + 30 * 3_600_000));
    expect(result.elapsedHours).toBe(24);
    expect(result.state.stats.satiety).toBe(0);
    expect(result.state.stats.energy).toBe(0);
    expect(result.state.stats.health).toBeGreaterThanOrEqual(0);
  });

  it('restores energy when sleeping while other needs continue to decay', () => {
    const result = simulate(pet({ isSleeping: true, stats: { satiety: 80, happiness: 80, energy: 60, hygiene: 80, health: 80 } }), new Date(origin.getTime() + 3 * 3_600_000));
    expect(result.state.stats).toMatchObject({ satiety: 68, happiness: 74, energy: 96, hygiene: 74, health: 83 });
    expect(result.status).toBe('sleeping');
  });

  it('clamps action results at 0 and 100', () => {
    const result = applyAction(pet({ stats: { satiety: 95, happiness: 5, energy: 4, hygiene: 99, health: 100 } }), 'play', origin);
    expect(result.state.stats).toMatchObject({ satiety: 90, happiness: 20, energy: 0, hygiene: 99 });
    expect(applyAction(pet({ stats: { satiety: 95, happiness: 80, energy: 80, hygiene: 80, health: 100 } }), 'feed', origin).state.stats.satiety).toBe(100);
  });

  it('does not allow care actions while asleep', () => {
    expect(() => applyAction(pet({ isSleeping: true }), 'feed', origin)).toThrow('Let ORIO rest');
    expect(() => applyAction(pet(), 'wake', origin)).toThrow('already awake');
  });

  it('centralizes the promised cooldowns', () => {
    expect(DEFAULT_GAME_RULES.actions.feed.cooldownMinutes).toBe(5);
    expect(DEFAULT_GAME_RULES.actions.clean.cooldownMinutes).toBe(10);
  });
});
