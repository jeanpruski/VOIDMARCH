import { describe, expect, it } from 'vitest';
import { disk, distance, enclosedHexes, key, neighbors } from '@voidmarch/game-rules';
import type { Hex } from '@voidmarch/shared';
const ring = (radius: number, center: Hex = { q: 0, r: 0 }) =>
  disk(center, radius).filter((p) => distance(p, center) === radius);
const keys = (points: Hex[]) => points.map(key).sort();
// Independent bounded flood fill serves as an oracle for small generated layouts.
function reference(walls: Hex[]) {
  const blocked = new Set(walls.map(key)),
    exterior = new Set<string>(),
    queue: Hex[] = [{ q: -8, r: -8 }];
  exterior.add(key(queue[0]));
  for (let i = 0; i < queue.length; i++)
    for (const p of neighbors(queue[i])) {
      const k = key(p);
      if (p.q < -8 || p.q > 8 || p.r < -8 || p.r > 8 || blocked.has(k) || exterior.has(k)) continue;
      exterior.add(k);
      queue.push(p);
    }
  const inside: Hex[] = [];
  for (let q = -7; q <= 7; q++)
    for (let r = -7; r <= 7; r++)
      if (!blocked.has(key({ q, r })) && !exterior.has(key({ q, r }))) inside.push({ q, r });
  return inside;
}
describe('détection des enceintes fermées', () => {
  it('ne capture rien avec un mur ouvert, même avec une seule brèche', () => {
    expect(enclosedHexes([])).toEqual([]);
    for (let i = 0; i < 6; i++)
      expect(enclosedHexes(ring(1).filter((_, j) => i !== j))).toEqual([]);
    expect(enclosedHexes(ring(4).slice(1))).toEqual([]);
  });
  it.each([1, 2, 4, 7])('détecte toute la zone d’une enceinte de rayon %s', (radius) => {
    expect(keys(enclosedHexes(ring(radius)))).toEqual(keys(disk({ q: 0, r: 0 }, radius - 1)));
  });
  it('gère les enceintes imbriquées, les embranchements et plusieurs villes éloignées', () => {
    const walls = [...ring(4), ...ring(1), { q: 5, r: 0 }, ...ring(2, { q: 1000000, r: -1000000 })];
    const expected = [
      ...disk({ q: 0, r: 0 }, 3).filter((p) => distance(p, { q: 0, r: 0 }) !== 1),
      ...disk({ q: 1000000, r: -1000000 }, 1),
    ];
    expect(keys(enclosedHexes(walls))).toEqual(keys(expected));
  });
  it('ne parcourt pas le rectangle géant d’une diagonale ouverte', () => {
    const walls = Array.from({ length: 10000 }, (_, q) => ({ q, r: -q }));
    expect(enclosedHexes(walls)).toEqual([]);
  });
  it('correspond au flood fill de référence sur 150 dispositions irrégulières', () => {
    let seed = 123;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let i = 0; i < 150; i++) {
      const walls = disk({ q: 0, r: 0 }, 5).filter(() => random() < 0.58);
      expect(keys(enclosedHexes(walls))).toEqual(keys(reference(walls)));
    }
  });
});

import { randomUUID } from 'node:crypto';
import { BUILDINGS, WALL_KINDS, UNITS } from '@voidmarch/config';
import { createState, createRealm, tileAt, writeTile, zeroWallet } from '@voidmarch/game-rules';
import { actionSchema, type Action } from '@voidmarch/protocol';
import {
  addBuilding,
  addPlayer,
  execute,
  refreshEnclosures,
  worldView,
  archive,
} from '../apps/server/src/engine';
import { removeGuestRealm } from '../apps/server/src/guests';
const now = 1_900_000_000_000;
const order = (type: Action['type'], actorId: string, payload = {}) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
function fixture(radius = 2) {
  const s = createState('enclosed', now),
    a = addPlayer(s, 'a', 'Enceinte', 'MASK', now);
  a.wallet = { GOLD: 2000, WOOD: 2000, STONE: 2000, IRON: 2000, FOOD: 2000 };
  a.protectedUntil = 0;
  const b = createRealm('b', 'Adversaire', 'IRON', { q: 50, r: 0 }, now);
  b.protectedUntil = 0;
  s.realms.b = b;
  const center = { q: 12, r: 0 };
  for (const p of disk(center, radius + 1)) writeTile(s, p, { terrain: 'PLAIN' });
  const boundary = ring(radius, center),
    gap = boundary.pop()!;
  const walls = boundary.map((p, i) => addBuilding(s, a, p, WALL_KINDS[i % 3], now));
  s.units.builder = {
    id: 'builder',
    ownerId: 'a',
    kind: 'PEASANT',
    ...gap,
    hp: 5,
    createdAt: now,
    updatedAt: now,
  };
  const close = () =>
    execute(s, 'a', order('BUILD', 'builder', { ...gap, kind: 'WOOD_WALL' }), now);
  return { s, a, b, center, gap, walls, close };
}
describe('territoires revendiqués par les remparts', () => {
  it('garde la couleur après démolition dans une enceinte, puis libère la case et le mur démoli à la première brèche', () => {
    const { s, a, center, walls, close } = fixture();
    const house = addBuilding(s, a, center, 'HOUSE', now);
    const closed = close();
    const removed = execute(closed.state, 'a', order('DEMOLISH', house.id), now);
    expect(removed.result.accepted).toBe(true);
    expect(tileAt(removed.state, center)).toMatchObject({
      ownerId: 'a',
      enclosureOwnerId: 'a',
      buildingId: undefined,
    });
    const opened = execute(removed.state, 'a', order('DEMOLISH', walls[0].id), now);
    expect(opened.result.accepted).toBe(true);
    expect(tileAt(opened.state, center).ownerId).toBeUndefined();
    expect(tileAt(opened.state, walls[0]).ownerId).toBeUndefined();
  });
  it('ouvre le déplacement illimité dans l’enceinte et le retire quand la zone redevient neutre', () => {
    const { close, center, gap } = fixture(4);
    const closed = close();
    expect(closed.result.accepted, closed.result.reason).toBe(true);
    const s = closed.state;
    Object.assign(s.units.builder, { q: center.q - 2, r: 0 });
    const destination = { q: center.q + 2, r: 0 };
    const move = order('MOVE_ROAD', 'builder', destination);
    const result = execute(s, 'a', move, now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.result.movement?.path).toHaveLength(4);
    expect(result.state.realms.a.ap).toBe(s.realms.a.ap - 1);
    const opened = execute(s, 'a', order('DEMOLISH', tileAt(s, gap).buildingId!), now);
    expect(opened.result.accepted).toBe(true);
    expect(tileAt(opened.state, destination).ownerId).toBeUndefined();
    expect(execute(opened.state, 'a', move, now).result.accepted).toBe(false);
  });
  it('fermer le dernier tronçon colore et revendique tout l’intérieur neutre, sans PA de capture', () => {
    const { s, center, close } = fixture();
    expect(refreshEnclosures(s, now).size).toBe(0);
    const result = close();
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.result.message).toContain('+7 case(s)');
    expect(result.state.realms.a.ap).toBe(29);
    for (const p of disk(center, 1))
      expect(tileAt(result.state, p)).toMatchObject({ ownerId: 'a', enclosureOwnerId: 'a' });
    const view = worldView(result.state, 'a', now);
    expect(view.tiles.find((t) => key(t) === key(center))).toMatchObject({
      ownerId: 'a',
      enclosureOwnerId: 'a',
      visibility: 'VISIBLE',
    });
    const before = structuredClone(result.state);
    expect(refreshEnclosures(result.state, now).size).toBe(0);
    expect(result.state).toEqual(before);
  });
  it('ne s’empare jamais des terres, bâtiments ou unités adverses et respecte les trêves', () => {
    const { s, a, b, center, close } = fixture();
    writeTile(s, center, { ownerId: 'b' });
    const enemy = addBuilding(s, b, { q: 11, r: 0 }, 'HOUSE', now);
    s.units.enemy = {
      id: 'enemy',
      ownerId: 'b',
      kind: 'INFANTRY',
      q: 12,
      r: 1,
      hp: 10,
      createdAt: now,
      updatedAt: now,
    };
    s.treaties.t = {
      id: 't',
      a: 'a',
      b: 'b',
      kind: 'TRUCE',
      startsAt: now,
      endsAt: now + 10000,
      payment: zeroWallet(),
      proposalId: 'p',
      nextCaravanAt: now,
    };
    const result = close();
    expect(result.result.accepted).toBe(true);
    expect(tileAt(result.state, center).ownerId).toBe('b');
    expect(result.state.buildings[enemy.id].ownerId).toBe('b');
    expect(result.state.units.enemy.ownerId).toBe('b');
    expect(result.state.realms.a.protectedUntil).toBe(a.protectedUntil);
    expect(result.state.treaties.t).toEqual(s.treaties.t);
  });
  it('exige un paysan ou ingénieur proche pour bâtir dans l’enceinte, même loin des bâtiments', () => {
    const { s, center, gap, close } = fixture(5);
    const closed = close();
    expect(closed.result.accepted).toBe(true);
    const denied = execute(
      closed.state,
      'a',
      order('BUILD', 'a', { ...center, kind: 'HOUSE' }),
      now,
    );
    expect(denied.result.accepted).toBe(false);
    expect(denied.result.reason).toContain('paysan');
    expect(denied.state).toEqual(closed.state);
    closed.state.units.builder = { ...closed.state.units.builder, ...center, kind: 'ENGINEER' };
    const built = execute(
      closed.state,
      'a',
      order('BUILD', 'builder', { ...center, kind: 'HOUSE' }),
      now,
    );
    expect(built.result.accepted, built.result.reason).toBe(true);
    expect(tileAt(built.state, center).buildingId).toBeTruthy();
    const bad = execute(
      closed.state,
      'a',
      order('BUILD', 'builder', { q: center.q + 1, r: 0, kind: 'LUMBER' }),
      now,
    );
    expect(bad.result.reason).toContain('terrain');
  });
  it('une brèche libère les cases sans bâtiment, même avec route ou unité ; les bâtiments et terres extérieures restent', () => {
    const { s, a, center, walls, close } = fixture();
    const house = addBuilding(s, a, center, 'HOUSE', now);
    const road = { q: 13, r: 0 };
    writeTile(s, road, { ownerId: 'a', road: true });
    const closed = close();
    expect(closed.result.accepted).toBe(true);
    closed.state.units.builder = { ...closed.state.units.builder, ...road };
    const broken = execute(closed.state, 'a', order('DEMOLISH', walls[0].id), now);
    expect(broken.result.accepted).toBe(true);
    for (const p of disk(center, 1).filter((p) => key(p) !== key(center)))
      expect(tileAt(broken.state, p).ownerId).toBeUndefined();
    expect(tileAt(broken.state, center).ownerId).toBe('a');
    expect(broken.state.buildings[house.id]).toBeDefined();
    expect(tileAt(broken.state, road).road).toBe(true);
    expect(broken.state.units.builder.ownerId).toBe('a');
    expect(tileAt(broken.state, a.capital).ownerId).toBe('a');
    expect(broken.state.realms.a.explored[key(road)].ownerId).toBeUndefined();
  });
  it('la destruction adverse ouvre immédiatement l’enceinte et la réparation de la brèche la referme', () => {
    const { center, walls, close } = fixture();
    const closed = close();
    const wall = closed.state.buildings[walls[0].id];
    wall.hp = 1;
    closed.state.units.raider = {
      id: 'raider',
      ownerId: 'b',
      kind: 'INFANTRY',
      q: wall.q - 1,
      r: wall.r,
      hp: 10,
      createdAt: now,
      updatedAt: now,
    };
    const broken = execute(
      closed.state,
      'b',
      order('ATTACK', 'raider', { targetId: wall.id }),
      now,
    );
    expect(broken.result.accepted, broken.result.reason).toBe(true);
    expect(tileAt(broken.state, center).ownerId).toBeUndefined();
    expect(
      broken.state.journal.some(
        (j) => j.text.includes('Enceinte ouverte') && j.realmIds?.includes('a'),
      ),
    ).toBe(true);
    broken.state.units.builder = { ...broken.state.units.builder, q: wall.q, r: wall.r };
    const rebuilt = execute(
      broken.state,
      'a',
      order('BUILD', 'builder', { q: wall.q, r: wall.r, kind: 'WOOD_WALL' }),
      now,
    );
    expect(rebuilt.result.accepted, rebuilt.result.reason).toBe(true);
    expect(tileAt(rebuilt.state, center).ownerId).toBe('a');
  });
  it('les remparts ennemis ne complètent pas votre enceinte, les matériaux propres se mélangent', () => {
    const { s, a, b, gap, center } = fixture();
    const foreign = addBuilding(s, b, gap, 'WOOD_WALL', now);
    refreshEnclosures(s, now);
    expect(tileAt(s, center).ownerId).toBeUndefined();
    foreign.ownerId = a.id;
    writeTile(s, gap, { ownerId: a.id });
    refreshEnclosures(s, now);
    expect(tileAt(s, center).ownerId).toBe('a');
  });
  it('une enceinte intérieure reste fermée quand une enceinte extérieure est percée', () => {
    const { s, a, center, walls, close } = fixture(4);
    ring(1, center).forEach((p) => addBuilding(s, a, p, 'WOOD_WALL', now));
    const closed = close();
    const broken = execute(closed.state, 'a', order('DEMOLISH', walls[0].id), now);
    expect(tileAt(broken.state, center)).toMatchObject({ ownerId: 'a', enclosureOwnerId: 'a' });
    expect(tileAt(broken.state, { q: center.q + 2, r: 0 }).ownerId).toBeUndefined();
  });
  it('les anciennes enceintes sont reconnues au chargement et les marqueurs survivent aux sauvegardes', () => {
    const { s, a, gap, center } = fixture();
    addBuilding(s, a, gap, 'WOOD_WALL', now);
    expect(refreshEnclosures(s, now).get('a')?.captured).toBe(7);
    const copy = JSON.parse(JSON.stringify(s));
    expect(refreshEnclosures(copy, now).size).toBe(0);
    expect(
      archive(copy, copy.realms.a, now).tiles.find((t) => key(t) === key(center))?.enclosureOwnerId,
    ).toBe('a');
  });
  it('la suppression d’un invité enlève aussi ses territoires et marqueurs d’enceinte', () => {
    const { center, close } = fixture();
    const closed = close();
    removeGuestRealm(closed.state, 'a');
    expect(tileAt(closed.state, center).ownerId).toBeUndefined();
    expect(tileAt(closed.state, center).enclosureOwnerId).toBeUndefined();
  });
});
