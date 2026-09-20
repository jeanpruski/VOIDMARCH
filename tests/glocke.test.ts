import { developmentProgress } from '@voidmarch/game-rules';
import { prepareDevelopment } from './fixtures/development';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  trainingBonusAt,
  GLOCKE_UNITS,
  BUILDINGS,
  UNITS,
  UNIT_PROFILES,
  type UnitKind,
} from '@voidmarch/config';
import {
  createState,
  createRealm,
  disk,
  writeTile,
  unitStats,
  estimateDamage,
  resolveAttack,
  attackCost,
  recruitmentRequirement,
} from '@voidmarch/game-rules';
import { actionSchema, type Action } from '@voidmarch/protocol';
import {
  addPlayer,
  addBuilding,
  execute,
  defaultOptions,
  worldView,
} from '../apps/server/src/engine';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { projectileProfile } from '../apps/web/src/projectile-profile';
import type { Unit } from '@voidmarch/shared';
const now = 1_900_000_000_000;
const order = (type: Action['type'], actorId: string, payload = {}) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
const kinds = Object.keys(GLOCKE_UNITS) as (keyof typeof GLOCKE_UNITS)[];
const specimen = (kind: UnitKind, ownerId = 'a', q = 0): Unit => ({
  kind,
  id: kind,
  ownerId,
  q,
  r: 0,
  hp: UNITS[kind].hp,
  createdAt: now,
  updatedAt: now,
});
function fixture(prerequisites = true) {
  const s = createState('glocke-test', now),
    r = addPlayer(s, 'a', 'Cloches', 'ASH', now);
  // Late-game fixture: enough to pay the new six-figure complex upgrades.
  r.wallet = { GOLD: 200000, WOOD: 200000, STONE: 200000, IRON: 200000, FOOD: 200000 };
  r.protectedUntil = 0;
  Object.values(s.buildings).forEach((b) => (b.population = 1000));
  for (const p of disk(r.capital, 8)) writeTile(s, p, { terrain: 'PLAIN' });
  const b = addBuilding(s, r, { q: 2, r: 0 }, 'GLOCKE_COMPLEX', now);
  if (prerequisites) {
    addBuilding(s, r, { q: 0, r: 1 }, 'NUCLEAR_REACTOR', now);
    addBuilding(s, r, { q: -1, r: 1 }, 'ATOMIC_FOUNDRY', now);
    addBuilding(s, r, { q: -1, r: 0 }, 'BLACK_OBSERVATORY', now);
  }
  if (prerequisites) prepareDevelopment(s, r.id, 5, now);
  return { s, r, b };
}
describe('Projet Glocke', () => {
  it('réserve la construction à une économie atomique et occulte avancée', () => {
    const { s, r } = fixture(false);
    s.units.builder = specimen('PEASANT');
    s.units.builder.q = 1;
    const action = order('BUILD', 'builder', { kind: 'GLOCKE_COMPLEX', q: 1, r: 1 });
    const rejected = execute(s, 'a', action, now);
    expect(rejected.result.accepted).toBe(false);
    expect(rejected.result.reason).toContain('Réacteur noir');
    expect(rejected.state.realms.a.wallet).toEqual(r.wallet);
    expect(rejected.state.realms.a.ap).toBe(r.ap);
    for (const [i, kind] of (
      ['NUCLEAR_REACTOR', 'ATOMIC_FOUNDRY', 'BLACK_OBSERVATORY'] as const
    ).entries())
      addBuilding(s, r, { q: -2, r: i }, kind, now);
    prepareDevelopment(s, r.id, 5, now);
    const built = execute(s, 'a', action, now);
    expect(built.result.accepted, built.result.reason).toBe(true);
    expect(
      Object.values(built.state.buildings).filter((x) => x.kind === 'GLOCKE_COMPLEX'),
    ).toHaveLength(2);
  });
  it.each(kinds)('%s exige toutes ses infrastructures et son bâtiment dédié', (kind) => {
    const { s, r, b } = fixture(false);
    b.level = 5;
    const rejected = execute(s, 'a', order('RECRUIT', b.id, { kind }), now);
    expect(rejected.result.accepted).toBe(false);
    expect(rejected.result.reason).toContain('Réacteur noir');
    expect(rejected.state.realms.a.wallet).toEqual(r.wallet);
    const camp = Object.values(s.buildings).find((x) => x.kind === 'CAMP')!;
    expect(
      recruitmentRequirement(kind, camp, Object.values(s.buildings), developmentProgress(s, 'a')),
    ).toContain('Complexe des cloches');
  });
  it.each(kinds)('%s est recrutée avec le niveau, coût et entraînement attendus', (kind) => {
    const { s, r, b } = fixture();
    const level = UNIT_PROFILES[kind].minRecruitLevel!;
    const action = order('RECRUIT', b.id, { kind });
    if (level > 1) {
      b.level = level - 1;
      const rejected = execute(s, 'a', action, now);
      expect(rejected.result.accepted).toBe(false);
      expect(rejected.result.reason).toContain(`niveau ${level}`);
      expect(predictAction(worldView(s, 'a', now, [{ q: 0, r: 0 }]), action)).toBeUndefined();
    }
    b.level = level;
    const result = execute(s, 'a', action, now, { ...defaultOptions, recruitBonus: () => 0 });
    expect(result.result.accepted, result.result.reason).toBe(true);
    const u = Object.values(result.state.units).find((u) => u.kind === kind)!;
    expect(u.trainingBonus ?? 0).toBe(trainingBonusAt('GLOCKE_COMPLEX', level));
    expect(u.hp).toBe(unitStats(u).hp);
    expect(result.state.realms.a.wallet.GOLD).toBe(r.wallet.GOLD - UNITS[kind].cost.GOLD);
    expect(result.state.realms.a.ap).toBe(r.ap - 1);
    expect(attackCost(u)).toBe(2);
  });
  it('améliore aussi une cloche existante et conserve ses blessures', () => {
    const { s, b } = fixture();
    s.units.vril = { ...specimen('GLOCKE_VRIL'), id: 'vril', hp: 100 };
    const result = execute(s, 'a', order('UPGRADE', b.id), now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.units.vril.trainingBonus).toBe(25);
    expect(result.state.units.vril.hp / unitStats(result.state.units.vril).hp).toBe(0.5);
  });
  it.each(kinds)('%s franchit les remparts mais reste exposée à la Flak', (kind) => {
    const { s } = fixture();
    const enemy = createRealm('b', 'Adversaire', 'IRON', { q: 3, r: 0 }, now);
    s.realms.b = enemy;
    const wall = addBuilding(s, enemy, { q: 1, r: 0 }, 'STEEL_WALL', now);
    const bell = specimen(kind),
      target = specimen('INFANTRY', 'b', 3);
    expect(resolveAttack(bell, target, [wall]).target).toBe(target);
    const terrain = { q: 0, r: 0, terrain: 'PLAIN' as const };
    expect(estimateDamage(bell, target, terrain).min).toBeGreaterThan(40);
    expect(estimateDamage(specimen('FLAK_CANNON'), bell, terrain).min).toBeGreaterThan(
      estimateDamage(specimen('RIFLEMAN'), bell, terrain).max * 2,
    );
    expect(projectileProfile(kind)?.kind).toBe(kind === 'GLOCKE_NACHT' ? 'orb' : 'lightning');
    expect(UNITS[kind].capture).toBe(0);
  });
});
