import { describe, expect, it } from 'vitest';
import { createState, createRealm, writeTile } from '@voidmarch/game-rules';
import { worldView } from '../apps/server/src/engine';
import { strategy } from '../apps/server/src/strategy';
import { radiationMotion, visibleRadiation } from '../apps/web/src/radiation-art';

describe('visibilité de la radioactivité', () => {
  it('ne révèle ni cases inconnues, ni pollution hors écran et ignore les doses invalides', () => {
    const now = Date.now(),
      state = createState('radiation-art', now);
    state.realms.a = createRealm('a', 'Nuage', 'ASH', { q: 0, r: 0 }, now);
    const world = worldView(state, 'a', now);
    world.strategy = { ...strategy(state, now), fallout: [] } as unknown as typeof world.strategy;
    const cells = [
      { q: -1, r: -1, intensity: 20, visibility: 'VISIBLE' as const },
      { q: 0, r: 0, intensity: 0, visibility: 'VISIBLE' as const },
      { q: 1, r: 0, intensity: 100, visibility: 'UNKNOWN' as const },
      { q: 2, r: 0, intensity: 100, visibility: 'EXPLORED' as const },
      { q: 1000, r: 1000, intensity: 100, visibility: 'VISIBLE' as const },
      { q: 0, r: -1, intensity: NaN, visibility: 'VISIBLE' as const },
    ];
    world.tiles = cells.map((c) => ({ ...c, terrain: 'PLAIN' }));
    world.strategy!.fallout = cells;
    const before = structuredClone(world.strategy!.fallout);
    expect(visibleRadiation(world, { x: -500, y: -500, width: 1000, height: 1000 })).toHaveLength(
      1,
    );
    expect(world.strategy!.fallout).toEqual(before);
  });
  it('garde un voile lisible même à faible dose et une animation bornée aux coordonnées négatives', () => {
    for (const strength of [0.001, 0.2, 1])
      for (const phase of [0, 0.5, 0.99]) {
        const cell = { x: -1000, y: -500, strength, phase };
        for (const time of [0, 50, 4000, 8000, 1e8]) {
          const m = radiationMotion(cell, time, false);
          expect(m.wash).toBeGreaterThanOrEqual(0.23);
          expect(m.wash).toBeLessThanOrEqual(0.33);
          expect(m.mist).toBeGreaterThan(0);
          expect(m.mist).toBeLessThan(1);
          expect(m.moteAlpha).toBeGreaterThanOrEqual(0);
          expect(m.moteAlpha).toBeLessThanOrEqual(1);
          expect(Math.abs(m.driftX)).toBeLessThanOrEqual(4);
          expect(Math.abs(m.driftY)).toBeLessThanOrEqual(2);
        }
        expect(radiationMotion(cell, 0, true)).toEqual(radiationMotion(cell, 9000, true));
        expect(radiationMotion(cell, 0, true).moteAlpha).toBe(0);
      }
  });
});
