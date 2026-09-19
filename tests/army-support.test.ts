import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  BUILDINGS,
  UNITS,
  UNIT_PROFILES,
  trainingBonusAt,
  TRANSPORTS,
  type BuildingKind,
  type UnitKind,
} from '@voidmarch/config';
import {
  allUnits,
  armyTraining,
  armyTrainingSources,
  refreshArmyTraining,
  refreshWorldTraining,
  unitStats,
  unitCombatStats,
  terrainCombatBonus,
  createState,
  createRealm,
  disk,
  writeTile,
  vision,
  key,
  SUPPORT_CAPS,
} from '@voidmarch/game-rules';
import type { Building, Unit } from '@voidmarch/shared';
import { actionSchema } from '@voidmarch/protocol';
import {
  addPlayer,
  addBuilding,
  execute,
  worldView,
  defaultOptions,
} from '../apps/server/src/engine';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { planGroupMovement } from '../apps/web/src/group-movement';

const now = 1_900_000_000_000;
const building = (
  id: string,
  level: number,
  kind: BuildingKind = 'BARRACKS',
  ownerId = 'a',
): Building => ({
  id,
  level,
  kind,
  ownerId,
  q: 30,
  r: 30,
  hp: BUILDINGS[kind].hp * level,
  population: 100,
  name: kind,
  createdAt: now,
  updatedAt: now,
});
const unit = (kind: UnitKind = 'INFANTRY', extras: Partial<Unit> = {}): Unit => ({
  id: 'troop',
  ownerId: 'a',
  kind,
  q: 0,
  r: 0,
  hp: UNITS[kind].hp,
  createdAt: now,
  updatedAt: now,
  ...extras,
});
const action = (type: string, actorId: string, payload = {}) =>
  actionSchema.parse({ actionId: randomUUID(), clientTimestamp: now, type, actorId, payload });
function fixture() {
  const s = createState('army-support', now),
    r = addPlayer(s, 'a', 'Soutien', 'ASH', now);
  r.wallet = { GOLD: 1e7, WOOD: 1e7, STONE: 1e7, IRON: 1e7, FOOD: 1e7 };
  r.unlimitedAP = true;
  s.units = {};
  for (const p of disk({ q: 0, r: 0 }, 14))
    writeTile(s, p, { terrain: 'PLAIN', ownerId: undefined, road: false });
  const first = addBuilding(s, r, { q: 1, r: 2 }, 'BARRACKS', now, 5);
  const second = addBuilding(s, r, { q: 2, r: 2 }, 'BARRACKS', now, 2);
  s.units.troop = unit();
  refreshWorldTraining(s, now);
  return { s, r, first, second };
}

describe('soutien militaire cumulable', () => {
  it('conserve le meilleur entraînement, récompense les doublons améliorés et réduit leur rendement', () => {
    const base = building('first', 5),
      extras = Array.from({ length: 5 }, (_, i) => building(`extra-${i}`, 2));
    const values = Array.from({ length: 5 }, (_, i) =>
      armyTraining('INFANTRY', [base, ...extras.slice(0, i)]),
    );
    expect(values.every((v) => v.trainingBonus === trainingBonusAt('BARRACKS', 5))).toBe(true);
    expect(values.map((v) => v.points)).toEqual([0, 1, 1.6, 2, 2.2]);
    expect(values[0].supportBonus).toEqual({
      attack: 0,
      defense: 0,
      hp: 0,
      move: 0,
      vision: 0,
      terrain: 0,
    });
    expect(values[1].supportBonus.defense).toBe(3);
    expect(
      armyTraining('INFANTRY', [base, ...extras.map((b) => ({ ...b, level: 1 }))]).points,
    ).toBe(0);
    expect(armyTraining('INFANTRY', [base, extras[0], extras[0]])).toEqual(values[1]);
  });
  it('explique les contributions dans un ordre stable dont la somme correspond exactement aux bonus appliqués', () => {
    const sites = [
      building('principal', 5),
      ...Array.from({ length: 15 }, (_, i) => building(`extra-${i}`, i % 2 ? 3 : 5)),
    ];
    for (const kind of ['INFANTRY', 'ARCHER', 'RANGER'] as UnitKind[]) {
      const relevant = sites.map((b) => ({ ...b, kind: UNIT_PROFILES[kind].recruitAt[0] }));
      const detail = armyTrainingSources(kind, relevant);
      expect(armyTrainingSources(kind, [...relevant].reverse())).toEqual(detail);
      const expected = armyTraining(kind, relevant);
      expect(detail.trainingBonus).toBe(expected.trainingBonus);
      expect(detail.sources.reduce((n, s) => n + s.points, 0)).toBeCloseTo(expected.points, 8);
      for (const k of Object.keys(SUPPORT_CAPS) as (keyof typeof SUPPORT_CAPS)[]) {
        expect(
          detail.sources.reduce((n, s) => n + s.contribution[k], 0),
          `${kind}:${k}`,
        ).toBeCloseTo(expected.supportBonus[k], 8);
      }
      expect(detail.sources.some((s) => s.points === 0)).toBe(true);
      expect(detail.sources.some((s) => s.building.id === detail.supportBase?.id)).toBe(false);
    }
  });
  it('n’attribue rien à un bâtiment mort, incompatible ou dupliqué ni aux bâtisseurs', () => {
    const sites = [
      building('principal', 5),
      building('extra', 3),
      { ...building('dead', 5), hp: 0 },
      building('mine', 5, 'MINE'),
    ];
    const detail = armyTrainingSources('INFANTRY', [...sites, sites[1]]);
    expect(detail.primary?.id).toBe('principal');
    expect(detail.sources.map((s) => s.building.id)).toEqual(['extra']);
    expect(detail.sources[0].contribution).toEqual({
      attack: 3,
      defense: 6,
      hp: 4,
      move: 0,
      vision: 0,
      terrain: 1,
    });
    expect(armyTrainingSources('PEASANT', sites).sources).toEqual([]);
    expect(armyTrainingSources('INFANTRY', []).primary).toBeUndefined();
  });
  it('plafonne tous les cumuls, protège les rôles et ignore les formations non débloquées', () => {
    const buildings = Object.keys(BUILDINGS).flatMap((kind, i) =>
      Array.from({ length: 12 }, (_, j) => building(`${i}-${j}`, 5, kind as BuildingKind)),
    );
    for (const kind of Object.keys(UNITS) as UnitKind[]) {
      const { supportBonus: bonus } = armyTraining(kind, buildings);
      for (const k of Object.keys(SUPPORT_CAPS) as (keyof typeof SUPPORT_CAPS)[]) {
        expect(bonus[k], `${kind}:${k}`).toBeGreaterThanOrEqual(0);
        expect(bonus[k], `${kind}:${k}`).toBeLessThanOrEqual(SUPPORT_CAPS[k]);
      }
      if (UNIT_PROFILES[kind].hero || UNIT_PROFILES[kind].builder)
        expect(Object.values(bonus).some(Boolean)).toBe(false);
      if (UNIT_PROFILES[kind].flying) expect(bonus.terrain).toBe(0);
      if (TRANSPORTS[kind]) expect(bonus.vision).toBe(0);
    }
    expect(
      armyTraining(
        'MAUSOLEUM_TANK',
        Array.from({ length: 10 }, (_, i) => building(String(i), 2, 'ATOMIC_FOUNDRY')),
      ).points,
    ).toBe(0);
  });
  it('ne pénalise aucune statistique quand un bâtiment progresse, quel que soit le type d’unité', () => {
    for (const kind of Object.keys(UNITS) as UnitKind[]) {
      const profile = UNIT_PROFILES[kind];
      for (const trainingSite of profile.recruitAt) {
        const facilities = profile.recruitAt.flatMap((k, i) => [
          building(`a-${i}`, 5, k),
          building(`b-${i}`, 2, k),
        ]);
        for (let level = 1; level < 5; level++) {
          const before = armyTraining(kind, [
            ...facilities,
            building('changing', level, trainingSite),
          ]);
          const after = armyTraining(kind, [
            ...facilities,
            building('changing', level + 1, trainingSite),
          ]);
          expect(after.trainingBonus).toBeGreaterThanOrEqual(before.trainingBonus);
          for (const k of Object.keys(SUPPORT_CAPS) as (keyof typeof SUPPORT_CAPS)[])
            expect(
              after.supportBonus[k],
              `${kind}:${trainingSite}:${level}:${k}`,
            ).toBeGreaterThanOrEqual(before.supportBonus[k]);
        }
      }
    }
  });
  it('préserve blessures, rareté, vétérans et passagers et retire le soutien quand une infrastructure est perdue', () => {
    const troop = unit('INFANTRY', { rareBonus: 20, victories: 8 });
    troop.hp = unitStats(troop).hp * 0.4;
    const carrier = unit('CARGO_TRUCK', { id: 'carrier', cargo: [troop] });
    // Only the passenger is refreshed here; its presence in cargo cannot exclude it.
    const units = allUnits([carrier]).filter((u) => u.id === troop.id);
    const sites = [building('one', 5), building('two', 5), building('foreign', 5, 'BARRACKS', 'b')];
    refreshArmyTraining(units, sites, now);
    expect(troop.hp / unitStats(troop).hp).toBeCloseTo(0.4, 3);
    expect(troop.supportBonus?.defense).toBe(12);
    const trained = troop.trainingBonus;
    const unchanged = structuredClone(troop);
    expect(refreshArmyTraining(units, sites, now + 1)).toBe(0);
    expect(troop).toEqual(unchanged);
    refreshArmyTraining(units, [], now + 2);
    expect(troop.supportBonus).toBeUndefined();
    expect(troop.trainingBonus).toBe(trained);
    expect(troop.rareBonus).toBe(20);
    expect(troop.victories).toBe(8);
    expect(troop.hp / unitStats(troop).hp).toBeCloseTo(0.4, 3);
  });
  it('renforce uniquement les affinités déjà présentes, jamais un terrain neutre ni un bonus absent', () => {
    const ranger = unit('RANGER', {
      supportBonus: { attack: 10, defense: 5, hp: 10, move: 1, vision: 1, terrain: 5 },
    });
    expect(terrainCombatBonus(ranger, 'FOREST')).toEqual({ attack: 35, defense: 30 });
    expect(terrainCombatBonus(ranger, 'PLAIN')).toEqual({ attack: 0, defense: 0 });
    expect(unitCombatStats(ranger, 'PLAIN')).toEqual(unitStats(ranger));
    expect(unitCombatStats(ranger, 'FOREST').hp).toBe(unitStats(ranger).hp);
    expect(terrainCombatBonus({ ...ranger, kind: 'BERSERKER' }, 'FOREST')).toEqual({
      attack: 35,
      defense: 0,
    });
  });
  it('applique les mêmes gains au serveur, à la prévision et aux nouvelles recrues sans soigner les vétérans', () => {
    const { s, first, second } = fixture();
    s.units.troop.hp = unitStats(s.units.troop).hp / 2;
    const upgrade = action('UPGRADE', second.id);
    const predicted = predictAction(worldView(s, 'a', now), upgrade)!;
    const result = execute(s, 'a', upgrade, now);
    expect(result.result.accepted).toBe(true);
    const trained = result.state.units.troop;
    expect(trained.supportBonus!.defense).toBeGreaterThan(s.units.troop.supportBonus!.defense);
    expect(predicted.world.units.find((u) => u.id === trained.id)).toMatchObject({
      trainingBonus: trained.trainingBonus,
      supportBonus: trained.supportBonus,
      hp: trained.hp,
    });
    expect(trained.hp / unitStats(trained).hp).toBeCloseTo(0.5, 3);
    const recruit = execute(
      result.state,
      'a',
      action('RECRUIT', first.id, { kind: 'INFANTRY' }),
      now,
      { ...defaultOptions, recruitBonus: () => 0 },
    );
    expect(recruit.result.accepted, recruit.result.reason).toBe(true);
    const fresh = Object.values(recruit.state.units).find((u) => u.id !== 'troop')!;
    expect(fresh.supportBonus).toEqual(trained.supportBonus);
    expect(fresh.hp).toBe(unitStats(fresh).hp);
  });
  it('retire les compléments après démolition, sans retrait de l’entraînement principal', () => {
    const { s, second } = fixture();
    const demolish = action('DEMOLISH', second.id);
    const predicted = predictAction(worldView(s, 'a', now), demolish)!;
    const result = execute(s, 'a', demolish, now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.units.troop.supportBonus).toBeUndefined();
    expect(result.state.units.troop.trainingBonus).toBe(s.units.troop.trainingBonus);
    expect(predicted.world.units.find((u) => u.id === 'troop')!.supportBonus).toBeUndefined();
  });
  it('utilise réellement les cases de mouvement et de vision gagnées, en solo et en groupe', () => {
    const { s, r, second } = fixture();
    second.level = 5;
    addBuilding(s, r, { q: 3, r: 2 }, 'BARRACKS', now, 5);
    refreshWorldTraining(s, now);
    const troop = s.units.troop;
    expect(unitStats(troop).move).toBe(UNITS.INFANTRY.move + 1);
    expect(unitStats(troop).vision).toBe(UNITS.INFANTRY.vision + 1);
    const isolated = createState('vision-support', now);
    isolated.realms.a = createRealm('a', 'Vision', 'ASH', { q: 50, r: 50 }, now);
    isolated.units.troop = structuredClone(troop);
    const edge = { q: UNITS.INFANTRY.vision + 1, r: 0 };
    expect(vision(isolated, isolated.realms.a).has(key(edge))).toBe(true);
    delete isolated.units.troop.supportBonus;
    expect(vision(isolated, isolated.realms.a).has(key(edge))).toBe(false);
    const path = Array.from({ length: unitStats(troop).move }, (_, i) => ({ q: i + 1, r: 0 }));
    for (const p of disk(troop, 12))
      r.explored[key(p)] = { ...p, terrain: 'PLAIN', visibility: 'EXPLORED' };
    const move = action('MOVE', troop.id, { path }),
      view = worldView(s, 'a', now);
    expect(predictAction(view, move)?.movement?.path).toEqual(path);
    expect(execute(s, 'a', move, now).result.accepted).toBe(true);
    const plan = planGroupMovement(view, [troop.id], path.at(-1)!);
    expect(plan.journeys[0].path.at(-1)).toEqual(path.at(-1));
    expect(
      execute(s, 'a', action('MOVE_GROUP', 'a', { orders: plan.orders }), now).result.accepted,
    ).toBe(true);
    for (const b of Object.values(s.buildings)) if (b.kind === 'BARRACKS') delete s.buildings[b.id];
    expect(execute(s, 'a', move, now).result.accepted).toBe(false);
  });
});
