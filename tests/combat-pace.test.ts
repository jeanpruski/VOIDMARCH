import { describe, expect, it } from 'vitest';
import { UNITS, UNIT_PROFILES, type UnitKind } from '@voidmarch/config';
import { estimateDamage, unitStats } from '@voidmarch/game-rules';
import type { Unit } from '@voidmarch/shared';
import { simulateSkirmish } from '../scripts/simulate-balance';

const unit = (kind: UnitKind, trainingBonus = 0): Unit => ({
  id: 'a',
  ownerId: 'a',
  kind,
  q: 0,
  r: 0,
  hp: UNITS[kind].hp,
  trainingBonus,
  createdAt: 0,
  updatedAt: 0,
});
// These roles are intentionally unsuited to duelling an identical ground unit.
const specialist = new Set<UnitKind>([
  'NEUTRON_FLAK',
  'RECON_PLANE',
  'PLAGUE_MEDIC',
  'RAM',
  'ENGINEER',
]);
const combatants = (Object.keys(UNITS) as UnitKind[]).filter(
  (k) => UNITS[k].attack > 0 && !specialist.has(k),
);
describe('cadence de combat : 2 à 4 attaques entre combattants équivalents', () => {
  it.each([0, 25, 60, 80, 100])(
    'tout le catalogue, entraînement %s %, sans modifier les PV',
    (training) => {
      for (const kind of combatants) {
        const a = unit(kind, training),
          b = { ...a, id: 'b', ownerId: 'b' };
        const before = structuredClone([a, b]);
        const terrain = UNIT_PROFILES[kind].naval ? 'SEA' : 'PLAIN';
        const damage = estimateDamage(a, b, { q: 1, r: 0, terrain }, [], terrain);
        const hp = unitStats(b).hp;
        expect(
          Math.ceil(hp / damage.max),
          `${kind}: ne pas tuer un égal en un coup`,
        ).toBeGreaterThanOrEqual(2);
        expect(
          Math.ceil(hp / damage.min),
          `${kind}: même avec les tirages les plus faibles`,
        ).toBeLessThanOrEqual(4);
        expect([a, b]).toEqual(before);
      }
    },
  );
  it('la durée ne dépend pas des PV restants de la cible ou de l’attaquant', () => {
    const a = unit('TANK'),
      b = { ...unit('TANK'), id: 'b' };
    const tile = { q: 1, r: 0, terrain: 'PLAIN' as const };
    expect(estimateDamage(a, b, tile)).toEqual(
      estimateDamage({ ...a, hp: 1 }, { ...b, hp: 1 }, tile),
    );
  });
  it('ne transforme pas un défenseur bon marché en meilleur attaquant qu’un berserker', () => {
    const target = unit('GUARD');
    const tile = { q: 1, r: 0, terrain: 'PLAIN' as const };
    expect(estimateDamage(unit('BERSERKER'), target, tile).min).toBeGreaterThan(
      estimateDamage(unit('GUARD'), target, tile).max * 1.3,
    );
    expect(estimateDamage(unit('ARCHER'), target, tile).min).toBeGreaterThan(
      estimateDamage(unit('INFANTRY'), target, tile).max,
    );
  });
  it.each([
    ['BERSERKER', 2, 'GUARD', 1, 'a'],
    ['INFANTRY', 1, 'GUARD', 1, 'b'],
    ['SPEARMAN', 1, 'LIGHT_CAVALRY', 1, 'a'],
    ['RIFLEMAN', 3, 'GUARD', 1, 'a'],
    ['TANK', 3, 'RIFLEMAN', 3, 'a'],
    ['FLAK_CANNON', 3, 'BOMBER', 3, 'a'],
  ] as const)('combat serveur : %s N%s contre %s N%s', (a, level, b, enemyLevel, winner) => {
    // Legal contact positions, both initiative orders, actual AP, kills and RNG.
    for (let seed = 0; seed < 10; seed++) {
      const result = simulateSkirmish(a, 1, level, b, enemyLevel, seed, true);
      expect(result.winner).toBe(winner);
      expect(result.survivors).toBe(1);
    }
  });
  it('conserve un avantage à l’entraînement, au blindage et aux bons contres', () => {
    const tile = { q: 1, r: 0, terrain: 'PLAIN' as const };
    const enemy = unit('TANK');
    expect(estimateDamage(unit('INFANTRY', 100), enemy, tile).min).toBeGreaterThan(
      estimateDamage(unit('INFANTRY'), enemy, tile).max,
    );
    expect(estimateDamage(unit('BAZOOKA'), enemy, tile).min).toBeGreaterThan(
      estimateDamage(unit('RIFLEMAN'), enemy, tile).max * 3,
    );
    const flak = unit('NEUTRON_FLAK');
    expect(estimateDamage(flak, unit('BOMBER'), tile).min).toBeGreaterThan(
      estimateDamage(flak, unit('INFANTRY'), tile).max,
    );
    expect(estimateDamage(unit('ENGINEER'), enemy, tile).max).toBeLessThan(
      estimateDamage(unit('TANK'), enemy, tile).min,
    );
  });
});
