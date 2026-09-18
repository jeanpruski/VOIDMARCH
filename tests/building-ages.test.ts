import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  BUILDINGS,
  WALL_KINDS,
  TURRETS,
  UNIT_PROFILES,
  buildingUpgrade,
  productionMultiplier,
  trainingBonusAt,
  storageBonus,
  type BuildingKind,
} from '@voidmarch/config';
import { EPOCH_UNITS } from '../packages/config/src/epoch-units';
import {
  createState,
  income,
  writeTile,
  unitStats,
  nextTurretLevel,
  turretUpgradeReason,
} from '@voidmarch/game-rules';
import { actionSchema } from '@voidmarch/protocol';
import { addPlayer, addBuilding, execute } from '../apps/server/src/engine';
import { migrateProgression } from '../apps/server/src/migrations';
const now = 1_900_000_000_000;
const order = (type: string, actorId: string, payload = {}) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
const kinds = (Object.keys(BUILDINGS) as BuildingKind[]).filter(
  (k) => !k.endsWith('_WALL') && !['CAMP', 'OUTPOST'].includes(k),
);
describe('cinq niveaux et époques', () => {
  it.each(kinds)('%s : quatre améliorations, prix croissants, arrêt au niveau 5', (kind) => {
    let previous = 0;
    for (let level = 1; level < 5; level++) {
      const quote = buildingUpgrade(kind, level)!;
      expect(quote.level).toBe(level + 1);
      const cost = Object.values(quote.cost).reduce((s, v) => s + v, 0);
      expect(cost).toBeGreaterThan(previous);
      previous = cost;
    }
    expect(buildingUpgrade(kind, 5)).toBeNull();
  });
  it('le haut niveau renforce les producteurs et ajoute un stockage local à chaque étape', () => {
    expect([1, 2, 3, 4, 5].map((l) => productionMultiplier('MINE', l))).toEqual([1, 1.8, 3, 5, 8]);
    const s = createState('ages', now),
      r = addPlayer(s, 'p', 'Âges', 'MASK', now);
    const mine = addBuilding(s, r, { q: 1, r: 0 }, 'MINE', now);
    writeTile(s, mine, { terrain: 'HILL' });
    mine.level = 5;
    expect(income(s, r.id).IRON).toBe(40);
    expect(storageBonus('MINE', 5)).toBe(8000);
    const saved = structuredClone(s);
    expect(migrateProgression(s, now)).toBe(false);
    expect(s).toEqual(saved);
  });
  it('les niveaux militaires 4 et 5 entraînent les soldats existants en conservant leurs blessures', () => {
    let s = createState('training-ages', now);
    const r = addPlayer(s, 'p', 'Armée', 'MASK', now);
    r.wallet = { GOLD: 100000, WOOD: 100000, STONE: 100000, IRON: 100000, FOOD: 100000 };
    const b = addBuilding(s, r, { q: 1, r: 0 }, 'BARRACKS', now);
    b.level = 3;
    s.units.soldier = {
      id: 'soldier',
      ownerId: r.id,
      kind: 'INFANTRY',
      q: 1,
      r: 1,
      hp: 1,
      trainingBonus: 60,
      createdAt: now,
      updatedAt: now,
    };
    s.units.soldier.hp = unitStats(s.units.soldier).hp / 2;
    for (const level of [4, 5]) {
      const result = execute(s, r.id, order('UPGRADE', b.id), now);
      expect(result.result.accepted, result.result.reason).toBe(true);
      s = result.state;
      expect(s.units.soldier.trainingBonus).toBe(trainingBonusAt('BARRACKS', level));
      expect(s.units.soldier.hp / unitStats(s.units.soldier).hp).toBeCloseTo(0.5, 3);
    }
  });
  it.each(
    (Object.keys(EPOCH_UNITS) as (keyof typeof EPOCH_UNITS)[]).filter(
      (k) => (UNIT_PROFILES[k].minRecruitLevel ?? 1) > 1,
    ),
  )('%s exige son niveau de recrutement', (kind) => {
    const s = createState('era-recruit', now),
      r = addPlayer(s, 'p', 'Recrues', 'MASK', now),
      p = UNIT_PROFILES[kind];
    r.wallet = { GOLD: 100000, WOOD: 100000, STONE: 100000, IRON: 100000, FOOD: 100000 };
    const b = addBuilding(s, r, { q: 1, r: 0 }, p.recruitAt[0], now);
    b.level = p.minRecruitLevel! - 1;
    p.requires.forEach((kind, i) => addBuilding(s, r, { q: 3 + i, r: 0 }, kind, now));
    const result = execute(s, r.id, order('RECRUIT', b.id, { kind }), now);
    expect(result.result.accepted).toBe(false);
    expect(result.result.reason).toContain('niveau');
    expect(result.state).toEqual(s);
  });
  it('remparts et tourelles : cinq matériaux, sans construction directe des paliers avancés', () => {
    const s = createState('walls-ages', now),
      r = addPlayer(s, 'p', 'Défenses', 'MASK', now);
    r.wallet = { GOLD: 100000, WOOD: 100000, STONE: 100000, IRON: 100000, FOOD: 100000 };
    const b = addBuilding(s, r, { q: 1, r: 0 }, 'STEEL_WALL', now);
    b.turretLevel = 3;
    expect(turretUpgradeReason(b, r.id, [])).toContain('béton');
    for (const kind of WALL_KINDS.slice(1)) {
      const built = execute(s, r.id, order('BUILD', r.id, { q: 1, r: 1, kind }), now);
      expect(built.result.accepted).toBe(false);
    }
    let result = execute(s, r.id, order('UPGRADE', b.id), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.buildings[b.id].kind).toBe('CONCRETE_WALL');
    result = execute(result.state, r.id, order('UPGRADE_TURRET', b.id), now);
    expect(result.result.accepted).toBe(true);
    result = execute(result.state, r.id, order('UPGRADE', b.id), now);
    expect(result.result.accepted).toBe(true);
    result = execute(result.state, r.id, order('UPGRADE_TURRET', b.id), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.buildings[b.id].turretLevel).toBe(5);
    expect(nextTurretLevel(result.state.buildings[b.id])).toBeUndefined();
    expect(TURRETS[5].attack).toBeGreaterThan(TURRETS[4].attack);
  });
});
