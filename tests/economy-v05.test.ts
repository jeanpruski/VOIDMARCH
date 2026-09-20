import { prepareTrophies } from './fixtures/development';
import { buildingUpgradeLevel } from '@voidmarch/config';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  BUILDINGS,
  UNITS,
  RESOURCES,
  buildingUpgrade,
  storageBonus,
  BALANCE_VERSION,
  ECONOMY_V2_BUILDING_COSTS,
  type BuildingKind,
} from '@voidmarch/config';
import { createState, writeTile, zeroWallet, storage, unitStats } from '@voidmarch/game-rules';
import { actionSchema } from '@voidmarch/protocol';
import { addBuilding, addPlayer, execute, worldView } from '../apps/server/src/engine';
import { migrateProgression } from '../apps/server/src/migrations';
import { predictAction } from '../apps/web/src/optimistic-actions';

const now = 1_900_000_000_000;
const upgrades = (Object.keys(BUILDINGS) as BuildingKind[]).flatMap((kind) =>
  [1, 2, 3, 4].filter((level) => buildingUpgrade(kind, level)).map((level) => ({ kind, level })),
);
function fixture(kind: BuildingKind, level = 1) {
  const state = createState('economy-v05', now);
  const realm = addPlayer(state, 'p', 'Bâtisseurs', 'MASK', now);
  const building = addBuilding(state, realm, { q: 1, r: 0 }, kind, now);
  writeTile(state, building, { terrain: 'PLAIN' });
  building.level = level;
  building.population = 1000;
  prepareTrophies(state, realm.id, buildingUpgradeLevel(buildingUpgrade(kind, level)!), now);
  const command = actionSchema.parse({
    type: 'UPGRADE',
    actorId: building.id,
    payload: {},
    actionId: randomUUID(),
    clientTimestamp: now,
  });
  return { state, realm, building, command };
}

describe('économie v0.5 : dépenses et accès au très haut niveau', () => {
  it('préserve l’amorçage et renchérit fortement la fin de progression', () => {
    expect(BUILDINGS.LUMBER.cost).toEqual(ECONOMY_V2_BUILDING_COSTS.LUMBER);
    expect(BUILDINGS.QUARRY.cost.STONE).toBe(0);
    expect(BUILDINGS.MINE.cost.IRON).toBe(0);
    expect(BUILDINGS.ISOTOPE_LAB.cost.GOLD).toBe(4400);
    expect(BUILDINGS.ATOMIC_FOUNDRY.cost.GOLD).toBe(15000);
    expect(BUILDINGS.GLOCKE_COMPLEX.cost.GOLD).toBe(33000);
    expect(UNITS.GLOCKE_APOCALYPSE.cost.GOLD).toBe(57000);
    expect(UNITS.GLOCKE_APOCALYPSE.cost.IRON).toBe(36000);
    expect(buildingUpgrade('GLOCKE_COMPLEX', 1)?.cost.GOLD).toBe(66000);
    expect(buildingUpgrade('GLOCKE_COMPLEX', 2)?.cost.GOLD).toBe(132000);
  });

  it.each(upgrades)(
    '$kind niveau $level : débite réellement les ressources et les 2 PA, comme le frontend',
    ({ kind, level }) => {
      const { state, realm, building, command } = fixture(kind, level);
      const quote = buildingUpgrade(kind, level)!;
      realm.wallet = { ...zeroWallet(), ...quote.cost };
      const before = structuredClone(state);
      const predicted = predictAction(worldView(state, realm.id, now), command);
      expect(predicted).toBeDefined();
      const result = execute(state, realm.id, command, now);
      expect(result.result.accepted, result.result.reason).toBe(true);
      expect(result.state.realms.p.wallet).toEqual(zeroWallet());
      expect(result.state.realms.p.ap).toBe(38);
      expect(result.state.buildings[building.id]).toMatchObject({
        kind: quote.kind,
        level: quote.level,
      });
      expect(predicted!.world.player.wallet).toEqual(result.state.realms.p.wallet);
      expect(predicted!.world.player.ap).toBe(38);
      expect(state).toEqual(before);
    },
  );

  it.each([false, true])(
    'refuse sans prélever de PA si une ressource manque, même avec PA illimités=%s',
    (unlimitedAP) => {
      const { state, realm, building, command } = fixture('GLOCKE_COMPLEX', 2);
      realm.unlimitedAP = unlimitedAP;
      realm.wallet = { ...zeroWallet(), ...buildingUpgrade(building.kind, 2)!.cost };
      realm.wallet.IRON--;
      const before = structuredClone(state);
      expect(predictAction(worldView(state, realm.id, now), command)).toBeUndefined();
      const result = execute(state, realm.id, command, now);
      expect(result.result.accepted).toBe(false);
      expect(result.result.reason).toContain('Ressources insuffisantes');
      expect(result.state).toEqual(before);
    },
  );

  it('permet de développer le stockage puis de payer le plus grand chantier', () => {
    const { state, realm, building } = fixture('WAREHOUSE');
    const fits = (cost: Partial<typeof realm.wallet>, cap: number) =>
      RESOURCES.every((r) => (cost[r] ?? 0) <= cap);
    expect(fits(BUILDINGS.WAREHOUSE.cost, 800)).toBe(true);
    for (const level of [1, 2]) {
      building.level = level;
      expect(fits(buildingUpgrade('WAREHOUSE', level)!.cost, storage(state, realm.id))).toBe(true);
    }
    building.level = 3;
    expect(storageBonus('WAREHOUSE', 3)).toBe(16000);
    expect(fits(BUILDINGS.RAIL_DEPOT.cost, storage(state, realm.id))).toBe(true);
    expect(fits(buildingUpgrade('RAIL_DEPOT', 2)!.cost, storage(state, realm.id))).toBe(true);
    for (let i = 0; i < 6; i++)
      addBuilding(state, realm, { q: i + 2, r: 0 }, 'RAIL_DEPOT', now).level = 3;
    expect(fits(buildingUpgrade('GLOCKE_COMPLEX', 2)!.cost, storage(state, realm.id))).toBe(true);
  });

  it('migre les sauvegardes v2 sans retoucher les blessures, stocks, PA ou remboursements historiques', () => {
    const { state, realm, building } = fixture('GLOCKE_COMPLEX', 2);
    state.balanceVersion = 2;
    building.hp = 175;
    delete building.constructionCost;
    state.units.tank = {
      id: 'tank',
      ownerId: 'p',
      kind: 'TANK',
      q: 0,
      r: 0,
      hp: 40,
      trainingBonus: 25,
      createdAt: now,
      updatedAt: now,
    };
    state.archives.p = {
      version: 1,
      createdAt: now,
      realmValue: 123,
      realm: structuredClone(realm),
      buildings: [structuredClone(building)],
      units: [structuredClone(state.units.tank)],
      tiles: [],
    };
    const units = structuredClone(state.units),
      wallet = structuredClone(realm.wallet),
      ap = realm.ap;
    expect(migrateProgression(state, now + 1)).toBe(true);
    expect(state.balanceVersion).toBe(BALANCE_VERSION);
    expect(state.units).toEqual(units);
    expect(building.hp).toBe(175);
    expect(building.constructionCost).toEqual(ECONOMY_V2_BUILDING_COSTS.GLOCKE_COMPLEX);
    expect(state.archives.p.buildings[0].constructionCost).toEqual(building.constructionCost);
    expect(state.archives.p.units[0].hp).toBe(40);
    expect(realm.wallet).toEqual(wallet);
    expect(realm.ap).toBe(ap);
    const stable = structuredClone(state);
    expect(migrateProgression(state, now + 2)).toBe(false);
    expect(state).toEqual(stable);
    expect(state.units.tank.hp).toBeLessThan(unitStats(state.units.tank).hp);
  });
});
