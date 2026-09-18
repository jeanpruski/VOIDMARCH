import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createState, disk, key, writeTile } from '@voidmarch/game-rules';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { planGroupMovement, formationSlots } from '../apps/web/src/group-movement';
const now = 1_900_000_000_000;
function fixture() {
  const s = createState('armies', now);
  addPlayer(s, 'a', 'A', 'ASH', now);
  s.units = {};
  for (const p of disk({ q: 0, r: 0 }, 15)) {
    writeTile(s, p, { terrain: 'PLAIN' });
    s.realms.a.explored[key(p)] = { ...p, terrain: 'PLAIN', visibility: 'EXPLORED' };
  }
  ['INFANTRY', 'ARCHER', 'PEASANT', 'GUARD'].forEach((kind, i) => {
    s.units[`u${i}`] = {
      id: `u${i}`,
      ownerId: 'a',
      kind: kind as 'INFANTRY',
      q: 0,
      r: i,
      hp: 100,
      createdAt: now,
      updatedAt: now,
    };
  });
  return s;
}
function order(s: ReturnType<typeof fixture>, type: string, payload: object, actorId = 'a') {
  return execute(
    s,
    'a',
    actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now }),
    now,
  );
}
describe('armées enregistrées et formations', () => {
  it('enregistre, renomme et supprime le registre sans déplacer ni payer de PA', () => {
    let s = fixture();
    const original = structuredClone(s.units),
      ap = s.realms.a.ap;
    let result = order(s, 'ARMY_SAVE', {
      name: 'Légion',
      unitIds: ['u0', 'u1'],
      formation: 'LINE',
    });
    expect(result.result.accepted).toBe(true);
    s = result.state;
    const id = s.realms.a.armies![0].id;
    expect(worldView(s, 'a', now).player.armies?.[0].name).toBe('Légion');
    result = order(s, 'ARMY_SAVE', {
      armyId: id,
      name: 'Garde',
      unitIds: ['u0', 'u2'],
      formation: 'PROTECTED',
    });
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.a.armies![0]).toMatchObject({
      id,
      name: 'Garde',
      formation: 'PROTECTED',
    });
    result = order(result.state, 'ARMY_DELETE', { armyId: id });
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.a.armies).toEqual([]);
    expect(result.state.units).toEqual(original);
    expect(result.state.realms.a.ap).toBe(ap);
  });
  it('refuse les troupes étrangères, les doublons et un faux propriétaire', () => {
    const s = fixture();
    s.units.u2.ownerId = 'enemy';
    for (const unitIds of [['u0', 'u2'], ['u0', 'u0'], ['missing']])
      expect(
        order(s, 'ARMY_SAVE', { name: 'Test', unitIds, formation: 'COMPACT' }).result.accepted,
      ).toBe(false);
    expect(
      order(s, 'ARMY_SAVE', { name: 'Test', unitIds: ['u0'], formation: 'COMPACT' }, 'enemy').result
        .accepted,
    ).toBe(false);
  });
  it.each(['COMPACT', 'LINE', 'PROTECTED'] as const)(
    'la formation %s respecte les trajets, PA et arrivées distinctes',
    (formation) => {
      const s = fixture(),
        ids = Object.keys(s.units),
        world = worldView(s, 'a', now, disk({ q: 0, r: 0 }, 1));
      const plan = planGroupMovement(world, ids, { q: 9, r: 0 }, formation);
      expect(plan.orders.length).toBeGreaterThan(0);
      expect(new Set(plan.journeys.map((j) => key(j.path.at(-1)!))).size).toBe(
        plan.journeys.length,
      );
      const result = order(s, 'MOVE_GROUP', { orders: plan.orders });
      expect(result.result.accepted, result.result.reason).toBe(true);
      expect(result.state.realms.a.ap).toBe(s.realms.a.ap - plan.orders.length);
    },
  );
  it('place le soutien derrière les combattants et ne modifie pas leur ordre', () => {
    const units = Object.values(fixture().units),
      ids = units.map((u) => u.id);
    const slots = formationSlots(units, { q: 4, r: 0 }, { q: 10, r: 0 }, 'PROTECTED');
    const forward = (id: string) => slots.get(id)!.q + slots.get(id)!.r / 2;
    expect(forward('u2')).toBeLessThan(forward('u0'));
    expect(forward('u1')).toBeLessThan(forward('u0'));
    formationSlots(units, { q: 4, r: 0 }, { q: 10, r: 0 }, 'LINE');
    expect(units.map((u) => u.id)).toEqual(ids);
  });
});
