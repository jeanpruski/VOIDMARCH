import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  RULES,
  BUILDINGS,
  BUILDING_REQUIREMENTS,
  RESOURCES,
  UNITS,
  UNIT_PROFILES,
  unitPopulation,
  unitUpkeep,
  type Terrain,
  type Resource,
  type BuildingKind,
} from '@voidmarch/config';
import {
  createState,
  writeTile,
  income,
  movementCost,
  findPath,
  zeroWallet,
  realmUnits,
  armyPopulation,
  accrueEconomy,
} from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { migrateResourceWallets } from '../apps/server/src/migrations';
const now = 1900000000000;
function fixture(terrain: Terrain = 'PLAIN') {
  const s = createState('balance', now);
  const r = addPlayer(s, 'p', 'Pionniers', 'ASH', now);
  s.units.worker = {
    id: 'worker',
    ownerId: r.id,
    kind: 'PEASANT',
    q: 0,
    r: 0,
    hp: 5,
    createdAt: now,
    updatedAt: now,
  };
  writeTile(s, r.capital, { terrain });
  return s;
}
const harvest = (s: ReturnType<typeof fixture>, resource: Resource) =>
  execute(
    s,
    'p',
    actionSchema.parse({
      type: 'GATHER',
      actorId: 'worker',
      payload: { resource },
      actionId: randomUUID(),
      clientTimestamp: now,
    }),
    now,
  );
const terrains: [Terrain, Resource[]][] = [
  ['PLAIN', ['FOOD']],
  ['FOREST', ['WOOD']],
  ['HILL', ['IRON', 'STONE']],
  ['MOUNTAIN', ['STONE']],
  ['RIVER', ['FOOD']],
  ['MARSH', ['FOOD']],
  ['RUINS', ['GOLD']],
  ['CORRUPTION', []],
  ['ALIEN', []],
];
describe('récoltes sur le terrain occupé', () => {
  it.each(
    terrains.flatMap(([terrain, allowed]) =>
      RESOURCES.map((resource) => ({ terrain, resource, allowed: allowed.includes(resource) })),
    ),
  )('$terrain / $resource', ({ terrain, resource, allowed }) => {
    const s = fixture(terrain);
    const result = harvest(s, resource);
    expect(result.result.accepted).toBe(allowed);
    expect(result.state.realms.p.ap).toBe(allowed ? RULES.startingAP - 1 : RULES.startingAP);
    expect(result.state.realms.p.wallet[resource] > 0).toBe(allowed);
  });
  it('refuse la forêt voisine et une forêt appartenant à un adversaire', () => {
    const s = fixture();
    writeTile(s, { q: 1, r: 0 }, { terrain: 'FOREST' });
    expect(harvest(s, 'WOOD').result.accepted).toBe(false);
    writeTile(s, s.units.worker, { terrain: 'FOREST', ownerId: 'enemy' });
    expect(harvest(s, 'WOOD').result.accepted).toBe(false);
  });
  it('rend la pierre accessible à pied et bloque les véhicules en montagne sans route', () => {
    const mountain = { q: 1, r: 0, terrain: 'MOUNTAIN' as const };
    expect(movementCost(mountain, 'PEASANT')).toBe(3);
    expect(movementCost(mountain, 'TANK')).toBe(99);
    expect(movementCost({ ...mountain, road: true }, 'TANK')).toBe(1);
    expect(
      findPath({ q: 0, r: 0 }, mountain, () => mountain, 3, new Set(), 'PEASANT'),
    ).toHaveLength(1);
    expect(findPath({ q: 0, r: 0 }, mountain, () => mountain, 3, new Set(), 'TANK')).toBeNull();
  });
});
describe('économie et progression', () => {
  it('ne crée ni bois ni minerais au campement ou par simple propriété du terrain', () => {
    const s = fixture();
    writeTile(s, { q: 1, r: 0 }, { terrain: 'FOREST', ownerId: 'p' });
    expect(income(s, 'p').WOOD).toBe(0);
    expect(income(s, 'p').IRON).toBe(0);
    expect(income(s, 'p').STONE).toBe(0);
    addBuilding(s, s.realms.p, { q: 1, r: 0 }, 'LUMBER', now);
    expect(income(s, 'p').WOOD).toBe(8);
    writeTile(s, { q: 1, r: 0 }, { terrain: 'PLAIN' });
    expect(income(s, 'p').WOOD).toBe(0);
  });
  it('produit la pierre à la carrière et le fer à la mine, sans fer gratuit dans une forge', () => {
    const s = fixture();
    addBuilding(s, s.realms.p, { q: 1, r: 0 }, 'QUARRY', now);
    writeTile(s, { q: 1, r: 0 }, { terrain: 'MOUNTAIN' });
    addBuilding(s, s.realms.p, { q: 0, r: 1 }, 'MINE', now);
    writeTile(s, { q: 0, r: 1 }, { terrain: 'HILL' });
    addBuilding(s, s.realms.p, { q: -1, r: 0 }, 'FORGE', now);
    expect(income(s, 'p').STONE).toBe(6);
    expect(income(s, 'p').IRON).toBe(5);
  });
  it('conserve des stocks finis et positifs sur deux heures et borne la croissance des chaumières', () => {
    const s = fixture(),
      r = s.realms.p;
    r.wallet.FOOD = 700;
    const house = addBuilding(s, r, { q: 1, r: 0 }, 'HOUSE', now);
    r.lastSeen = now + 120 * 60000;
    accrueEconomy(s, r, r.lastSeen);
    expect(house.population).toBeLessThanOrEqual(24);
    for (const value of Object.values(r.wallet))
      expect(Number.isFinite(value) && value >= 0).toBe(true);
  });
  it('impose davantage de population et de maintenance au char qu’au fantassin', () => {
    expect(unitPopulation('TANK')).toBeGreaterThan(unitPopulation('INFANTRY'));
    expect(unitUpkeep('TANK').GOLD).toBeGreaterThan(unitUpkeep('INFANTRY').GOLD);
    expect(unitUpkeep('TANK').IRON).toBeGreaterThan(0);
    const s = fixture();
    expect(armyPopulation(realmUnits(s, 'p'))).toBe(3);
  });
  it('tous les bâtiments et recrutements possèdent une chaîne de prérequis réalisable', () => {
    const available = new Set<BuildingKind>();
    for (let i = 0; i < Object.keys(BUILDINGS).length; i++)
      for (const kind of Object.keys(BUILDINGS) as BuildingKind[])
        if ((BUILDING_REQUIREMENTS[kind] ?? []).every((req) => available.has(req)))
          available.add(kind);
    expect(available.size).toBe(Object.keys(BUILDINGS).length);
    for (const profile of Object.values(UNIT_PROFILES).filter((p) => !p.hero)) {
      expect(profile.recruitAt.some((kind) => available.has(kind))).toBe(true);
      expect(profile.requires.every((kind) => available.has(kind))).toBe(true);
    }
    expect(BUILDINGS.OUTPOST.hp).toBeGreaterThanOrEqual(BUILDINGS.CAMP.hp);
    expect(BUILDINGS.VILLAGE.hp).toBeGreaterThanOrEqual(BUILDINGS.OUTPOST.hp);
    expect(BUILDINGS.QUARRY.cost.STONE).toBe(0);
    expect(Object.keys(UNITS)).toHaveLength(289);
  });
  it('complète les anciennes sauvegardes et les accords sans modifier les anciens stocks', () => {
    const wallet = { GOLD: 12, WOOD: 8, IRON: 4, FOOD: 20 };
    const legacy = {
      realms: { p: { wallet: { ...wallet } } },
      proposals: [{ offer: { ...wallet } }],
      archives: [{ realm: { wallet: { ...wallet } } }],
    };
    migrateResourceWallets(legacy);
    migrateResourceWallets(legacy);
    expect(legacy.realms.p.wallet).toEqual({ ...wallet, STONE: 0 });
    expect(legacy.proposals[0].offer).toEqual({ ...wallet, STONE: 0 });
    expect(legacy.archives[0].realm.wallet).toEqual({ ...wallet, STONE: 0 });
    expect(
      actionSchema.parse({
        type: 'PROPOSE',
        actorId: 'p',
        actionId: randomUUID(),
        clientTimestamp: now,
        payload: {
          kind: 'TRIBUTE',
          to: 'enemy',
          payer: 'p',
          offer: { ...zeroWallet(), STONE: 20 },
          request: zeroWallet(),
          duration: 60000,
        },
      }).type,
    ).toBe('PROPOSE');
  });
});
