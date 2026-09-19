import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createState, key, tileAt, writeTile } from '@voidmarch/game-rules';
import { actionSchema, type Action } from '@voidmarch/protocol';
import { addBuilding, addPlayer, execute, worldView } from '../apps/server/src/engine';
import { removeGuestRealm } from '../apps/server/src/guests';
import { roadOrderReason } from '../apps/web/src/roads';
import { predictAction } from '../apps/web/src/optimistic-actions';
const now = 1_800_000_000_000;
const order = (type: Action['type'], actorId: string, payload: unknown) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
function fixture(length = 80) {
  const s = createState('road-travel', now),
    r = addPlayer(s, 'p', 'Routes', 'MASK', now);
  r.wallet = { GOLD: 100, WOOD: 100, IRON: 100, STONE: 100, FOOD: 100 };
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
  for (let q = 0; q <= length; q++) {
    const p = { q, r: 0 };
    writeTile(s, p, {
      terrain: 'PLAIN',
      road: true,
      roadOwnerId: r.id,
      ...(q ? { ownerId: undefined } : {}),
    });
    r.explored[key(p)] = {
      ...p,
      terrain: 'PLAIN',
      road: true,
      roadOwnerId: r.id,
      visibility: 'EXPLORED',
    };
  }
  return { s, r };
}
describe('liaisons routières sans limite de distance', () => {
  it('traverse plusieurs chunks gratuitement et sans dépense de matériaux', () => {
    const { s, r } = fixture(),
      destination = { q: 80, r: 0 };
    const result = execute(s, r.id, order('MOVE_ROAD', 'worker', destination), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.units.worker).toMatchObject(destination);
    expect(result.state.realms.p.ap).toBe(40);
    expect(result.state.realms.p.wallet).toEqual(r.wallet);
    expect(result.result.message).toContain('80 cases');
    expect(result.result.movement?.from).toEqual({ q: 0, r: 0 });
    expect(result.result.movement?.path).toHaveLength(80);
    expect(result.result.movement?.path.at(-1)).toEqual(destination);
    expect(tileAt(result.state, { q: 40, r: 0 }).ownerId).toBeUndefined();
  });
  it.each(['start', 'end', 'gap', 'unexplored', 'unknownRoad', 'unit', 'same'] as const)(
    'refuse %s sans dépenser ni déplacer',
    (condition) => {
      const { s, r } = fixture();
      let destination = { q: 80, r: 0 };
      if (condition === 'start') writeTile(s, s.units.worker, { road: false, ownerId: undefined });
      if (condition === 'end') writeTile(s, destination, { road: false });
      if (condition === 'gap') writeTile(s, { q: 40, r: 0 }, { road: false });
      if (condition === 'unexplored') delete r.explored['40,0'];
      if (condition === 'unknownRoad') r.explored['40,0'].road = false;
      if (condition === 'unit')
        s.units.block = { ...s.units.worker, id: 'block', ownerId: 'enemy', q: 40 };
      if (condition === 'same') destination = { q: 0, r: 0 };
      const result = execute(s, r.id, order('MOVE_ROAD', 'worker', destination), now);
      expect(result.result.accepted).toBe(false);
      expect(result.state).toEqual(s);
    },
  );
  it('ne permet pas de déplacer l’unité d’un autre joueur', () => {
    const { s, r } = fixture();
    s.units.worker.ownerId = 'enemy';
    expect(
      execute(s, r.id, order('MOVE_ROAD', 'worker', { q: 80, r: 0 }), now).result.accepted,
    ).toBe(false);
  });
  it('les remparts adverses coupent la route au sol, ceux du joueur la laissent ouverte', () => {
    const { s, r } = fixture();
    const wall = addBuilding(s, r, { q: 40, r: 0 }, 'WOOD_WALL', now);
    expect(
      execute(s, r.id, order('MOVE_ROAD', 'worker', { q: 80, r: 0 }), now).result.accepted,
    ).toBe(true);
    wall.ownerId = 'enemy';
    expect(
      execute(s, r.id, order('MOVE_ROAD', 'worker', { q: 80, r: 0 }), now).result.accepted,
    ).toBe(false);
  });
  it('une destination occupée reste interdite aux unités volantes, qui peuvent survoler un obstacle', () => {
    const { s, r } = fixture();
    s.units.worker.kind = 'RECON_PLANE';
    s.units.block = { ...s.units.worker, id: 'block', ownerId: 'enemy', q: 40 };
    expect(
      execute(s, r.id, order('MOVE_ROAD', 'worker', { q: 80, r: 0 }), now).result.accepted,
    ).toBe(true);
    expect(
      execute(s, r.id, order('MOVE_ROAD', 'worker', { q: 40, r: 0 }), now).result.accepted,
    ).toBe(false);
  });
  it('sortir du réseau reste soumis à la portée normale', () => {
    const { s, r } = fixture();
    const path = Array.from({ length: 4 }, (_, i) => ({ q: i + 1, r: 0 }));
    expect(execute(s, r.id, order('MOVE', 'worker', { path }), now).result.accepted).toBe(false);
    expect(
      execute(s, r.id, order('MOVE', 'worker', { path: path.slice(0, 2) }), now).result.accepted,
    ).toBe(true);
  });
  it('transmet les routes connues hors écran sans révéler les changements sous le brouillard', () => {
    const { s, r } = fixture();
    writeTile(s, { q: 40, r: 0 }, { road: false });
    writeTile(s, { q: 81, r: 0 }, { road: true });
    const w = worldView(s, r.id, now, [{ q: 0, r: 0 }]);
    expect(w.tiles.find((t) => t.q === 80 && t.r === 0)).toMatchObject({
      road: true,
      visibility: 'EXPLORED',
    });
    expect(w.tiles.find((t) => t.q === 40 && t.r === 0)).toMatchObject({
      road: true,
      visibility: 'EXPLORED',
    });
    expect(w.tiles.find((t) => t.q === 81 && t.r === 0)).toBeUndefined();
  });
});
describe('déplacement illimité sur terres et routes reliées', () => {
  function territory() {
    const f = fixture();
    for (const t of Object.values(f.s.tiles))
      if (t.road) writeTile(f.s, t, { road: false, ownerId: f.r.id, enclosureOwnerId: f.r.id });
    return f;
  }
  it('traverse une enceinte de 80 cases sans route, gratuitement, avec le même trajet anticipé', () => {
    const { s, r } = territory();
    const command = order('MOVE_ROAD', 'worker', { q: 80, r: 0 });
    const before = worldView(s, r.id, now, [{ q: 0, r: 0 }]);
    expect(before.tiles.find((t) => t.q === 80 && t.r === 0)?.ownerId).toBe(r.id);
    const prediction = predictAction(before, command)!;
    const result = execute(s, r.id, command, now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.result.movement?.path).toHaveLength(80);
    expect(prediction.movement).toEqual(result.result.movement);
    expect(prediction.world.units).toEqual(worldView(result.state, r.id, now).units);
    expect(result.state.realms.p.ap).toBe(40);
    expect(result.state.realms.p.wallet).toEqual(r.wallet);
  });
  it('enchaîne ses terres, une route neutre ou adverse, puis ses terres en un ordre', () => {
    const { s, r } = territory();
    for (let q = 20; q <= 60; q++)
      writeTile(s, { q, r: 0 }, { road: true, ownerId: q < 40 ? undefined : 'enemy' });
    const result = execute(s, r.id, order('MOVE_ROAD', 'worker', { q: 80, r: 0 }), now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.result.movement?.path).toHaveLength(80);
    expect(result.state.realms.p.ap).toBe(40);
  });
  it.each(['neutral', 'enemy', 'unit', 'wall', 'terrain'] as const)(
    'refuse le trajet coupé (%s) sans consommer de PA',
    (condition) => {
      const { s, r } = territory();
      const gap = { q: 40, r: 0 };
      if (condition === 'neutral' || condition === 'enemy')
        writeTile(s, gap, { ownerId: condition === 'enemy' ? 'enemy' : undefined });
      if (condition === 'unit') s.units.block = { ...s.units.worker, id: 'block', ...gap };
      if (condition === 'wall') addBuilding(s, r, gap, 'WOOD_WALL', now).ownerId = 'enemy';
      if (condition === 'terrain') {
        s.units.worker.kind = 'TANK';
        writeTile(s, gap, { terrain: 'MOUNTAIN' });
      }
      r.explored[key(gap)] = { ...gap, terrain: 'PLAIN', road: false, visibility: 'EXPLORED' };
      const result = execute(s, r.id, order('MOVE_ROAD', 'worker', { q: 80, r: 0 }), now);
      expect(result.result.accepted).toBe(false);
      expect(result.state).toEqual(s);
      expect(
        predictAction(worldView(s, r.id, now), order('MOVE_ROAD', 'worker', { q: 80, r: 0 })),
      ).toBeUndefined();
    },
  );
  it('les terres revendiquées sans enceinte ne donnent pas de déplacement gratuit', () => {
    const { s, r } = territory();
    for (const t of Object.values(s.tiles)) delete t.enclosureOwnerId;
    expect(
      execute(s, r.id, order('MOVE_ROAD', 'worker', { q: 80, r: 0 }), now).result.accepted,
    ).toBe(false);
    for (const t of Object.values(s.tiles)) if (t.ownerId === r.id) t.ownerId = 'enemy';
    expect(
      execute(s, r.id, order('MOVE_ROAD', 'worker', { q: 80, r: 0 }), now).result.accepted,
    ).toBe(false);
  });
});
describe('chantiers routiers en terrain neutre', () => {
  it('pose et retire sa route sans capturer le terrain et sans toucher au bâtisseur', () => {
    const { s, r } = fixture(0),
      p = { q: 1, r: 0 };
    writeTile(s, p, { terrain: 'PLAIN', ownerId: undefined, road: false });
    const w = worldView(s, r.id, now),
      t = w.tiles.find((t) => key(t) === key(p))!;
    expect(roadOrderReason(w, t, 'build')).toBe('');
    const built = execute(s, r.id, order('ROAD', r.id, p), now);
    expect(built.result.accepted).toBe(true);
    expect(tileAt(built.state, p)).toMatchObject({ road: true, roadOwnerId: r.id });
    expect(tileAt(built.state, p).ownerId).toBeUndefined();
    expect(built.state.realms.p.wallet.WOOD).toBe(90);
    const removed = execute(built.state, r.id, order('REMOVE_ROAD', r.id, p), now);
    expect(removed.result.accepted).toBe(true);
    expect(removed.state.realms.p.ap).toBe(38);
    expect(removed.state.realms.p.wallet.WOOD).toBe(90);
    expect(tileAt(removed.state, p).roadOwnerId).toBeUndefined();
    expect(removed.state.units).toEqual(s.units);
  });
  it('refuse un chantier neutre sans bâtisseur proche et un terrain adverse même avec bâtisseur', () => {
    const { s, r } = fixture(0),
      p = { q: 2, r: 0 };
    writeTile(s, p, { terrain: 'PLAIN', ownerId: undefined, road: false });
    expect(execute(s, r.id, order('ROAD', r.id, p), now).result.accepted).toBe(false);
    s.units.worker.q = 1;
    expect(execute(s, r.id, order('ROAD', r.id, p), now).result.accepted).toBe(true);
    writeTile(s, p, { ownerId: 'enemy' });
    expect(execute(s, r.id, order('ROAD', r.id, p), now).result.accepted).toBe(false);
  });
  it('ne permet pas d’effacer la route neutre d’un autre joueur, ni sa propre route passée en territoire adverse', () => {
    const { s, r } = fixture(1),
      p = { q: 1, r: 0 };
    writeTile(s, p, { roadOwnerId: 'enemy' });
    expect(execute(s, r.id, order('REMOVE_ROAD', r.id, p), now).result.accepted).toBe(false);
    writeTile(s, p, { roadOwnerId: r.id, ownerId: 'enemy' });
    expect(execute(s, r.id, order('REMOVE_ROAD', r.id, p), now).result.accepted).toBe(false);
  });
  it('l’expiration d’un invité enlève ses routes neutres mais préserve celles reprises par un autre royaume', () => {
    const { s } = fixture(2);
    writeTile(s, { q: 2, r: 0 }, { ownerId: 'enemy' });
    removeGuestRealm(s, 'p');
    expect(tileAt(s, { q: 1, r: 0 }).road).toBeUndefined();
    expect(tileAt(s, { q: 2, r: 0 }).road).toBe(true);
    expect(tileAt(s, { q: 2, r: 0 }).roadOwnerId).toBeUndefined();
  });
});
