import { prepareTrophies } from './fixtures/development';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BUILDINGS, TURRETS, type TurretLevel } from '@voidmarch/config';
import {
  createState,
  createRealm,
  disk,
  writeTile,
  turretStats,
  demolitionRefund,
  estimateDamage,
  vision,
  key,
  wallBlocks,
  wallConnections,
} from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema, type Action } from '@voidmarch/protocol';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { worldEffects } from '../apps/web/src/world-effects';
const now = 1_900_000_000_000;
const order = (type: Action['type'], actorId: string, payload = {}) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
function fixture() {
  const s = createState('turrets', now),
    r = addPlayer(s, 'a', 'A', 'MASK', now);
  r.wallet = { GOLD: 5000, WOOD: 5000, STONE: 5000, IRON: 5000, FOOD: 5000 };
  prepareTrophies(s, 'a', 3, now);
  s.realms['a'].era = { version: 1, level: 3 };
  r.protectedUntil = 0;
  s.realms.b = createRealm('b', 'B', 'ASH', { q: 4, r: 0 }, now);
  s.realms.b.protectedUntil = 0;
  for (const p of disk({ q: 0, r: 0 }, 8)) writeTile(s, p, { terrain: 'PLAIN', ownerId: 'a' });
  const wall = addBuilding(s, r, { q: 1, r: 0 }, 'WOOD_WALL', now);
  s.units.worker = {
    id: 'worker',
    kind: 'PEASANT',
    ownerId: 'a',
    q: 0,
    r: 1,
    hp: 5,
    createdAt: now,
    updatedAt: now,
  };
  s.units.enemy = {
    id: 'enemy',
    kind: 'GUARD',
    ownerId: 'b',
    q: 3,
    r: 0,
    hp: 1000,
    createdAt: now,
    updatedAt: now,
  };
  return { s, r, wall };
}
describe('tourelles fixées aux remparts', () => {
  it('installe sur le mur existant, consomme le coût exact et reste immobile', () => {
    const { s, r, wall } = fixture(),
      before = worldView(s, 'a', now),
      action = order('INSTALL_TURRET', wall.id);
    const result = execute(s, 'a', action, now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    const installed = result.state.buildings[wall.id];
    expect(installed.turretLevel).toBe(1);
    expect(installed.kind).toBe('WOOD_WALL');
    expect(installed.hp).toBe(wall.hp);
    expect(result.state.realms.a.ap).toBe(r.ap - 2);
    expect(result.state.realms.a.wallet.WOOD).toBe(r.wallet.WOOD - TURRETS[1].cost.WOOD);
    expect(installed.turretConstructionCost).toEqual(TURRETS[1].cost);
    expect(Object.keys(result.state.units)).toEqual(Object.keys(s.units));
    expect(
      worldEffects(before, worldView(result.state, 'a', now + 1)).some(
        (e) => e.kind === 'build' && e.q === wall.q,
      ),
    ).toBe(true);
    const predicted = predictAction(before, action)!.world;
    expect(predicted.tiles.find((t) => t.building?.id === wall.id)!.building!.turretLevel).toBe(1);
    expect(predicted.player.wallet).toEqual(result.state.realms.a.wallet);
  });
  it.each([
    'wrongBuilding',
    'enemyWall',
    'noBuilder',
    'farBuilder',
    'noResources',
    'noAP',
    'destroyed',
    'occupied',
  ] as const)('refuse une installation invalide : %s', (reason) => {
    const { s, wall } = fixture();
    if (reason === 'wrongBuilding') wall.kind = 'TOWER';
    if (reason === 'enemyWall') wall.ownerId = 'b';
    if (reason === 'noBuilder') delete s.units.worker;
    if (reason === 'farBuilder') s.units.worker.q = 8;
    if (reason === 'noResources') s.realms.a.wallet.WOOD = 0;
    if (reason === 'noAP') s.realms.a.ap = 1;
    if (reason === 'destroyed') wall.hp = 0;
    if (reason === 'occupied') {
      s.units.enemy.q = wall.q;
      s.units.enemy.r = wall.r;
    }
    const before = structuredClone(s);
    const result = execute(s, 'a', order('INSTALL_TURRET', wall.id), now);
    expect(result.result.accepted).toBe(false);
    expect(result.state).toEqual(before);
  });
  it('respecte toute la chaîne bois → pierre → acier, sans doubler les armes', () => {
    const f = fixture();
    let s = f.s;
    const id = f.wall.id;
    const apply = (type: Action['type']) => {
      const r = execute(s, 'a', order(type, id), now);
      expect(r.result.accepted, r.result.reason).toBe(true);
      s = r.state;
    };
    apply('INSTALL_TURRET');
    expect(execute(s, 'a', order('INSTALL_TURRET', id), now).result.accepted).toBe(false);
    expect(execute(s, 'a', order('UPGRADE_TURRET', id), now).result.reason).toContain('pierre');
    apply('UPGRADE');
    expect(s.buildings[id].kind).toBe('STONE_WALL');
    expect(s.buildings[id].turretLevel).toBe(1);
    s.buildings[id].hp = 20;
    apply('UPGRADE_TURRET');
    expect(s.buildings[id].hp).toBe(20);
    expect(s.buildings[id].turretLevel).toBe(2);
    expect(execute(s, 'a', order('UPGRADE_TURRET', id), now).result.reason).toContain('acier');
    apply('UPGRADE');
    apply('UPGRADE_TURRET');
    expect(s.buildings[id].turretLevel).toBe(3);
    expect(execute(s, 'a', order('UPGRADE_TURRET', id), now).result.accepted).toBe(false);
    expect(s.buildings[id].turretConstructionCost).toEqual(TURRETS[1].cost);
  });
  it.each([1, 2, 3] as TurretLevel[])(
    'niveau %i : tir manuel à 1 PA, bonne portée et projectile',
    (level) => {
      const { s, wall } = fixture();
      wall.kind = TURRETS[level].wall;
      wall.turretLevel = level;
      wall.hp = BUILDINGS[wall.kind].hp;
      expect(turretStats(wall)).toEqual(TURRETS[level]);
      expect(vision(s, s.realms.a).has(key({ q: wall.q + TURRETS[level].range, r: wall.r }))).toBe(
        true,
      );
      const action = order('ATTACK', wall.id, { targetId: 'enemy' }),
        result = execute(s, 'a', action, now);
      expect(result.result.accepted, result.result.reason).toBe(true);
      expect(result.state.realms.a.ap).toBe(39);
      const damage = estimateDamage(wall, s.units.enemy, { q: 3, r: 0, terrain: 'PLAIN' });
      expect(1000 - result.state.units.enemy.hp).toBeGreaterThanOrEqual(damage.min);
      expect(1000 - result.state.units.enemy.hp).toBeLessThanOrEqual(damage.max);
      expect(result.state.journal.at(-1)!.shot).toMatchObject({
        wallKind: wall.kind,
        unitKind: TURRETS[level].projectileUnit,
        from: { q: 1, r: 0 },
      });
      s.units.enemy.q = wall.q + TURRETS[level].range + 1;
      expect(execute(s, 'a', action, now).result.accepted).toBe(false);
    },
  );
  it('respecte les trêves, protections, propriété et interdit de tirer depuis un mur nu ou vers sa propre case', () => {
    const { s, wall } = fixture(),
      action = order('ATTACK', wall.id, { targetId: 'enemy' });
    expect(execute(s, 'a', action, now).result.accepted).toBe(false);
    wall.turretLevel = 1;
    s.realms.b.protectedUntil = now + 1000;
    expect(execute(s, 'a', action, now).result.accepted).toBe(false);
    s.realms.b.protectedUntil = 0;
    s.treaties.t = {
      id: 't',
      kind: 'TRUCE',
      a: 'a',
      b: 'b',
      startsAt: now,
      endsAt: now + 1000,
      payment: { GOLD: 0, WOOD: 0, STONE: 0, IRON: 0, FOOD: 0 },
      proposalId: 'test',
      nextCaravanAt: now + 1000,
    };
    expect(execute(s, 'a', action, now).result.accepted).toBe(false);
    delete s.treaties.t;
    s.units.enemy.q = 1;
    expect(execute(s, 'a', action, now).result.reason).toContain('propre case');
    s.units.enemy.q = 3;
    expect(execute(s, 'b', action, now).result.accepted).toBe(false);
  });
  it('garde les raccords, la traversée alliée et le remboursement initial sans rembourser les évolutions', () => {
    const { s, wall } = fixture();
    wall.turretLevel = 3;
    wall.kind = 'STEEL_WALL';
    wall.constructionCost = { WOOD: 20 };
    wall.turretConstructionCost = { ...TURRETS[1].cost };
    const neighbor = addBuilding(s, s.realms.a, { q: 2, r: 0 }, 'WOOD_WALL', now);
    expect(wallConnections(wall, (p) => (key(p) === key(neighbor) ? neighbor : undefined))).toBe(1);
    expect(wallBlocks(wall, 'a')).toBe(false);
    expect(wallBlocks(wall, 'b')).toBe(true);
    const refund = demolitionRefund(wall, 'MASK');
    expect(refund).toEqual({ WOOD: 70, GOLD: 60, IRON: 20 });
    const result = execute(s, 'a', order('DEMOLISH', wall.id), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.buildings[wall.id]).toBeUndefined();
    expect(result.state.realms.a.wallet.GOLD).toBe(5060);
  });
  it('supprime aussi la tourelle quand le mur est détruit au combat', () => {
    const { s, wall } = fixture();
    wall.turretLevel = 3;
    wall.hp = 1;
    s.units.enemy.kind = 'BAZOOKA';
    const result = execute(s, 'b', order('ATTACK', 'enemy', { targetId: wall.id }), now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.buildings[wall.id]).toBeUndefined();
  });
  it('le Tesla bénéficie de son bonus antiaérien sans devenir une troupe mobile', () => {
    const { s, wall } = fixture();
    wall.kind = 'STEEL_WALL';
    wall.turretLevel = 3;
    s.units.enemy.kind = 'FIGHTER';
    const d = estimateDamage(wall, s.units.enemy, { q: 3, r: 0, terrain: 'MOUNTAIN' });
    expect(d.min).toBe(63);
    expect(
      execute(s, 'a', order('MOVE', wall.id, { path: [{ q: 2, r: 0 }] }), now).result.accepted,
    ).toBe(false);
  });
});
