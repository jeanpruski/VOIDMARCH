import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { rollRareBonus } from '../apps/server/src/rarity';
import { addPlayer, defaultOptions, execute, worldView } from '../apps/server/src/engine';
import {
  createState,
  realmBuildings,
  realmUnits,
  unitStats,
  estimateDamage,
} from '@voidmarch/game-rules';
import { UNITS } from '@voidmarch/config';
import { actionSchema } from '@voidmarch/protocol';
import type { Unit } from '@voidmarch/shared';
const now = 1_900_000_000_000;
const action = (type: string, actorId: string, payload: unknown) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
describe('unités rares', () => {
  it('exactement une issue sur cent donne un bonus, borné entre 10 et 30 inclus', () => {
    expect(
      Array.from({ length: 100 }, (_, roll) =>
        rollRareBonus((max) => (max === 100 ? roll : 0)),
      ).filter(Boolean),
    ).toEqual([10]);
    expect(rollRareBonus((max) => (max === 100 ? 0 : 20))).toBe(30);
    expect(
      Array.from({ length: 21 }, (_, roll) => rollRareBonus((max) => (max === 100 ? 0 : roll))),
    ).toEqual(Array.from({ length: 21 }, (_, i) => i + 10));
  });
  it('les anciennes unités restent ordinaires et le bonus ne modifie ni portée ni mouvement', () => {
    const ordinary = unitStats({ kind: 'PEASANT' });
    const rare = unitStats({ kind: 'PEASANT', rareBonus: 10 });
    expect(ordinary.hp).toBe(UNITS.PEASANT.hp);
    expect(rare.hp).toBeCloseTo(ordinary.hp * 1.1);
    expect(rare.attack).toBe(0);
    expect(rare.move).toBe(ordinary.move);
    expect(rare.range).toBe(ordinary.range);
  });
  it('recrute avec les PV bonifiés, conserve le bonus après sauvegarde et le respecte en réparation', () => {
    let state = createState('rare-test', now);
    addPlayer(state, 'p', 'Rare', 'ASH', now);
    const camp = realmBuildings(state, 'p')[0];
    const options = { ...defaultOptions, recruitBonus: () => 30 };
    const result = execute(
      state,
      'p',
      action('RECRUIT', camp.id, { kind: 'PEASANT' }),
      now,
      options,
    );
    expect(result.result.accepted).toBe(true);
    state = JSON.parse(JSON.stringify(result.state));
    const unit = realmUnits(state, 'p')[0];
    expect(unit.rareBonus).toBe(30);
    expect(unit.hp).toBe(unitStats(unit).hp);
    expect(worldView(state, 'p', now).units.find((u) => u.id === unit.id)?.rareBonus).toBe(30);
    state.realms.p.wallet.GOLD = 100;
    state.realms.p.wallet.FOOD = 100;
    unit.hp -= 1;
    const repaired = execute(state, 'p', action('REPAIR', unit.id, {}), now);
    expect(repaired.result.accepted).toBe(true);
    expect(repaired.state.units[unit.id].hp).toBe(unitStats(unit).hp);
  });
  it('ne tire pas de rareté pour un recrutement refusé', () => {
    const state = createState('rare-refusal', now);
    addPlayer(state, 'p', 'Rare', 'ASH', now);
    const draw = vi.fn(() => 30);
    const result = execute(state, 'p', action('RECRUIT', 'missing', { kind: 'PEASANT' }), now, {
      ...defaultOptions,
      recruitBonus: draw,
    });
    expect(result.result.accepted).toBe(false);
    expect(draw).not.toHaveBeenCalled();
  });
  it('les attaques et défenses bonifiées participent au calcul des dégâts', () => {
    const u = {
      kind: 'TANK',
      hp: UNITS.TANK.hp,
      id: 'a',
      ownerId: 'a',
      q: 0,
      r: 0,
      createdAt: now,
      updatedAt: now,
    } as Unit;
    const target = { ...u, id: 'b', ownerId: 'b', kind: 'KNIGHT' } as Unit;
    const tile = { q: 0, r: 0, terrain: 'PLAIN' as const };
    const normal = estimateDamage(u, target, tile);
    expect(estimateDamage({ ...u, rareBonus: 30 }, target, tile).max).toBeGreaterThan(normal.max);
    expect(estimateDamage(u, { ...target, rareBonus: 30 }, tile).max).toBeLessThan(normal.max);
  });
});
