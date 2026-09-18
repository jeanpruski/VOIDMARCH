import { describe, expect, it } from 'vitest';
import {
  BALANCE_VERSION,
  BUILDINGS,
  UNITS,
  GATHER_YIELD,
  productionMultiplier,
  trainingBonusAt,
} from '@voidmarch/config';
import {
  createState,
  createRealm,
  unitStats,
  estimateDamage,
  writeTile,
  income,
} from '@voidmarch/game-rules';
import { addPlayer, addBuilding } from '../apps/server/src/engine';
import { migrateProgression } from '../apps/server/src/migrations';
import type { Unit } from '@voidmarch/shared';
const now = 1_900_000_000_000;
const unit = (kind: Unit['kind'], trainingBonus = 0): Unit => ({
  id: kind,
  kind,
  ownerId: 'a',
  q: 0,
  r: 0,
  hp: UNITS[kind].hp,
  createdAt: now,
  updatedAt: now,
  trainingBonus,
});
describe('progression économique et militaire', () => {
  it('conserve une élite cinq à huit fois plus puissante après entraînement complet', () => {
    const ratio =
      unitStats(unit('MAUSOLEUM_TANK', trainingBonusAt('ATOMIC_FOUNDRY', 5))).attack /
      UNITS.INFANTRY.attack;
    expect(ratio).toBeGreaterThanOrEqual(5);
    expect(ratio).toBeLessThanOrEqual(8);
    expect(UNITS.RIFLEMAN.attack).toBeGreaterThan(UNITS.INFANTRY.attack);
    expect(UNITS.TANK.attack).toBeGreaterThan(UNITS.RIFLEMAN.attack);
    expect(UNITS.MAUSOLEUM_TANK.hp).toBeGreaterThan(UNITS.TANK.hp);
    expect(trainingBonusAt('BARRACKS', 2)).toBe(25);
    expect(trainingBonusAt('BARRACKS', 3)).toBe(60);
  });
  it('offre des contres bon marché au blindage et aux aéronefs avancés', () => {
    const ground = { q: 0, r: 0, terrain: 'PLAIN' as const };
    const heavy = unit('MAUSOLEUM_TANK', 60),
      bomber = unit('APOCALYPSE_WING', 60);
    const rocket = estimateDamage(unit('BAZOOKA', 25), heavy, ground);
    const rifle = estimateDamage(unit('RIFLEMAN', 25), heavy, ground);
    expect(rocket.min).toBeGreaterThan(rifle.max * 4);
    expect(Math.ceil(unitStats(heavy).hp / rocket.min)).toBeLessThanOrEqual(10);
    expect(UNITS.BAZOOKA.cost.GOLD * 5).toBeLessThan(UNITS.MAUSOLEUM_TANK.cost.GOLD);
    expect(estimateDamage(unit('FLAK_CANNON', 60), bomber, ground).min).toBeGreaterThan(
      estimateDamage(unit('RIFLEMAN', 60), bomber, ground).max * 2,
    );
  });
  it('permet l’amorçage sans fer et récompense les améliorations des producteurs', () => {
    expect(GATHER_YIELD.WOOD).toBeGreaterThanOrEqual(BUILDINGS.HOUSE.cost.WOOD);
    expect(BUILDINGS.LUMBER.cost.IRON).toBe(0);
    expect(BUILDINGS.QUARRY.cost.STONE).toBe(0);
    expect(BUILDINGS.QUARRY.cost.IRON).toBe(0);
    expect(BUILDINGS.MINE.cost.IRON).toBe(0);
    expect(productionMultiplier('MINE', 2)).toBe(1.8);
    expect(productionMultiplier('MINE', 3)).toBe(3);
    const s = createState('income-progression', now),
      r = addPlayer(s, 'a', 'Mineurs', 'ASH', now);
    const mine = addBuilding(s, r, { q: 1, r: 0 }, 'MINE', now);
    writeTile(s, mine, { terrain: 'HILL' });
    expect(income(s, 'a').IRON).toBe(5);
    mine.level = 3;
    expect(income(s, 'a').IRON).toBe(15);
    writeTile(s, mine, { terrain: 'PLAIN' });
    expect(income(s, 'a').IRON).toBe(0);
  });
});
describe('mise à niveau des anciennes sauvegardes', () => {
  it('conserve les blessures, stocks, PA, bonus rares et le remboursement historique', () => {
    const s = createState('old', now);
    s.balanceVersion = 1;
    s.realms.a = createRealm('a', 'Ancien', 'ASH', { q: 0, r: 0 }, now);
    const wallet = structuredClone(s.realms.a.wallet),
      ap = s.realms.a.ap;
    s.units.tank = { ...unit('TANK', 10), id: 'tank', rareBonus: 20, hp: 20.8 };
    const mine = addBuilding(s, s.realms.a, { q: 1, r: 0 }, 'MINE', now);
    mine.level = 2;
    mine.hp = 25;
    delete mine.constructionCost;
    expect(migrateProgression(s, now + 1)).toBe(true);
    expect(s.balanceVersion).toBe(BALANCE_VERSION);
    expect(s.units.tank.trainingBonus).toBe(25);
    expect(s.units.tank.rareBonus).toBe(20);
    expect(s.units.tank.hp / unitStats(s.units.tank).hp).toBeCloseTo(0.5);
    expect(mine.hp / (BUILDINGS.MINE.hp * 2)).toBe(0.5);
    expect(mine.constructionCost).toEqual({ GOLD: 32, WOOD: 32, IRON: 5, STONE: 0, FOOD: 0 });
    expect(s.realms.a.wallet).toEqual(wallet);
    expect(s.realms.a.ap).toBe(ap);
    const stable = structuredClone(s);
    expect(migrateProgression(s, now + 2)).toBe(false);
    expect(s).toEqual(stable);
  });
  it('applique aussi les niveaux déjà construits et laisse les nouveaux mondes intacts', () => {
    const s = createState('old-veterans', now);
    expect(migrateProgression(s)).toBe(false);
    delete s.balanceVersion;
    const r = addPlayer(s, 'a', 'Vétérans', 'ASH', now);
    const barracks = addBuilding(s, r, { q: 1, r: 0 }, 'BARRACKS', now);
    barracks.level = 3;
    barracks.hp = 120;
    s.units.soldier = { ...unit('INFANTRY'), hp: 5 };
    migrateProgression(s, now);
    expect(s.units.soldier.trainingBonus).toBe(60);
    expect(s.units.soldier.hp).toBe(24);
  });
  it('préserve les archives blessées et les coûts déjà enregistrés', () => {
    const s = createState('archived-balance', now);
    delete s.balanceVersion;
    const r = addPlayer(s, 'a', 'Archives', 'ASH', now);
    const mine = addBuilding(s, r, { q: 1, r: 0 }, 'MINE', now);
    mine.hp = 12.5;
    mine.constructionCost = { WOOD: 17, IRON: 3 };
    s.archives.a = {
      version: 1,
      createdAt: now,
      realmValue: 123,
      realm: structuredClone(r),
      units: [{ ...unit('INFANTRY', 20), hp: 6 }],
      buildings: [structuredClone(mine)],
      tiles: [],
    };
    migrateProgression(s, now + 1);
    const archive = s.archives.a;
    expect(archive.units[0].trainingBonus).toBe(60);
    expect(archive.units[0].hp).toBe(24);
    expect(archive.buildings[0].hp).toBe(BUILDINGS.MINE.hp / 2);
    expect(archive.buildings[0].constructionCost).toEqual({ WOOD: 17, IRON: 3 });
    expect(archive.realm.wallet).toEqual(r.wallet);
    expect(archive.createdAt).toBe(now);
  });
});
