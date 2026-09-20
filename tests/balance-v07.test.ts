import { describe, expect, it } from 'vitest';
import {
  BUILDINGS,
  UNITS,
  UNIT_PROFILES,
  RESOURCES,
  BALANCE_VERSION,
  RULES,
  productionMultiplier,
  buildingUpgrade,
  unitPopulation,
  unitUpkeep,
  trainingBonusAt,
  type UnitKind,
} from '@voidmarch/config';
import { createState, unitStats, estimateDamage, attackCost } from '@voidmarch/game-rules';
import { addBuilding, addPlayer } from '../apps/server/src/engine';
import { migrateProgression } from '../apps/server/src/migrations';
import { BALANCE_V3_UNIT_HP } from '../apps/server/src/legacy-balance-v3';
import { simulateDevelopment, simulateCombat, simulateSkirmish } from '../scripts/simulate-balance';
import type { Unit } from '@voidmarch/shared';
const now = 1_900_000_000_000;
const unit = (kind: UnitKind, trainingBonus = 0): Unit => ({
  id: kind,
  kind,
  ownerId: 'a',
  q: 0,
  r: 0,
  hp: unitStats({ kind, trainingBonus }).hp,
  trainingBonus,
  createdAt: now,
  updatedAt: now,
});

describe('équilibrage global v0.7', () => {
  it('conserve le démarrage et valorise les variantes sans avantage gratuit de population ou prix', () => {
    expect(RULES.startingAP).toBe(40);
    expect(RULES.maxAP).toBe(20);
    expect(BUILDINGS.LUMBER.cost).toEqual({ GOLD: 15, WOOD: 25, STONE: 0, IRON: 0, FOOD: 0 });
    expect(BUILDINGS.QUARRY.cost.STONE).toBe(0);
    expect(BUILDINGS.MINE.cost.IRON).toBe(0);
    expect(unitPopulation('MUSKETEER')).toBe(unitPopulation('SANG_MUSKET'));
    expect(UNITS.SANG_MUSKET.hp).toBeGreaterThan(UNITS.MUSKETEER.hp);
    for (const r of RESOURCES)
      expect(UNITS.SANG_MUSKET.cost[r]).toBeGreaterThanOrEqual(UNITS.MUSKETEER.cost[r]);
    expect(UNITS.GIVR_RIFLE.cost.GOLD).toBeGreaterThan(UNITS.RIFLEMAN.cost.GOLD);
    expect(unitPopulation('GIVR_RIFLE')).toBe(unitPopulation('RIFLEMAN'));
    expect(unitUpkeep('MAUSOLEUM_TANK').GOLD).toBeGreaterThan(unitUpkeep('TANK').GOLD);
  });
  it('récompense la filière productive avec un amortissement borné et des déblocages militaires payants', () => {
    for (const kind of [
      'STEAM_SAWMILL',
      'MECHANIZED_QUARRY',
      'INDUSTRIAL_MINE',
      'OCCULT_SAWMILL',
      'RUNIC_QUARRY',
      'ABYSSAL_MINE',
      'GOLD_MINE',
    ] as const) {
      for (const level of [1, 2, 3, 4]) {
        const rate = Object.values(BUILDINGS[kind].production).reduce((a, b) => a + b, 0);
        const gain =
          rate * (productionMultiplier(kind, level + 1) - productionMultiplier(kind, level));
        const materialMinutes =
          Object.values(buildingUpgrade(kind, level)!.cost).reduce((a, b) => a + b, 0) / gain;
        expect(materialMinutes).toBeGreaterThan(15);
        expect(materialMinutes).toBeLessThan(110);
      }
    }
    for (const k of ['BARRACKS', 'ARCHERY', 'STABLE', 'ARSENAL'] as const) {
      expect(buildingUpgrade(k, 3)!.cost.GOLD).toBeGreaterThanOrEqual(2500);
      expect(buildingUpgrade(k, 4)!.cost.GOLD).toBeGreaterThanOrEqual(10000);
    }
  });
  it('atteint les cinq niveaux en payant réellement économie, stockage et PA dans deux parcours', () => {
    for (const producerLevel of [3, 5] as const) {
      const result = simulateDevelopment(producerLevel);
      expect(result.find((r) => r.action === 'Marché')!.minutes).toBeLessThan(30);
      expect(result.filter((r) => r.action.startsWith('Époque '))).toHaveLength(4);
      expect(result.find((r) => r.action === 'Époque 3')!.minutes).toBeLessThan(12 * 60);
      const end = result.at(-1)!;
      expect(end.action).toBe('Complexe des cloches niveau 5');
      expect(end.minutes).toBeGreaterThan(48 * 60);
      expect(end.minutes).toBeLessThan(7 * 24 * 60);
      expect(end.cap).toBeGreaterThanOrEqual(10000);
      expect(result.every((r) => RESOURCES.every((k) => Number.isFinite(r.rates[k])))).toBe(true);
    }
  });
  it('garde une puissance finale marquée, des antichars abordables et une Flak utile', () => {
    const ratio =
      unitStats(unit('MAUSOLEUM_TANK', trainingBonusAt('ATOMIC_FOUNDRY', 5))).attack /
      UNITS.INFANTRY.attack;
    expect(ratio).toBeGreaterThanOrEqual(5);
    expect(ratio).toBeLessThanOrEqual(8);
    expect(simulateCombat('BAZOOKA', 3, 'MAUSOLEUM_TANK', 5).shots).toBeLessThanOrEqual(10);
    expect(simulateCombat('FLAK_CANNON', 3, 'GLOCKE_APOCALYPSE', 5).shots).toBeLessThanOrEqual(15);
    expect(UNITS.BAZOOKA.cost.GOLD * 6).toBeLessThan(UNITS.MAUSOLEUM_TANK.cost.GOLD);
    for (let seed = 0; seed < 10; seed++) {
      expect(simulateSkirmish('BAZOOKA', 1, 3, 'MAUSOLEUM_TANK', 5, seed).winner).toBe('b');
      expect(simulateSkirmish('BAZOOKA', 6, 3, 'MAUSOLEUM_TANK', 5, seed).winner).toBe('a');
      expect(simulateSkirmish('RIFLEMAN', 6, 3, 'MAUSOLEUM_TANK', 5, seed).winner).toBe('b');
    }
  });
  it('réserve un rendement structurel supérieur au siège et harmonise les grenades à 1 PA', () => {
    expect(attackCost(unit('IMPERIAL_GRENADIER'))).toBe(1);
    expect(attackCost(unit('SANG_GRENADIER'))).toBe(1);
    const s = createState('siege-v07', now),
      r = addPlayer(s, 'a', 'A', 'MASK', now);
    const wall = addBuilding(s, r, { q: 1, r: 0 }, 'STEEL_WALL', now);
    const ground = { q: 1, r: 0, terrain: 'PLAIN' as const };
    const artillery = unit('FIELD_GUN', 60),
      tank = unit('TANK', 60);
    expect(attackCost(artillery)).toBe(2);
    expect(estimateDamage(artillery, wall, ground).min / attackCost(artillery)).toBeGreaterThan(
      estimateDamage(tank, wall, ground).max,
    );
    const atomic = addBuilding(s, r, { q: 2, r: 0 }, 'ATOMIC_WALL', now);
    expect(
      Math.ceil(atomic.hp / estimateDamage(unit('NEUTRON_MORTAR', 100), atomic, ground).min),
    ).toBeGreaterThanOrEqual(3);
  });
});

describe('migration v3 vers v4', () => {
  it.each([0, 25, 60, 100, 160])(
    'préserve les blessures et les archives avec entraînement ancien %s',
    (oldTraining) => {
      const s = createState('migration-v4', now),
        r = addPlayer(s, 'a', 'Archives', 'ASH', now);
      s.balanceVersion = 3;
      r.wallet = { GOLD: 456, WOOD: 123, STONE: 234, IRON: 345, FOOD: 567 };
      r.ap = 27;
      const b = addBuilding(s, r, { q: 1, r: 0 }, 'LUMBER', now);
      b.constructionCost = { WOOD: 21, GOLD: 11 };
      const kind = 'CYB_ONI_FORTRESS';
      const u = { ...unit(kind, oldTraining), rareBonus: 20, victories: 11 };
      u.hp = BALANCE_V3_UNIT_HP[kind]! * (1 + (oldTraining + 20) / 100) * 0.37;
      s.units[u.id] = u;
      s.archives.a = {
        version: 1,
        createdAt: now,
        realmValue: 123,
        realm: structuredClone(r),
        units: [structuredClone(u)],
        buildings: [structuredClone(b)],
        tiles: [],
      };
      const wallet = structuredClone(r.wallet),
        revision = s.revision;
      expect(migrateProgression(s, now + 1)).toBe(true);
      const targetTraining = oldTraining === 160 ? 100 : oldTraining === 100 ? 80 : oldTraining;
      for (const saved of [u, s.archives.a.units[0]]) {
        expect(saved.trainingBonus).toBe(targetTraining);
        expect(saved.rareBonus).toBe(20);
        expect(saved.victories).toBe(11);
        expect(saved.hp / unitStats(saved).hp).toBeCloseTo(0.37, 4);
      }
      expect(r.wallet).toEqual(wallet);
      expect(r.ap).toBe(27);
      expect(b.constructionCost).toEqual({ WOOD: 21, GOLD: 11 });
      expect(s.balanceVersion).toBe(BALANCE_VERSION);
      expect(s.revision).toBe(revision + 1);
      const stable = structuredClone(s);
      expect(migrateProgression(s, now + 2)).toBe(false);
      expect(s).toEqual(stable);
    },
  );
  it('respecte un recruteur encore présent au niveau 5 et un remboursement v3 manquant', () => {
    const s = createState('migration-training', now),
      r = addPlayer(s, 'a', 'A', 'MASK', now);
    s.balanceVersion = 3;
    const b = addBuilding(s, r, { q: 1, r: 0 }, 'ARSENAL', now);
    b.level = 5;
    delete b.constructionCost;
    const soldier = unit('SANG_RIFLE', 25);
    soldier.hp = (BALANCE_V3_UNIT_HP.SANG_RIFLE! * 1.25) / 2;
    s.units[soldier.id] = soldier;
    migrateProgression(s, now + 1);
    expect(soldier.trainingBonus).toBe(100);
    expect(soldier.hp / unitStats(soldier).hp).toBeCloseTo(0.5, 4);
    expect(b.constructionCost).toEqual(BUILDINGS.ARSENAL.cost);
  });
});
