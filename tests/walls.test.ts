import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BUILDINGS, WALL_KINDS, UNITS, buildingUpgrade, type UnitKind } from '@voidmarch/config';
import {
  createState,
  createRealm,
  disk,
  findPath,
  key,
  neighbors,
  tileAt,
  wallBlocks,
  wallConnections,
  writeTile,
  zeroWallet,
} from '@voidmarch/game-rules';
import { actionSchema, type Action } from '@voidmarch/protocol';
import { addBuilding, addPlayer, execute, worldView } from '../apps/server/src/engine';

const now = 1_900_000_000_000;
const order = (type: Action['type'], actorId: string, payload = {}): Action =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
function fixture() {
  const s = createState('walls', now);
  const a = addPlayer(s, 'a', 'Cité', 'MASK', now);
  a.wallet = { GOLD: 1000, WOOD: 1000, STONE: 1000, IRON: 1000, FOOD: 1000 };
  a.protectedUntil = 0;
  const b = createRealm('b', 'Assiégeants', 'IRON', { q: 6, r: 0 }, now);
  b.protectedUntil = 0;
  s.realms.b = b;
  for (const p of disk(a.capital, 7)) writeTile(s, p, { terrain: 'PLAIN' });
  for (const [id, ownerId, q] of [
    ['friend', 'a', 0],
    ['enemy', 'b', 2],
  ] as const)
    s.units[id] = {
      id,
      ownerId,
      q,
      r: 0,
      kind: 'INFANTRY',
      hp: UNITS.INFANTRY.hp,
      createdAt: now,
      updatedAt: now,
    };
  return { s, a, b };
}

describe('remparts en bois, pierre et acier', () => {
  it('construit en bois puis améliore avec de la pierre et du fer, en conservant le remboursement initial', () => {
    let { s, a } = fixture();
    writeTile(s, { q: 1, r: 0 }, { ownerId: a.id });
    const built = execute(s, a.id, order('BUILD', a.id, { q: 1, r: 0, kind: 'WOOD_WALL' }), now);
    expect(built.result.accepted, built.result.reason).toBe(true);
    s = built.state;
    const id = tileAt(s, { q: 1, r: 0 }).buildingId!;
    expect(s.realms.a.wallet.WOOD).toBe(970);
    for (const [kind, resource, hp] of [
      ['STONE_WALL', 'STONE', 240],
      ['STEEL_WALL', 'IRON', 480],
    ] as const) {
      const before = structuredClone(s.realms.a.wallet);
      const upgraded = execute(s, a.id, order('UPGRADE', id), now);
      expect(upgraded.result.accepted, upgraded.result.reason).toBe(true);
      s = upgraded.state;
      expect(s.buildings[id]).toMatchObject({ kind, hp, level: 1 });
      expect(s.realms.a.wallet).toEqual({
        ...before,
        [resource]: before[resource] - (resource === 'STONE' ? 65 : 90),
      });
    }
    expect(s.realms.a.ap).toBe(25);
    expect(buildingUpgrade('STEEL_WALL', 1)).toBeNull();
    expect(execute(s, a.id, order('UPGRADE', id), now).result.accepted).toBe(false);
    const before = structuredClone(s.realms.a.wallet);
    const demolition = execute(s, a.id, order('DEMOLISH', id), now);
    expect(demolition.result.accepted).toBe(true);
    expect(demolition.state.realms.a.wallet).toEqual({ ...before, WOOD: before.WOOD + 30 });
  });
  it('exige le bon matériau et interdit de sauter les évolutions', () => {
    const { s, a } = fixture();
    writeTile(s, { q: 1, r: 0 }, { ownerId: a.id });
    for (const kind of ['STONE_WALL', 'STEEL_WALL'])
      expect(
        execute(s, a.id, order('BUILD', a.id, { q: 1, r: 0, kind }), now).result.accepted,
      ).toBe(false);
    a.wallet.WOOD = 0;
    expect(
      execute(s, a.id, order('BUILD', a.id, { q: 1, r: 0, kind: 'WOOD_WALL' }), now).result
        .accepted,
    ).toBe(false);
    const wall = addBuilding(s, a, { q: 1, r: 0 }, 'WOOD_WALL', now);
    a.wallet.STONE = 0;
    expect(execute(s, a.id, order('UPGRADE', wall.id), now).result.accepted).toBe(false);
    wall.kind = 'STONE_WALL';
    a.wallet.IRON = 0;
    expect(execute(s, a.id, order('UPGRADE', wall.id), now).result.accepted).toBe(false);
  });
  it.each(WALL_KINDS)(
    '%s laisse passer le propriétaire mais bloque les ennemis, même sur une route',
    (kind) => {
      const { s, a } = fixture();
      const wall = addBuilding(s, a, { q: 1, r: 0 }, kind, now);
      writeTile(s, wall, { road: true });
      const path = [{ q: 1, r: 0 }];
      const denied = execute(s, 'b', order('MOVE', 'enemy', { path }), now);
      expect(denied.result.accepted).toBe(false);
      expect(denied.result.reason).toContain('rempart');
      expect(denied.state).toEqual(s);
      expect(execute(s, 'a', order('MOVE', 'friend', { path }), now).result.accepted).toBe(true);
    },
  );
  it.each(['PEASANT', 'SCOUT', 'KNIGHT', 'TANK', 'SIEGE_WALKER', 'SPECTRAL_RIDER'] as UnitKind[])(
    'aucune unité %s ne traverse un mur adverse au milieu d’un chemin',
    (kind) => {
      const { s, a } = fixture();
      addBuilding(s, a, { q: 1, r: 0 }, 'WOOD_WALL', now);
      delete s.units.friend;
      s.units.enemy.kind = kind;
      const result = execute(
        s,
        'b',
        order('MOVE', 'enemy', {
          path: [
            { q: 1, r: 0 },
            { q: 0, r: 0 },
          ],
        }),
        now,
      );
      expect(result.result.accepted).toBe(false);
      expect(result.state.units.enemy.q).toBe(2);
    },
  );
  it('la recherche de chemin contourne les murs et une enceinte fermée exige une brèche', () => {
    const { s, a } = fixture();
    const wall = addBuilding(s, a, { q: 1, r: 0 }, 'WOOD_WALL', now);
    const path = findPath(
      { q: 2, r: 0 },
      { q: 0, r: 0 },
      (p) => tileAt(s, p),
      8,
      new Set([key(wall)]),
    );
    expect(path?.length).toBeGreaterThan(2);
    expect(path?.map(key)).not.toContain(key(wall));
    const blocked = new Set(neighbors({ q: 0, r: 0 }).map(key));
    expect(findPath({ q: 2, r: 0 }, { q: 0, r: 0 }, (p) => tileAt(s, p), 8, blocked)).toBeNull();
    blocked.delete('1,0');
    expect(
      findPath({ q: 2, r: 0 }, { q: 0, r: 0 }, (p) => tileAt(s, p), 8, blocked),
    ).not.toBeNull();
  });
  it('ouvre le passage uniquement après destruction et protège les unités stationnées dessus', () => {
    const { s, a } = fixture();
    const wall = addBuilding(s, a, { q: 1, r: 0 }, 'WOOD_WALL', now);
    s.units.friend.q = 1;
    const intercepted = execute(s, 'b', order('ATTACK', 'enemy', { targetId: 'friend' }), now);
    expect(intercepted.result.accepted).toBe(true);
    expect(intercepted.state.units.friend.hp).toBe(s.units.friend.hp);
    expect(intercepted.state.buildings[wall.id].hp).toBeLessThan(wall.hp);
    delete s.units.friend;
    wall.hp = 1;
    const attack = execute(s, 'b', order('ATTACK', 'enemy', { targetId: wall.id }), now);
    expect(attack.result.accepted, attack.result.reason).toBe(true);
    expect(attack.state.buildings[wall.id]).toBeUndefined();
    expect(
      execute(attack.state, 'b', order('MOVE', 'enemy', { path: [{ q: 1, r: 0 }] }), now).result
        .accepted,
    ).toBe(true);
  });
  it('respecte les trêves et interdit la capture des remparts', () => {
    const { s, a } = fixture();
    const wall = addBuilding(s, a, { q: 1, r: 0 }, 'WOOD_WALL', now);
    s.treaties.truce = {
      id: 'truce',
      a: 'a',
      b: 'b',
      kind: 'TRUCE',
      startsAt: now,
      endsAt: now + 60000,
      payment: zeroWallet(),
      proposalId: 'p',
      nextCaravanAt: now,
    };
    expect(
      execute(s, 'b', order('ATTACK', 'enemy', { targetId: wall.id }), now).result.reason,
    ).toContain('trêve');
    expect(wallBlocks(wall, 'b')).toBe(true);
    s.units.enemy.q = 1; // Defensive check even for an old/inconsistent save.
    expect(execute(s, 'b', order('CAPTURE', 'enemy'), now).result.reason).toContain('remparts');
  });
  it('raccorde les six directions et les matériaux différents sans rejoindre les murs ennemis', () => {
    const { s, a, b } = fixture();
    const wall = addBuilding(s, a, { q: 3, r: 3 }, 'WOOD_WALL', now);
    const get = (p: { q: number; r: number }) => s.buildings[tileAt(s, p).buildingId ?? ''];
    expect(wallConnections(wall, get)).toBe(0);
    neighbors(wall).forEach((p, i) => {
      const next = addBuilding(s, a, p, WALL_KINDS[i % 3], now);
      expect(wallConnections(wall, get) & (1 << i)).toBe(1 << i);
      expect(wallConnections(next, get) & (1 << ((i + 3) % 6))).toBe(1 << ((i + 3) % 6));
    });
    expect(wallConnections(wall, get)).toBe(63);
    const one = get(neighbors(wall)[0]);
    one.ownerId = b.id;
    expect(wallConnections(wall, get)).toBe(62);
    delete s.buildings[one.id];
    expect(wallConnections(wall, get)).toBe(62);
    expect(worldView(s, a.id, now).tiles.find((t) => key(t) === key(wall))?.building?.kind).toBe(
      'WOOD_WALL',
    );
  });
});
