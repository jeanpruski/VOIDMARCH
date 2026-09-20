import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  movementResource,
  movementPayment,
  mobilityCost,
  UNITS,
  type UnitKind,
} from '@voidmarch/config';
import { createState, disk, key, writeTile } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { beginCodeSession } from '../apps/server/src/code-session';
import { actionSchema } from '@voidmarch/protocol';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { planGroupMovement } from '../apps/web/src/group-movement';
const now = 1900000000000;
const action = (type: string, actorId: string, payload: unknown) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
function fixture() {
  const s = createState('mobility', now),
    r = addPlayer(s, 'p', 'Mobilité', 'ASH', now);
  s.units = {};
  r.ap = 0;
  r.wallet = { GOLD: 10000, WOOD: 10000, STONE: 10000, IRON: 10000, FOOD: 10000 };
  for (const p of disk({ q: 0, r: 0 }, 12)) {
    writeTile(s, p, { terrain: 'PLAIN', road: false, ownerId: undefined });
    r.explored[key(p)] = { ...p, terrain: 'PLAIN', visibility: 'EXPLORED' };
  }
  const unit = (id: string, kind: UnitKind, q: number, row = 0) =>
    (s.units[id] = {
      id,
      kind,
      ownerId: r.id,
      q,
      r: row,
      hp: UNITS[kind].hp,
      createdAt: now,
      updatedAt: now,
    });
  return { s, r, unit };
}
describe('réserves de déplacement', () => {
  it.each(['INFANTRY', 'FIGHTER', 'CARGO_TRUCK'] as const)(
    'aqw : déplace %s sans débiter ni remplir les réserves',
    (kind) => {
      for (const value of [0, 3]) {
        const { s, r, unit } = fixture();
        unit('u', kind, 0);
        r.unlimitedAP = true;
        r.fuel = r.pervitin = value;
        const command = action('MOVE', 'u', { path: [{ q: 1, r: 0 }] });
        const prediction = predictAction(worldView(s, r.id, now), command)!;
        const actual = execute(s, r.id, command, now);
        expect(actual.result.accepted, actual.result.reason).toBe(true);
        for (const realm of [actual.state.realms.p, prediction.world.player])
          expect(realm).toMatchObject({ ap: 0, fuel: value, pervitin: value, unlimitedAP: true });
        expect(actual.state.units.u.q).toBe(1);
        expect(actual.state.realms.p.mobilityReceipts).toEqual(r.mobilityReceipts);
        const reserve = JSON.parse(JSON.stringify(actual.state.realms.p));
        beginCodeSession(reserve, randomUUID());
        expect(reserve).toMatchObject({ ap: 0, fuel: value, pervitin: value, unlimitedAP: false });
        actual.state.realms.p.unlimitedAP = false;
        const back = execute(
          actual.state,
          r.id,
          action('MOVE', 'u', { path: [{ q: 0, r: 0 }] }),
          now,
        );
        expect(back.result.accepted).toBe(value > 0);
        if (value > 0) expect(back.state.realms.p[movementResource(kind)!]).toBe(value - 1);
      }
    },
  );
  it('aqw : groupe mixte gratuit même avec des réserves vides, sans changer les portées', () => {
    const { s, r, unit } = fixture();
    unit('a', 'INFANTRY', 0);
    unit('b', 'FIGHTER', 0, 2);
    unit('c', 'INFANTRY', 0, 4);
    r.unlimitedAP = true;
    r.fuel = r.pervitin = 0;
    const view = worldView(s, r.id, now);
    const plan = planGroupMovement(view, ['a', 'b', 'c'], { q: 3, r: 2 });
    expect(plan.orders).toHaveLength(3);
    expect({ ap: plan.cost, fuel: plan.fuel, pervitin: plan.pervitin }).toEqual({
      ap: 0,
      fuel: 0,
      pervitin: 0,
    });
    const command = action('MOVE_GROUP', r.id, { orders: plan.orders });
    const actual = execute(s, r.id, command, now);
    expect(actual.result.accepted, actual.result.reason).toBe(true);
    expect(actual.state.realms.p).toMatchObject({ ap: 0, fuel: 0, pervitin: 0 });
    expect(predictAction(view, command)?.world.player).toMatchObject({
      ap: 0,
      fuel: 0,
      pervitin: 0,
    });
    const far = action('MOVE', 'a', {
      path: Array.from({ length: 10 }, (_, i) => ({ q: i + 1, r: 0 })),
    });
    expect(execute(s, r.id, far, now).result.accepted).toBe(false);
  });

  it('classe les troupes, appareils motorisés et navires anciens', () => {
    for (const kind of ['HERO', 'PEASANT', 'INFANTRY', 'SPECTRAL_RIDER'] as UnitKind[])
      expect(movementResource(kind)).toBe('pervitin');
    for (const kind of ['FIGHTER', 'FISHING_TRAWLER', 'LANDING_SHIP'] as UnitKind[])
      expect(movementResource(kind)).toBe('fuel');
    expect(movementResource('WAR_GALLEY')).toBeUndefined();
    expect(movementPayment('INFANTRY', 0, { fuel: 20, pervitin: 20 })).toEqual({
      ap: 0,
      fuel: 0,
      pervitin: 0,
    });
  });
  it.each([
    ['INFANTRY', 'pervitin'],
    ['FIGHTER', 'fuel'],
  ] as const)('utilise %s avant les PA et aligne le client', (kind, resource) => {
    const { s, r, unit } = fixture();
    unit('u', kind, 0);
    r[resource] = 2;
    const a = action('MOVE', 'u', { path: [{ q: 1, r: 0 }] });
    const prediction = predictAction(worldView(s, r.id, now), a)!;
    const actual = execute(s, r.id, a, now);
    expect(actual.result.accepted, actual.result.reason).toBe(true);
    expect(actual.state.realms.p.ap).toBe(0);
    expect(actual.state.realms.p[resource]).toBe(1);
    expect(prediction.world.player[resource]).toBe(1);
    expect(prediction.world.player.ap).toBe(0);
  });
  it('revient aux PA quand la réserve adaptée est vide, sans prendre l’autre réserve', () => {
    const { s, r, unit } = fixture();
    unit('u', 'INFANTRY', 0);
    r.ap = 2;
    r.fuel = 50;
    const result = execute(s, r.id, action('MOVE', 'u', { path: [{ q: 1, r: 0 }] }), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.p.ap).toBe(1);
    expect(result.state.realms.p.fuel).toBe(50);
  });
  it('ne facture ni routes ni enceintes fermées', () => {
    for (const road of [true, false]) {
      const { s, r, unit } = fixture();
      unit('u', 'INFANTRY', 0);
      r.pervitin = 4;
      for (const q of [0, 1])
        writeTile(
          s,
          { q, r: 0 },
          { terrain: 'PLAIN', road, ownerId: r.id, enclosureOwnerId: road ? undefined : r.id },
        );
      for (const type of ['MOVE', 'MOVE_ROAD']) {
        const actual = execute(
          s,
          r.id,
          action(type, 'u', type === 'MOVE' ? { path: [{ q: 1, r: 0 }] } : { q: 1, r: 0 }),
          now,
        );
        expect(actual.result.accepted, actual.result.reason).toBe(true);
        expect(actual.state.realms.p.pervitin).toBe(4);
        expect(actual.state.realms.p.ap).toBe(0);
      }
    }
  });
  it('partage les réserves dans un groupe mixte avec paiement atomique', () => {
    const { s, r, unit } = fixture();
    unit('a', 'INFANTRY', 0);
    unit('b', 'FIGHTER', 0, 2);
    unit('c', 'INFANTRY', 0, 4);
    r.pervitin = 1;
    r.fuel = 1;
    r.ap = 1;
    const view = worldView(s, r.id, now);
    const plan = planGroupMovement(view, ['a', 'b', 'c'], { q: 3, r: 2 });
    expect(plan.orders).toHaveLength(3);
    expect({ ap: plan.cost, fuel: plan.fuel, pervitin: plan.pervitin }).toEqual({
      ap: 1,
      fuel: 1,
      pervitin: 1,
    });
    const a = action('MOVE_GROUP', r.id, { orders: plan.orders });
    const result = execute(s, r.id, a, now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.realms.p).toMatchObject({ ap: 0, fuel: 0, pervitin: 0 });
    const predicted = predictAction(view, a)!;
    expect(predicted.world.player).toMatchObject({ ap: 0, fuel: 0, pervitin: 0 });
    r.ap = 0;
    expect(execute(s, r.id, a, now).state).toBe(s);
    expect(r).toMatchObject({ fuel: 1, pervitin: 1 });
  });
  it('produit à 0 PA, plafonne à 10 au niveau 1 et ne paie pas un lot refusé', () => {
    const { s, r } = fixture();
    const b = addBuilding(s, r, { q: 2, r: 2 }, 'WORKSHOP', now);
    r.fuel = 5;
    const invalid = execute(
      s,
      r.id,
      action('PRODUCE_MOBILITY', b.id, { resource: 'fuel', amount: 10 }),
      now,
    );
    expect(invalid.result.accepted).toBe(false);
    expect(invalid.state).toBe(s);
    const valid = execute(
      s,
      r.id,
      action('PRODUCE_MOBILITY', b.id, { resource: 'fuel', amount: 5 }),
      now,
    );
    expect(valid.result.accepted).toBe(true);
    expect(valid.state.realms.p.fuel).toBe(10);
    expect(valid.state.realms.p.ap).toBe(0);
    expect(valid.state.realms.p.wallet.GOLD).toBe(
      10000 - mobilityCost('WORKSHOP', 1, 'fuel', 5).GOLD!,
    );
    expect(
      execute(s, r.id, action('PRODUCE_MOBILITY', b.id, { resource: 'pervitin', amount: 1 }), now)
        .result.accepted,
    ).toBe(false);
  });
  it('conserve les tarifs spécialisés mais augmente les prix avec le niveau', () => {
    expect(mobilityCost('REFINERY', 1, 'fuel', 1).GOLD).toBeLessThan(
      mobilityCost('WORKSHOP', 1, 'fuel', 1).GOLD!,
    );
    expect(mobilityCost('FIELD_HOSPITAL', 5, 'pervitin', 1).FOOD).toBeGreaterThan(
      mobilityCost('MONASTERY', 1, 'pervitin', 1).FOOD!,
    );
  });
  it('ne facture que le transport, même avec plusieurs passagers', () => {
    const { s, r, unit } = fixture();
    const truck = unit('truck', 'CARGO_TRUCK', 0);
    const a = unit('a', 'INFANTRY', 0),
      b = unit('b', 'INFANTRY', 0);
    s.units.truck.cargo = [
      { ...a, carrierId: truck.id },
      { ...b, carrierId: truck.id },
    ];
    delete s.units.a;
    delete s.units.b;
    r.fuel = 2;
    r.pervitin = 4;
    const result = execute(s, r.id, action('MOVE', truck.id, { path: [{ q: 1, r: 0 }] }), now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.realms.p).toMatchObject({ fuel: 1, pervitin: 4, ap: 0 });
    expect(result.state.units.truck.cargo?.map((u) => u.q)).toEqual([1, 1]);
  });
});
