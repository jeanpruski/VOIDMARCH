import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { UNITS, type UnitKind } from '@voidmarch/config';
import { createState, disk, distance, key, movementCost, writeTile } from '@voidmarch/game-rules';
import { actionSchema } from '@voidmarch/protocol';
import { addPlayer, execute, worldView, addBuilding } from '../apps/server/src/engine';
import { planGroupMovement } from '../apps/web/src/group-movement';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { pendingWorld } from '../apps/web/src/pending-action';
const now = 1800000000000;
function fixture() {
  const s = createState('group-move', now),
    r = addPlayer(s, 'p', 'Armée', 'ASH', now);
  s.units = {};
  for (const p of disk(r.capital, 18)) {
    writeTile(s, p, { terrain: 'PLAIN', ownerId: undefined, road: false });
    r.explored[key(p)] = { ...p, terrain: 'PLAIN', visibility: 'EXPLORED' };
  }
  const unit = (id: string, kind: UnitKind, q: number, row = 0) => {
    s.units[id] = {
      id,
      ownerId: 'p',
      kind,
      q,
      r: row,
      hp: UNITS[kind].hp,
      createdAt: now,
      updatedAt: now,
    };
    return s.units[id];
  };
  unit('slow', 'PEASANT', 0);
  unit('fast', 'HERO', 0, 2);
  const view = () => worldView(s, 'p', now, disk({ q: 0, r: 0 }, 2));
  return { s, r, unit, view };
}
const command = (orders: unknown[]) =>
  actionSchema.parse({
    type: 'MOVE_GROUP',
    actorId: 'p',
    payload: { orders },
    actionId: randomUUID(),
    clientTimestamp: now,
  });
const move = (actorId: string, q: number, r = 0) => ({
  type: 'MOVE',
  actorId,
  payload: { path: [{ q, r }] },
});
describe('déplacement groupé', () => {
  it('respecte la mobilité de chaque type, réserve les arrivées et ne modifie pas le snapshot', () => {
    const { s, view } = fixture(),
      source = view(),
      before = structuredClone(source);
    const plan = planGroupMovement(source, ['slow', 'fast'], { q: 12, r: 0 });
    expect(plan.orders).toHaveLength(2);
    expect(plan.cost).toBe(2);
    for (const journey of plan.journeys) {
      const unit = s.units[journey.unitId];
      expect(journey.path.length).toBeLessThanOrEqual(12);
      expect(
        journey.path.reduce((n, p) => n + movementCost(s.tiles[key(p)], unit.kind), 0),
      ).toBeLessThanOrEqual(UNITS[unit.kind].move);
    }
    const fast = plan.journeys.find((j) => j.unitId === 'fast')!,
      slow = plan.journeys.find((j) => j.unitId === 'slow')!;
    expect(distance(fast.path.at(-1)!, slow.path.at(-1)!)).toBe(1);
    expect(fast.path.length).toBeLessThan(UNITS.HERO.move);
    expect(new Set(plan.journeys.map((j) => key(j.path.at(-1)!))).size).toBe(2);
    const actual = execute(s, 'p', command(plan.orders), now);
    expect(actual.result.accepted, actual.result.reason).toBe(true);
    expect(actual.result.movements).toHaveLength(2);
    expect(actual.state.realms.p.ap).toBe(s.realms.p.ap - 2);
    expect(source).toEqual(before);
  });
  it('regroupe une unité rapide partie trop loin devant au lieu de creuser l’écart', () => {
    const { s, view } = fixture();
    Object.assign(s.units.fast, { q: 8, r: 0 });
    const plan = planGroupMovement(view(), ['slow', 'fast'], { q: 12, r: 0 });
    const fast = plan.journeys.find((j) => j.unitId === 'fast')!;
    const slow = plan.journeys.find((j) => j.unitId === 'slow')!;
    expect(distance(fast.path.at(-1)!, slow.path.at(-1)!)).toBe(1);
    expect(fast.path.at(-1)!.q).toBeLessThan(8);
    expect(slow.path.at(-1)!.q).toBeGreaterThan(0);
    expect(execute(s, 'p', command(plan.orders), now).result.accepted).toBe(true);
  });
  it('ne facture pas une unité déjà au point de rassemblement', () => {
    const { s, view } = fixture();
    Object.assign(s.units.fast, { q: 3, r: 0 });
    const plan = planGroupMovement(view(), ['slow', 'fast'], { q: 3, r: 0 });
    expect(plan.stationary.map((u) => u.unitId)).toContain('fast');
    expect(plan.cost).toBe(1);
    expect(distance(plan.journeys[0].path.at(-1)!, s.units.fast)).toBe(1);
  });
  it('accepte dix troupes mais refuse la onzième aussi dans le moteur', () => {
    const { s, unit } = fixture();
    s.units = {};
    const orders = Array.from({ length: 10 }, (_, i) => {
      unit(`u${i}`, 'INFANTRY', i, -5);
      return move(`u${i}`, i, -6);
    });
    const action = command(orders);
    expect(execute(s, 'p', action, now).result.accepted).toBe(true);
    expect(execute(s, 'p', action, now).state.realms.p.ap).toBe(30);
    if (action.type === 'MOVE_GROUP')
      action.payload.orders.push({
        type: 'MOVE',
        actorId: 'extra',
        payload: { path: [{ q: 0, r: 0 }] },
      });
    const refused = execute(s, 'p', action, now);
    expect(refused.result.accepted).toBe(false);
    expect(refused.state).toBe(s);
    expect(refused.result.reason).toContain('10 troupes');
  });
  it('fait partir le premier rang avant le suivant dans un couloir', () => {
    const { s, unit, view } = fixture();
    delete s.units.fast;
    unit('front', 'INFANTRY', 1);
    const source = view();
    source.tiles = source.tiles.filter((t) => t.r === 0);
    const plan = planGroupMovement(source, ['slow', 'front'], { q: 8, r: 0 });
    expect(plan.orders.map((o) => o.actorId)).toEqual(['front', 'slow']);
    expect(plan.journeys[1].path[0]).toMatchObject({ q: 1, r: 0 });
    expect(execute(s, 'p', command(plan.orders), now).result.accepted).toBe(true);
  });
  it.each(['road', 'territory'])(
    'déplace plusieurs types sans limite sur un réseau %s pour 1 PA chacun',
    (kind) => {
      const { s, r, view } = fixture();
      for (const p of disk(r.capital, 15)) {
        writeTile(s, p, { ...(kind === 'road' ? { road: true } : { ownerId: 'p' }) });
        Object.assign(r.explored[key(p)], kind === 'road' ? { road: true } : { ownerId: 'p' });
      }
      const source = view(),
        plan = planGroupMovement(source, ['slow', 'fast'], { q: 14, r: 0 });
      expect(plan.orders).toHaveLength(2);
      expect(plan.orders.every((o) => o.type === 'MOVE_ROAD')).toBe(true);
      expect(plan.journeys.every((j) => j.path.length > UNITS[s.units[j.unitId].kind].move)).toBe(
        true,
      );
      const actual = execute(s, 'p', command(plan.orders), now);
      expect(actual.result.accepted, actual.result.reason).toBe(true);
      expect(actual.state.realms.p.ap).toBe(r.ap - 2);
      expect(actual.result.movements).toEqual(plan.journeys.map(({ network, ...m }) => m));
    },
  );
  it('laisse une troupe enfermée sur place sans la facturer', () => {
    const { s, view, unit } = fixture();
    for (const p of disk(s.units.slow, 1).filter((p) => distance(p, s.units.slow) === 1)) {
      unit(`block-${key(p)}`, 'INFANTRY', p.q, p.r);
    }
    const plan = planGroupMovement(view(), ['slow', 'fast'], { q: 10, r: 0 });
    expect(plan.stationary.map((x) => x.unitId)).toContain('slow');
    expect(plan.orders.map((x) => x.actorId)).toEqual(['fast']);
    expect(plan.cost).toBe(1);
  });
  it('refuse tout le groupe sans aucun débit si les PA sont insuffisants', () => {
    const { s, r } = fixture();
    r.ap = 1;
    const before = structuredClone(s),
      result = execute(s, 'p', command([move('slow', 1), move('fast', 1, 2)]), now);
    expect(result.result.accepted).toBe(false);
    expect(result.state).toBe(s);
    expect(s).toEqual(before);
    expect(result.result.newActionPoints).toBe(1);
  });
  it.each(['occupied', 'enemy', 'distance', 'wall'])(
    'annule aussi les premiers mouvements si le dernier est invalide : %s',
    (cause) => {
      const { s, unit } = fixture();
      let second = move('fast', 1, 2);
      if (cause === 'occupied') unit('blocker', 'INFANTRY', 1, 2);
      if (cause === 'enemy') s.units.fast.ownerId = 'enemy';
      if (cause === 'distance') second = move('fast', 15, 2);
      if (cause === 'wall') {
        addBuilding(s, { ...s.realms.p, id: 'enemy' }, { q: 1, r: 2 }, 'WOOD_WALL', now);
      }
      const result = execute(s, 'p', command([move('slow', 1), second]), now);
      expect(result.result.accepted).toBe(false);
      expect(result.state).toBe(s);
      expect(result.state.units.slow.q).toBe(0);
      expect(result.state.realms.p.ap).toBe(40);
    },
  );
  it('interdit de déplacer plusieurs fois la même troupe dans un ordre', () => {
    const { s } = fixture();
    const result = execute(s, 'p', command([move('slow', 1), move('slow', 2)]), now);
    expect(result.result.accepted).toBe(false);
    expect(result.state).toBe(s);
  });
  it('ne permet que des déplacements, avec un groupe borné', () => {
    expect(() =>
      command([{ type: 'ATTACK', actorId: 'slow', payload: { targetId: 'enemy' } }]),
    ).toThrow();
    expect(() => command(Array.from({ length: 11 }, (_, i) => move(`u${i}`, 1)))).toThrow();
    expect(() => command([])).toThrow();
  });
  it('prévisualise toutes les positions et réserve les PA comme le serveur', () => {
    const { s, view } = fixture(),
      source = view();
    const plan = planGroupMovement(source, ['slow', 'fast'], { q: 7, r: 0 }),
      action = command(plan.orders);
    const predicted = predictAction(source, action)!;
    const actual = execute(s, 'p', action, now);
    expect(predicted).toBeDefined();
    expect(predicted.movements).toEqual(actual.result.movements);
    expect(pendingWorld(source, predicted).units).toEqual(predicted.world.units);
    expect(predicted.world.player.ap).toBe(actual.state.realms.p.ap);
    for (const u of predicted.world.units)
      expect(actual.state.units[u.id]).toMatchObject({ q: u.q, r: u.r });
  });
  it('respecte le code PA illimités tout en déplaçant chaque troupe', () => {
    const { s, r } = fixture();
    r.ap = 0;
    r.unlimitedAP = true;
    const result = execute(s, 'p', command([move('slow', 1), move('fast', 1, 2)]), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.p.ap).toBe(0);
  });
});
