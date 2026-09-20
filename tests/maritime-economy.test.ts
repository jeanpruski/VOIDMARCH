import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  LAND_EVENT_REWARDS,
  MARITIME_LOOT_COUNTERPARTS,
  eventResourceReward,
  UNITS,
  unitUpkeep,
  RULES,
  type UnitKind,
} from '@voidmarch/config';
import {
  createState,
  createRealm,
  writeTile,
  income,
  foodBalance,
  fishingYield,
  passiveFishingYield,
  accrueEconomy,
  eventAPReward,
  anomalyAPReward,
  storage,
} from '@voidmarch/game-rules';
import { execute, worldView } from '../apps/server/src/engine';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { actionSchema } from '@voidmarch/protocol';
import type { WorldEvent } from '@voidmarch/shared';
const now = 1900000000000;
function fixture(kind: UnitKind = 'FISHING_CUTTER') {
  const s = createState('fishing-economy', now);
  const r = (s.realms.p = createRealm('p', 'Pêcheurs', 'ASH', { q: 0, r: 0 }, now));
  r.wallet = { GOLD: 100, WOOD: 0, STONE: 0, IRON: 0, FOOD: 100 };
  s.units.ship = {
    id: 'ship',
    ownerId: 'p',
    kind,
    q: 0,
    r: 0,
    hp: UNITS[kind].hp,
    createdAt: now,
    updatedAt: now,
  };
  for (const q of [0, 1, 2])
    writeTile(s, { q, r: 0 }, { terrain: 'SEA', ownerId: undefined, poi: undefined });
  return s;
}
function command(type: string, payload: unknown) {
  return actionSchema.parse({
    type,
    actorId: 'ship',
    payload,
    actionId: randomUUID(),
    clientTimestamp: now,
  });
}
describe('pêche automatique et manuelle', () => {
  it.each([
    ['FISHING_CUTTER', 40, 10],
    ['FISHING_SCHOONER', 160, 40],
    ['FISHING_TRAWLER', 360, 90],
    ['AUTO_FISHER', 640, 160],
    ['ATOMIC_HARVESTER', 1000, 250],
  ] as const)(
    '%s produit le quart de la prise manuelle sans PA, avant entretien',
    (kind, manual, passive) => {
      const s = fixture(kind),
        r = s.realms.p,
        ap = r.ap;
      expect(fishingYield(s.units.ship, s.tiles['0,0'])).toBe(manual);
      expect(passiveFishingYield(s.units.ship, s.tiles['0,0'])).toBe(passive);
      expect(income(s, 'p').FOOD).toBeCloseTo(passive - (unitUpkeep(kind).FOOD ?? 0));
      expect(foodBalance(s, 'p')).toMatchObject({ production: passive, fishing: passive });
      accrueEconomy(s, r, now + 60000);
      expect(r.wallet.FOOD).toBeCloseTo(100 + passive - (unitUpkeep(kind).FOOD ?? 0));
      expect(r.ap).toBe(ap);
      accrueEconomy(s, r, now + 60000);
      expect(r.wallet.FOOD).toBeCloseTo(100 + passive - (unitUpkeep(kind).FOOD ?? 0));
    },
  );
  it('additionne les pêcheurs mais exclut navires de combat, morts et embarqués', () => {
    const s = fixture();
    s.units.second = { ...s.units.ship, id: 'second', kind: 'FISHING_TRAWLER', q: 1 };
    s.units.war = { ...s.units.ship, id: 'war', kind: 'WAR_GALLEY' };
    s.units.dead = { ...s.units.ship, id: 'dead', hp: 0 };
    s.units.cargo = { ...s.units.ship, id: 'cargo', carrierId: 'carrier' };
    expect(foodBalance(s, 'p').fishing).toBe(100);
  });
  it('accepte les eaux côtières et profondes neutres ou possédées, jamais la terre ni les eaux adverses', () => {
    const s = fixture(),
      ship = s.units.ship;
    for (const terrain of ['SEA', 'COAST'] as const) {
      for (const ownerId of [undefined, 'p'])
        expect(passiveFishingYield(ship, { terrain, ownerId })).toBe(10);
      expect(passiveFishingYield(ship, { terrain, ownerId: 'enemy' })).toBe(0);
    }
    for (const terrain of ['BEACH', 'PLAIN', 'RIVER'] as const)
      expect(passiveFishingYield(ship, { terrain })).toBe(0);
    expect(passiveFishingYield(ship, undefined)).toBe(0);
  });
  it('respecte stockage, délai de grâce et arrêt hors ligne, sans rattrapage au rechargement', () => {
    const s = fixture(),
      r = s.realms.p;
    const net = income(s, 'p').FOOD;
    accrueEconomy(s, r, now + RULES.grace + 60000);
    expect(r.wallet.FOOD).toBeCloseTo(100 + (net * RULES.grace) / 60000);
    const saved = JSON.parse(JSON.stringify(s));
    accrueEconomy(saved, saved.realms.p, now + 86400000);
    expect(saved.realms.p.wallet.FOOD).toBe(r.wallet.FOOD);
    r.economyAt = now;
    r.wallet.FOOD = storage(s, 'p') - 1;
    accrueEconomy(s, r, now + 60000);
    expect(r.wallet.FOOD).toBe(storage(s, 'p'));
    r.economyAt = now;
    r.wallet.FOOD += 100;
    accrueEconomy(s, r, now + 60000);
    expect(r.wallet.FOOD).toBe(storage(s, 'p') + 100);
  });
  it('conserve le bouton manuel en complément et règle la pêche avant un déplacement', () => {
    const s = fixture(),
      rate = income(s, 'p').FOOD;
    const result = execute(s, 'p', command('GATHER', { resource: 'FOOD' }), now + 60000);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.realms.p.wallet.FOOD).toBeCloseTo(100 + rate + 40);
    expect(result.state.realms.p.ap).toBe(39);
    writeTile(result.state, { q: 1, r: 0 }, { ownerId: 'enemy' });
    const moved = execute(
      result.state,
      'p',
      command('MOVE', { path: [{ q: 1, r: 0 }] }),
      now + 120000,
    );
    expect(moved.result.accepted, moved.result.reason).toBe(true);
    expect(foodBalance(moved.state, 'p').fishing).toBe(0);
    expect(moved.state.realms.p.wallet.FOOD).toBeCloseTo(100 + 2 * rate + 40);
  });
});
describe('butin maritime exactement double de son équivalent terrestre', () => {
  it.each(Object.entries(MARITIME_LOOT_COUNTERPARTS))(
    '%s correspond à %s, sans cumul du multiplicateur',
    (sea, land) => {
      const base = LAND_EVENT_REWARDS[land];
      const expected = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v * 2]));
      expect(eventResourceReward({ kind: sea, reward: { GOLD: 99999 } })).toEqual(expected);
      expect(eventResourceReward({ kind: sea, reward: expected })).toEqual(expected);
      for (let i = 0; i < 50; i++) {
        expect(eventAPReward('seed', { id: String(i), kind: sea })).toBe(
          2 * anomalyAPReward('seed', String(i)),
        );
        expect(eventAPReward('seed', { id: String(i), kind: land })).toBe(
          anomalyAPReward('seed', String(i)),
        );
      }
    },
  );
  it.each(Object.keys(MARITIME_LOOT_COUNTERPARTS))(
    '%s : ancienne épave, annonce, prédiction et butin reçu identiques, une seule fois',
    (kind) => {
      const s = fixture(),
        r = s.realms.p;
      r.ap = 20;
      const e: WorldEvent = (s.events.wreck = {
        id: 'wreck',
        q: 1,
        r: 0,
        kind: kind as WorldEvent['kind'],
        title: 'Découverte',
        description: 'Test',
        startsAt: now,
        endsAt: now + 3600000,
        global: false,
        reward: { GOLD: 99999 },
        relic: 'Relique témoin',
      });
      const before = worldView(s, 'p', now),
        action = command('INTERACT', { eventId: e.id });
      const reward = eventResourceReward(e);
      expect(before.events[0].reward).toEqual(reward);
      const predicted = predictAction(before, action)!.world;
      const result = execute(s, 'p', action, now);
      expect(result.result.accepted, result.result.reason).toBe(true);
      const actual = result.state.realms.p;
      for (const [resource, value] of Object.entries(reward))
        expect(actual.wallet[resource as keyof typeof r.wallet]).toBe(
          r.wallet[resource as keyof typeof r.wallet] + value,
        );
      expect(actual.ap).toBe(19 + eventAPReward(s.seed, e));
      expect(predicted.player.wallet).toEqual(actual.wallet);
      expect(predicted.player.ap).toBe(actual.ap);
      expect(actual.relics).toEqual(['Relique témoin']);
      expect(worldView(result.state, 'p', now).events).toHaveLength(0);
      expect(
        execute(result.state, 'p', command('INTERACT', { eventId: e.id }), now).result.accepted,
      ).toBe(false);
    },
  );
  it('préserve les récompenses terrestres sauvegardées', () => {
    expect(eventResourceReward({ kind: 'METEOR', reward: { IRON: 777 } })).toEqual({ IRON: 777 });
  });
});
