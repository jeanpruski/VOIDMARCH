import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BUILDINGS, UNITS, unitFoodUpkeep, type UnitKind } from '@voidmarch/config';
import {
  accrueEconomy,
  createState,
  createRealm,
  disk,
  writeTile,
  unitStats,
  supplyCost,
  supplyCharges,
  supplySource,
  repairPlan,
  foodBalance,
  income,
  estimateDamage,
} from '@voidmarch/game-rules';
import { actionSchema } from '@voidmarch/protocol';
import type { Unit } from '@voidmarch/shared';
import { addBuilding, execute, worldView } from '../apps/server/src/engine';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { strategy } from '../apps/server/src/strategy';

const now = 1_900_000_000_000;
const order = (type: string, actorId: string, payload: unknown = {}) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
function fixture() {
  const s = createState('food-balance', now);
  const r = (s.realms.p = createRealm('p', 'Intendance', 'ASH', { q: 0, r: 0 }, now));
  r.wallet = { GOLD: 100000, WOOD: 100000, STONE: 100000, IRON: 100000, FOOD: 100000 };
  for (const p of disk(r.capital, 8)) writeTile(s, p, { terrain: 'PLAIN' });
  const depot = addBuilding(s, r, r.capital, 'CAMP', now);
  const unit = (id: string, kind: UnitKind = 'INFANTRY', q = 1): Unit =>
    (s.units[id] = {
      id,
      kind,
      ownerId: r.id,
      q,
      r: 0,
      hp: UNITS[kind].hp,
      createdAt: now,
      updatedAt: now,
    });
  const u = unit('troop');
  return { s, r, u, depot, unit };
}

describe('vivres et intendance', () => {
  it('préserve le départ et rend une armée avancée plus coûteuse à nourrir', () => {
    const { s, u, r } = fixture();
    u.kind = 'PEASANT';
    expect(unitFoodUpkeep('PEASANT')).toBe(0.25);
    expect(unitFoodUpkeep('HERO')).toBe(0);
    expect(income(s, r.id).FOOD).toBeGreaterThan(3);
    expect(unitFoodUpkeep('RIFLEMAN')).toBeGreaterThan(unitFoodUpkeep('INFANTRY'));
    expect(unitFoodUpkeep('KNIGHT')).toBeGreaterThan(unitFoodUpkeep('RIFLEMAN'));
    expect(unitFoodUpkeep('GLOCKE_APOCALYPSE')).toBeGreaterThan(unitFoodUpkeep('TANK'));
    for (const kind of Object.keys(UNITS) as UnitKind[])
      expect(Number.isFinite(unitFoodUpkeep(kind))).toBe(true);
  });

  it('facture une recharge partielle et un groupe de manière identique au client', () => {
    const { s, r, u, unit } = fixture();
    u.provisions = 6;
    const tank = unit('tank', 'TANK', 2);
    const cost = supplyCost(u).FOOD! + supplyCost(tank).FOOD!;
    expect(supplyCost(u).FOOD).toBe(supplyCost({ ...u, provisions: 0 }).FOOD! / 4);
    const command = order('RESUPPLY', r.id, { unitIds: [u.id, tank.id] });
    const source = worldView(s, r.id, now);
    const predicted = predictAction(source, command)!;
    const result = execute(s, r.id, command, now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.p.wallet.FOOD).toBe(r.wallet.FOOD - cost);
    expect(result.state.realms.p.ap).toBe(38);
    expect(result.state.units.troop.provisions).toBe(8);
    expect(result.state.units.tank.provisions).toBe(8);
    expect(predicted.world.player.wallet).toEqual(result.state.realms.p.wallet);
    expect(predicted.world.player.ap).toBe(result.state.realms.p.ap);
    expect(predicted.world.units.find((x) => x.id === u.id)?.provisions).toBe(8);
    expect(s.units.troop.provisions).toBe(6);
  });

  it.each(['food', 'ap', 'duplicate', 'foreign', 'range', 'full', 'builder', 'empty', 'too-many'])(
    'refuse un ordre invalide (%s) sans dépense partielle',
    (failure) => {
      const { s, r, u, unit } = fixture();
      const second = unit('second', 'RIFLEMAN', 2);
      let ids = [u.id, second.id];
      if (failure === 'food') r.wallet.FOOD = supplyCost(u).FOOD!;
      if (failure === 'ap') r.ap = 1;
      if (failure === 'duplicate') ids = [u.id, u.id];
      if (failure === 'foreign') second.ownerId = 'enemy';
      if (failure === 'range') second.q = 3;
      if (failure === 'full') second.provisions = 8;
      if (failure === 'builder') second.kind = 'PEASANT';
      if (failure === 'empty') ids = [];
      if (failure === 'too-many') ids = Array.from({ length: 11 }, (_, i) => `u${i}`);
      const raw = {
        type: 'RESUPPLY',
        actorId: r.id,
        payload: { unitIds: ids },
        actionId: randomUUID(),
        clientTimestamp: now,
      };
      const parsed = actionSchema.safeParse(raw);
      if (failure === 'empty' || failure === 'too-many') {
        expect(parsed.success).toBe(false);
        return;
      }
      expect(parsed.success).toBe(true);
      const backup = structuredClone(s);
      const result = execute(s, r.id, parsed.data!, now);
      expect(result.result.accepted).toBe(false);
      expect(result.state).toEqual(backup);
    },
  );

  it('autorise les dépôts alliés et convois proches, jamais un dépôt ennemi', () => {
    const { s, r, u, depot, unit } = fixture();
    depot.ownerId = 'ally';
    s.realms.ally = createRealm('ally', 'Allié', 'ASH', { q: 10, r: 0 }, now);
    expect(supplySource(u, [depot], [])).toBeUndefined();
    expect(supplySource(u, [depot], [], ['p', 'ally'])?.id).toBe(depot.id);
    strategy(s, now).alliances.team = {
      id: 'team',
      name: 'Pacte',
      emblem: 'shield',
      leaderId: 'p',
      members: ['p', 'ally'],
      createdAt: now,
      messages: [],
      markers: [],
    };
    const result = execute(s, r.id, order('RESUPPLY', r.id, { unitIds: [u.id] }), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.ally.wallet).toEqual(s.realms.ally.wallet);
    const convoy = unit('convoy', 'CARGO_TRUCK', 2);
    expect(supplySource(u, [], [convoy])?.id).toBe(convoy.id);
    convoy.q = 3;
    expect(supplySource(u, [], [convoy])).toBeUndefined();
  });

  it('booste seulement l’attaque et consomme une charge après le calcul des dégâts', () => {
    const { s, r, u, unit } = fixture();
    u.provisions = 1;
    const base = unitStats({ ...u, provisions: 0 });
    const supplied = unitStats(u);
    expect(supplied.attack).toBeCloseTo(base.attack * 1.1, 2);
    expect(supplied.hp).toBe(base.hp);
    expect(supplied.defense).toBe(base.defense);
    expect(supplied.move).toBe(base.move);
    s.realms.enemy = createRealm('enemy', 'Adversaire', 'ASH', { q: 5, r: 0 }, now);
    s.realms.enemy.protectedUntil = 0;
    const target = unit('enemyUnit', 'TANK', 2);
    target.ownerId = 'enemy';
    const bounds = estimateDamage(
      u,
      target,
      { q: 2, r: 0, terrain: 'PLAIN' },
      Object.values(s.units),
      'PLAIN',
    );
    const result = execute(s, r.id, order('ATTACK', u.id, { targetId: target.id }), now);
    expect(result.result.accepted).toBe(true);
    const dealt = target.hp - result.state.units[target.id].hp;
    expect(dealt).toBeGreaterThanOrEqual(bounds.min);
    expect(dealt).toBeLessThanOrEqual(bounds.max);
    expect(result.state.units.troop.provisions).toBe(0);
    expect(unitStats(result.state.units.troop).attack).toBe(base.attack);
  });

  it('conserve les provisions en marchant, dans les sauvegardes et pendant l’absence', () => {
    const { s, r, u } = fixture();
    u.provisions = 8;
    const moved = execute(s, r.id, order('MOVE', u.id, { path: [{ q: 2, r: 0 }] }), now);
    expect(moved.result.accepted).toBe(true);
    expect(moved.state.units.troop.provisions).toBe(8);
    const loaded = JSON.parse(JSON.stringify(moved.state));
    accrueEconomy(loaded, loaded.realms.p, now + 24 * 3600000);
    expect(loaded.units.troop.provisions).toBe(8);
    expect(supplyCharges({ ...u, provisions: undefined })).toBe(0);
  });

  it('soigne les blessures réelles et consomme une provision pour un soin renforcé', () => {
    const { s, r, u } = fixture();
    u.kind = 'OCCULT_DRAGON';
    u.hp = 1;
    const normal = repairPlan(u);
    expect(normal.cost.FOOD).toBeGreaterThan(10);
    u.provisions = 1;
    const enhanced = repairPlan(u);
    expect(enhanced.restored).toBe(Math.ceil(unitStats(u).hp * 0.75));
    expect(enhanced.restored).toBeGreaterThan(normal.restored);
    const command = order('REPAIR', u.id);
    const predicted = predictAction(worldView(s, r.id, now), command)!;
    const result = execute(s, r.id, command, now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.units.troop.hp).toBe(1 + enhanced.restored);
    expect(result.state.units.troop.provisions).toBe(0);
    expect(predicted.world.player.wallet).toEqual(result.state.realms.p.wallet);
    expect(predicted.world.units.find((x) => x.id === u.id)?.hp).toBe(result.state.units.troop.hp);
    const scratch = repairPlan({ ...u, hp: unitStats(u).hp - 1 });
    expect(scratch.restored).toBe(1);
    expect(scratch.cost.FOOD).toBe(10);
    expect(repairPlan({ ...u, hp: unitStats(u).hp }).cost).toEqual({});
  });

  it('compte une seule fois les passagers et explique le bilan alimentaire, même sous radiation', () => {
    const { s, r, u, depot, unit } = fixture();
    const convoy = unit('truck', 'CARGO_TRUCK', 2);
    const before = foodBalance(s, r.id);
    convoy.cargo = [{ ...u, carrierId: convoy.id }];
    delete s.units[u.id];
    for (const [field, value] of Object.entries(before))
      expect(foodBalance(s, r.id)[field as keyof typeof before]).toBeCloseTo(value);
    expect(before.army).toBe(unitFoodUpkeep(u.kind) + unitFoodUpkeep(convoy.kind));
    strategy(s, now).fallout['0,0'] = { q: 0, r: 0, intensity: 75 };
    const after = foodBalance(s, r.id);
    expect(after.production).toBeCloseTo(BUILDINGS.CAMP.production.FOOD! * 0.5);
    expect(after.civilians).toBeCloseTo(depot.population * 0.015);
    expect(after.net).toBeCloseTo(after.production - after.army - after.civilians);
    expect(worldView(s, r.id, now).player.foodBalance).toEqual(after);
  });

  it('ne tue aucune troupe en cas de pénurie et cesse l’entretien après la grâce', () => {
    const { s, r, u, unit } = fixture();
    for (let i = 0; i < 20; i++) unit(`dragon${i}`, 'OCCULT_DRAGON');
    r.wallet.FOOD = 1;
    u.provisions = 4;
    const hp = Object.values(s.units).map((x) => x.hp);
    accrueEconomy(s, r, now + 86400000);
    expect(r.wallet.FOOD).toBe(0);
    expect(Object.values(s.units).map((x) => x.hp)).toEqual(hp);
    r.wallet.FOOD = 100;
    accrueEconomy(s, r, now + 86400000 * 2);
    expect(r.wallet.FOOD).toBe(100);
    expect(u.provisions).toBe(4);
  });
});
