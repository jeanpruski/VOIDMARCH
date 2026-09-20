import { developmentProgress } from '@voidmarch/game-rules';
import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  BUILDINGS,
  UNITS,
  RULES,
  developmentStage,
  developmentReason,
  buildingUpgrade,
  productionMultiplier,
  unitPopulation,
  type BuildingKind,
} from '@voidmarch/config';
import {
  createState,
  createRealm,
  accrueEconomy,
  unitStats,
  repairPlan,
  estimateDamage,
  recruitmentRequirement,
  missionAbandonPlan,
  writeTile,
  disk,
  refreshWorldTraining,
  income,
} from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { expeditionOffers } from '../apps/server/src/expeditions';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { actionSchema } from '@voidmarch/protocol';
import { prepareDevelopment } from './fixtures/development';
import { simulateSkirmish } from '../scripts/simulate-balance';
import type { Unit } from '@voidmarch/shared';
const now = 1900000000000;
const order = (type: string, actorId: string, payload = {}, at = now) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: at });
const troop = (kind: Unit['kind']): Unit => ({
  id: 'unit',
  ownerId: 'a',
  kind,
  q: 0,
  r: 0,
  hp: UNITS[kind].hp,
  createdAt: now,
  updatedAt: now,
});
function state() {
  const s = createState('adventures-test', now);
  const r = addPlayer(s, 'a', 'Audit', 'MASK', now);
  r.wallet = { GOLD: 1e7, WOOD: 1e7, STONE: 1e7, IRON: 1e7, FOOD: 1e7 };
  return s;
}
describe('équilibrage v0.8 : progression sans raccourci', () => {
  it('préserve les PA et empêche un puits ou une caserne isolée de débloquer les expéditions atomiques', () => {
    const s = state();
    expect([RULES.startingAP, RULES.maxAP, RULES.apInterval]).toEqual([40, 20, 30000]);
    addBuilding(s, s.realms.a, { q: 1, r: 0 }, 'WELL', now, 5);
    addBuilding(s, s.realms.a, { q: 2, r: 0 }, 'BARRACKS', now, 5);
    expect(developmentStage(Object.values(s.buildings), developmentProgress(s, 'a'))).toBe(1);
    const offers = expeditionOffers(s, 'a', now);
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((o) => o.level === 1 && o.reward!.GOLD! < 2000)).toBe(true);
    const b = Object.values(s.buildings).find((b) => b.kind === 'BARRACKS')!;
    expect(
      recruitmentRequirement(
        'RIFLEMAN',
        b,
        Object.values(s.buildings),
        developmentProgress(s, 'a'),
      ),
    ).not.toBe('');
  });
  it('chaque palier nécessite les infrastructures des paliers précédents, même après chargement', () => {
    const s = state();
    for (let level = 2; level <= 5; level++) {
      prepareDevelopment(s, 'a', level, now);
      expect(
        developmentStage(Object.values(structuredClone(s).buildings), developmentProgress(s, 'a')),
      ).toBe(level);
    }
    const workshop = Object.values(s.buildings).find((b) => b.kind === 'WORKSHOP')!;
    workshop.hp = 0;
    expect(developmentStage(Object.values(s.buildings), developmentProgress(s, 'a'))).toBe(1);
    expect(developmentReason(Object.values(s.buildings), 5, developmentProgress(s, 'a'))).toContain(
      'Atelier',
    );
  });
  it('bloque une construction avancée et une amélioration militaire sans leurs jalons, sans débit', () => {
    const s = state(),
      r = s.realms.a;
    const barracks = addBuilding(s, r, { q: r.capital.q + 1, r: r.capital.r }, 'BARRACKS', now, 3);
    const command = order('UPGRADE', barracks.id);
    expect(execute(s, 'a', command, now).state).toBe(s);
    expect(predictAction(worldView(s, 'a', now), command)).toBeUndefined();
    prepareDevelopment(s, 'a', 3, now);
    expect(execute(s, 'a', command, now).result.accepted).toBe(true);
  });
  it('rend l’investissement industriel compétitif à débit égal sans renchérir la première scierie', () => {
    const investment = (kind: BuildingKind) =>
      Object.values(BUILDINGS[kind].cost).reduce((a, b) => a + b, 0) +
      [1, 2, 3, 4].reduce(
        (n, l) => n + Object.values(buildingUpgrade(kind, l)!.cost).reduce((a, b) => a + b, 0),
        0,
      );
    expect(BUILDINGS.LUMBER.cost).toEqual({ GOLD: 15, WOOD: 25, STONE: 0, IRON: 0, FOOD: 0 });
    for (const [basic, advanced, material] of [
      ['LUMBER', 'OCCULT_SAWMILL', 'WOOD'],
      ['QUARRY', 'RUNIC_QUARRY', 'STONE'],
      ['MINE', 'ABYSSAL_MINE', 'IRON'],
    ] as const) {
      const rate = (kind: BuildingKind) =>
        (BUILDINGS[kind].production as any)[material] * productionMultiplier(kind, 5);
      const ratio = investment(advanced) / ((investment(basic) * rate(advanced)) / rate(basic));
      expect(ratio).toBeLessThan(2);
      expect(buildingUpgrade(basic, 4)!.cost.GOLD).toBeGreaterThan(
        buildingUpgrade(basic, 2)!.cost.GOLD!,
      );
    }
  });
  it('répare un mur avec ses matériaux et ne permet plus d’annuler chaque obus atomique pour 1 PA', () => {
    const s = state(),
      wall = addBuilding(s, s.realms.a, { q: 1, r: 0 }, 'ATOMIC_WALL', now);
    wall.hp = 800;
    const peaceful = repairPlan(wall, now);
    expect(peaceful.restored).toBe(800);
    expect(peaceful.cost.IRON).toBeGreaterThan(0);
    wall.lastDamagedAt = now;
    const plan = repairPlan(wall, now);
    const mortar = { ...troop('NEUTRON_MORTAR'), trainingBonus: 100 };
    expect(plan.restored).toBe(160);
    expect(estimateDamage(mortar, wall, { q: 1, r: 0, terrain: 'PLAIN' }).min).toBeGreaterThan(
      plan.restored * 2,
    );
    const command = order('REPAIR', wall.id);
    const predicted = predictAction(worldView(s, 'a', now), command)!;
    const result = execute(s, 'a', command, now);
    expect(result.result.accepted).toBe(true);
    expect(predicted.world.player.wallet).toEqual(result.state.realms.a.wallet);
    expect(
      execute(result.state, 'a', order('REPAIR', wall.id, {}, now + 1000), now + 1000).result
        .accepted,
    ).toBe(false);
    expect(
      execute(result.state, 'a', order('REPAIR', wall.id, {}, now + 30000), now + 30000).result
        .accepted,
    ).toBe(true);
    expect(execute(s, 'a', order('UPGRADE', wall.id), now).result.accepted).toBe(false);
  });
  it('les vrais tirs déclenchent la réparation sous le feu et empêchent de se soigner par amélioration', () => {
    const s = state();
    s.realms.b = createRealm('b', 'B', 'MASK', { q: 5, r: 0 }, now);
    s.realms.b.protectedUntil = 0;
    for (const p of disk({ q: 0, r: 0 }, 5)) writeTile(s, p, { terrain: 'PLAIN' });
    const wall = addBuilding(s, s.realms.b, { q: 1, r: 0 }, 'CONCRETE_WALL', now);
    s.units.unit = { ...troop('FIELD_GUN'), trainingBonus: 60 };
    const hit = execute(s, 'a', order('ATTACK', 'unit', { targetId: wall.id }), now);
    expect(hit.result.accepted).toBe(true);
    expect(hit.state.buildings[wall.id].lastDamagedAt).toBe(now);
    expect(execute(hit.state, 'b', order('UPGRADE', wall.id), now).result.reason).toContain(
      '90 secondes',
    );
  });
  it('la famine compte seulement les minutes actives après épuisement, touche aussi les passagers et récupère', () => {
    const s = createState('food-audit', now),
      r = createRealm('a', 'A', 'MASK', { q: 0, r: 0 }, now);
    s.realms.a = r;
    const u = troop('INFANTRY'),
      passenger = { ...troop('RIFLEMAN'), id: 'passenger' };
    s.units.unit = u;
    s.units.truck = { ...troop('CARGO_TRUCK'), id: 'truck', cargo: [passenger] };
    r.wallet = { GOLD: 0, WOOD: 0, STONE: 0, IRON: 0, FOOD: 0 };
    r.lastSeen = now + 10 * 60000;
    accrueEconomy(s, r, now + 10 * 60000);
    expect(u.foodPenalty).toBe(10);
    expect(passenger.foodPenalty).toBe(10);
    expect(u.hp).toBe(UNITS.INFANTRY.hp);
    expect(unitStats(u).attack).toBeCloseTo(UNITS.INFANTRY.attack * 0.9);
    r.offlineAt = now + 10 * 60000;
    accrueEconomy(s, r, now + 24 * 3600000);
    expect(r.foodShortageMinutes).toBe(10);
    delete r.offlineAt;
    r.lastSeen = now + 24 * 3600000 + 5 * 60000;
    r.wallet.FOOD = 1000;
    accrueEconomy(s, r, r.lastSeen);
    expect(u.foodPenalty).toBe(0);
    expect(r.foodShortageMinutes).toBe(0);
  });
  it('répartit exactement un intervalle entre consommation des dernières rations et pénurie', () => {
    const s = createState('food-fraction', now),
      r = createRealm('a', 'A', 'MASK', { q: 0, r: 0 }, now);
    s.realms.a = r;
    s.units.unit = troop('INFANTRY');
    r.wallet.FOOD = 4;
    r.lastSeen = now + 15 * 60000;
    accrueEconomy(s, r, r.lastSeen);
    expect(r.foodShortageMinutes).toBeCloseTo(10); // 0.8 food/min, first five minutes funded.
    expect(s.units.unit.foodPenalty).toBe(10);
  });
  it('rafraîchit la pénurie des recrues et captures, sans ajouter de temps ni enlever de PV', () => {
    const s = state();
    s.realms.a.foodShortageMinutes = 35;
    const u = troop('INFANTRY');
    s.units.unit = u;
    refreshWorldTraining(s, now);
    expect(u.foodPenalty).toBe(20);
    expect(u.hp).toBe(UNITS.INFANTRY.hp);
    s.realms.b = createRealm('b', 'B', 'ASH', { q: 50, r: 0 }, now);
    u.ownerId = 'b';
    refreshWorldTraining(s, now);
    expect(u.foodPenalty).toBe(0);
    expect(s.realms.a.foodShortageMinutes).toBe(35);
  });
  it('calcule la même pénurie sur trente minutes ou sur trente mises à jour', () => {
    const s = createState('food-ticks', now),
      r = createRealm('a', 'A', 'ASH', { q: 0, r: 0 }, now);
    s.realms.a = r;
    s.units.unit = troop('INFANTRY');
    r.wallet.FOOD = -income(s, 'a').FOOD * 5;
    r.lastSeen = now + 30 * 60000;
    const copy = structuredClone(s);
    accrueEconomy(s, r, r.lastSeen);
    for (let i = 1; i <= 30; i++) accrueEconomy(copy, copy.realms.a, now + i * 60000);
    expect(copy.realms.a.foodShortageMinutes).toBeCloseTo(r.foodShortageMinutes!);
    expect(copy.units.unit.foodPenalty).toBe(s.units.unit.foodPenalty);
  });
  it('un abandon ne crée aucune dette et pénalise aussi un portefeuille partiellement rempli', () => {
    const plan = missionAbandonPlan(
      { GOLD: 25, FOOD: 0, WOOD: 100, STONE: 100, IRON: 100 },
      { GOLD: 100, FOOD: 100 },
    );
    expect(plan.paid).toEqual({ GOLD: 25, FOOD: 0 });
    expect(plan.delay).toBeGreaterThan(5 * 60000);
    expect(plan.delay).toBeLessThanOrEqual(30 * 60000);
    expect(
      missionAbandonPlan(
        { GOLD: 100, FOOD: 100, WOOD: 0, STONE: 0, IRON: 0 },
        { GOLD: 100, FOOD: 100 },
      ).delay,
    ).toBe(0);
  });
  it('les grands navires mobilisent un équipage à la mesure de leur puissance', () => {
    expect(unitPopulation('NUCLEAR_DREADNOUGHT')).toBe(22);
    expect(unitPopulation('ABYSSAL_SUBMARINE')).toBe(17);
    expect(unitPopulation('FISHING_CUTTER')).toBe(4);
  });
  it('permet de contrer un cuirassé atomique avec des sous-marins moins avancés', () => {
    expect(UNITS.BLACK_SUBMARINE.cost.GOLD * 7).toBeLessThan(UNITS.NUCLEAR_DREADNOUGHT.cost.GOLD);
    for (let seed = 0; seed < 5; seed++) {
      expect(simulateSkirmish('BLACK_SUBMARINE', 7, 3, 'NUCLEAR_DREADNOUGHT', 5, seed).winner).toBe(
        'a',
      );
      expect(
        simulateSkirmish('HUNTER_SUBMARINE', 2, 4, 'NUCLEAR_DREADNOUGHT', 5, seed).winner,
      ).toBe('a');
    }
  });
});
