import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createState, disk, key, writeTile, observe } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { strategy } from '../apps/server/src/strategy';
import { tickAllianceOperations } from '../apps/server/src/alliance-operations';
import { actionSchema } from '@voidmarch/protocol';
import type { GameState } from '@voidmarch/shared';
const now = 1_900_000_000_000;
function fixture() {
  const s = createState('operations', now);
  for (const id of ['a', 'b', 'c']) {
    addPlayer(s, id, id, 'ASH', now);
    s.realms[id].protectedUntil = 0;
  }
  for (const p of disk({ q: 0, r: 0 }, 15)) {
    writeTile(s, p, { terrain: 'PLAIN' });
    s.realms.a.explored[key(p)] = { ...p, terrain: 'PLAIN', visibility: 'EXPLORED' };
  }
  s.units = {
    guard: {
      id: 'guard',
      ownerId: 'a',
      kind: 'GUARD',
      q: 1,
      r: 0,
      hp: 100,
      createdAt: now,
      updatedAt: now,
    },
  };
  strategy(s, now).alliances.team = {
    id: 'team',
    name: 'Coalition',
    emblem: 'eye',
    leaderId: 'a',
    members: ['a', 'b'],
    createdAt: now,
    messages: [],
    markers: [],
  };
  return s;
}
function act(s: GameState, type: string, payload: object, id = 'a', at = now) {
  return execute(
    s,
    id,
    actionSchema.parse({ type, actorId: id, payload, actionId: randomUUID(), clientTimestamp: at }),
    at,
  );
}
const op = (s: GameState) => s.strategy!.alliances.team.operations![0];
function create(s: GameState, objective = 'CAPTURE') {
  const r = act(s, 'OPERATION_CREATE', {
    title: 'Le passage',
    objective,
    q: 2,
    r: 0,
    holdMinutes: 5,
  });
  expect(r.result.accepted, r.result.reason).toBe(true);
  return r.state;
}
function start(s: GameState) {
  const r = act(s, 'OPERATION_START', { operationId: op(s).id });
  expect(r.result.accepted, r.result.reason).toBe(true);
  return r.state;
}
describe('opérations privées d’alliance', () => {
  it('partage le plan et les rôles uniquement entre alliés, sans coût ni mouvement', () => {
    let s = create(fixture());
    const ap = s.realms.a.ap;
    expect(worldView(s, 'a', now).strategy?.alliance?.operations).toHaveLength(1);
    expect(worldView(s, 'b', now).strategy?.alliance?.operations).toHaveLength(1);
    expect(worldView(s, 'c', now).strategy?.alliance).toBeUndefined();
    const r = act(s, 'OPERATION_JOIN', { operationId: op(s).id, role: 'AIR', ready: true }, 'b');
    expect(r.result.accepted).toBe(true);
    s = r.state;
    expect(op(s).participants).toContainEqual({ realmId: 'b', role: 'AIR', ready: true });
    expect(s.realms.a.ap).toBe(ap);
    expect(s.units.guard.q).toBe(1);
    expect(act(s, 'OPERATION_START', { operationId: op(s).id }, 'b').result.accepted).toBe(false);
    expect(
      act(s, 'OPERATION_JOIN', { operationId: op(s).id, role: 'AIR', ready: true }, 'c').result
        .accepted,
    ).toBe(false);
  });
  it('valide une capture alliée une seule fois et uniquement après lancement', () => {
    let s = create(fixture());
    writeTile(s, { q: 2, r: 0 }, { ownerId: 'b' });
    tickAllianceOperations(s, now + 1);
    expect(op(s).status).toBe('PLANNING');
    s = start(s);
    expect(op(s).status).toBe('WON');
    const count = s.journal.length;
    tickAllianceOperations(s, now + 60000);
    expect(s.journal.length).toBe(count);
  });
  it('tient une position pendant cinq minutes, remet le compteur à zéro si elle est contestée', () => {
    let s = start(create(fixture(), 'HOLD'));
    writeTile(s, { q: 2, r: 0 }, { ownerId: 'a' });
    s.units.guard.q = 2;
    tickAllianceOperations(s, now + 1000);
    tickAllianceOperations(s, now + 121000);
    expect(op(s).heldMs).toBe(120000);
    s.units.enemy = { ...s.units.guard, id: 'enemy', ownerId: 'c', q: 3 };
    tickAllianceOperations(s, now + 122000);
    expect(op(s).heldMs).toBe(0);
    expect(op(s).holding).toBe(false);
    delete s.units.enemy;
    tickAllianceOperations(s, now + 123000);
    tickAllianceOperations(s, now + 423000);
    expect(op(s).status).toBe('WON');
  });
  it('les avions et les civils ne suffisent pas à tenir le sol, perdre la case interrompt la tenue', () => {
    const s = start(create(fixture(), 'HOLD'));
    writeTile(s, { q: 2, r: 0 }, { ownerId: 'a' });
    s.units.guard.q = 2;
    for (const kind of ['FIGHTER', 'HERO'] as const) {
      s.units.guard.kind = kind;
      tickAllianceOperations(s, now + 1000);
      expect(op(s).holding).toBe(false);
    }
    s.units.guard.kind = 'GUARD';
    tickAllianceOperations(s, now + 2000);
    expect(op(s).holding).toBe(true);
    writeTile(s, { q: 2, r: 0 }, { ownerId: 'c' });
    tickAllianceOperations(s, now + 4000);
    expect(op(s).heldMs).toBe(0);
  });
  it('suit un siège visible et n’actualise pas ses PV dans le brouillard', () => {
    let s = fixture();
    const target = addBuilding(s, s.realms.c, { q: 2, r: 0 }, 'HOUSE', now);
    s = start(create(s, 'SIEGE'));
    s.buildings[target.id].hp = target.hp / 2;
    tickAllianceOperations(s, now + 1);
    expect(op(s).progress).toBe(0.5);
    s.units.guard.q = 100;
    delete s.buildings[Object.values(s.buildings).find((b) => b.ownerId === 'a')!.id];
    // Remove any other allied sources of vision near the siege.
    for (const b of Object.values(s.buildings))
      if (['a', 'b'].includes(b.ownerId)) {
        b.q = 100;
        b.r = 100;
      }
    s.buildings[target.id].hp = 1;
    tickAllianceOperations(s, now + 2);
    expect(op(s).progress).toBe(0.5);
    s.units.guard.q = 1;
    delete s.buildings[target.id];
    tickAllianceOperations(s, now + 3);
    expect(op(s).status).toBe('WON');
  });
  it('refuse un siège allié, un objectif inconnu et les opérations surnuméraires', () => {
    let s = fixture();
    addBuilding(s, s.realms.a, { q: 2, r: 0 }, 'HOUSE', now);
    expect(
      act(s, 'OPERATION_CREATE', { title: 'Test', objective: 'SIEGE', q: 2, r: 0 }).result.accepted,
    ).toBe(false);
    expect(
      act(s, 'OPERATION_CREATE', { title: 'Test', objective: 'CAPTURE', q: 999, r: 999 }).result
        .accepted,
    ).toBe(false);
    s = create(create(create(s)));
    expect(
      act(s, 'OPERATION_CREATE', { title: 'Encore', objective: 'CAPTURE', q: 2, r: 0 }).result
        .accepted,
    ).toBe(false);
  });
  it('expire les plans et retire les participants ayant quitté l’alliance', () => {
    const s = create(fixture());
    op(s).participants.push({ realmId: 'b', role: 'SUPPORT', ready: true });
    s.strategy!.alliances.team.members = ['a'];
    tickAllianceOperations(s, now + 1);
    expect(op(s).participants).toHaveLength(1);
    tickAllianceOperations(s, now + 49 * 3600000);
    expect(op(s).status).toBe('EXPIRED');
  });
  it('une annulation n’affecte ni les armées ni le territoire', () => {
    const s = start(create(fixture())),
      units = structuredClone(s.units),
      tiles = structuredClone(s.tiles);
    const r = act(s, 'OPERATION_CANCEL', { operationId: op(s).id });
    expect(r.result.accepted).toBe(true);
    expect(op(r.state).status).toBe('CANCELLED');
    expect(r.state.units).toEqual(units);
    expect(r.state.tiles).toEqual(tiles);
  });
});
