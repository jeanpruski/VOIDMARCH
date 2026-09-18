import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  BUILDINGS,
  UNITS,
  UNIT_PROFILES,
  TERRAINS,
  type UnitKind,
  type Terrain,
} from '@voidmarch/config';
import {
  attackBlockReason,
  createState,
  createRealm,
  disk,
  estimateDamage,
  findPath,
  key,
  movementCost,
  tileAt,
  unitStats,
  wallBlocks,
  writeTile,
  zeroWallet,
} from '@voidmarch/game-rules';
import { actionSchema, type Action } from '@voidmarch/protocol';
import { addBuilding, addPlayer, execute, defaultOptions } from '../apps/server/src/engine';
import type { Unit } from '@voidmarch/shared';
const now = 1_900_000_000_000;
const order = (type: Action['type'], actorId: string, payload = {}): Action =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
const unit = (kind: UnitKind, id = 'pilot', ownerId = 'a', q = 0): Unit => ({
  id,
  ownerId,
  kind,
  q,
  r: 0,
  hp: UNITS[kind].hp,
  createdAt: now,
  updatedAt: now,
});
function fixture(kind: UnitKind = 'FIGHTER') {
  const s = createState('aviation', now);
  const a = addPlayer(s, 'a', 'Ailes noires', 'ASH', now);
  a.wallet = { GOLD: 10000, WOOD: 10000, STONE: 10000, IRON: 10000, FOOD: 10000 };
  a.protectedUntil = 0;
  const b = createRealm('b', 'Rivaux', 'IRON', { q: 6, r: 0 }, now);
  b.protectedUntil = 0;
  s.realms.b = b;
  for (const p of disk(a.capital, 12)) writeTile(s, p, { terrain: 'PLAIN' });
  s.units.pilot = unit(kind);
  return { s, a, b };
}
const flyers = (Object.keys(UNITS) as UnitKind[]).filter((k) => UNIT_PROFILES[k].flying);
describe('aviation et défense antiaérienne', () => {
  it.each(flyers)('%s survole montagnes, marais, troupes et murs sans capturer', (kind) => {
    const { s, b } = fixture(kind);
    const wall = addBuilding(s, b, { q: 1, r: 0 }, 'STEEL_WALL', now);
    writeTile(s, wall, { terrain: 'MOUNTAIN' });
    writeTile(s, { q: 2, r: 0 }, { terrain: 'MARSH' });
    s.units.ground = unit('INFANTRY', 'ground', 'b', 1);
    expect(wallBlocks(wall, 'a', kind)).toBe(false);
    const path = findPath(
      s.units.pilot,
      { q: 2, r: 0 },
      (p) => tileAt(s, p),
      2,
      new Set([key(wall)]),
      kind,
    );
    expect(path).toEqual([
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ]);
    const moved = execute(s, 'a', order('MOVE', 'pilot', { path }), now);
    expect(moved.result.accepted, moved.result.reason).toBe(true);
    expect(moved.state.units.pilot.q).toBe(2);
    expect(moved.state.realms.a.ap).toBe(39);
    expect(execute(moved.state, 'a', order('CAPTURE', 'pilot'), now).result.accepted).toBe(false);
    for (const terrain of Object.keys(TERRAINS) as Terrain[])
      expect(movementCost({ q: 0, r: 0, terrain }, kind)).toBe(1);
  });
  it('interdit de finir un vol sur une unité et respecte la distance maximale', () => {
    const { s } = fixture();
    s.units.ground = unit('PEASANT', 'ground', 'a', 1);
    expect(
      findPath(s.units.pilot, s.units.ground, (p) => tileAt(s, p), 8, new Set(['1,0']), 'FIGHTER'),
    ).toBeNull();
    const denied = execute(s, 'a', order('MOVE', 'pilot', { path: [{ q: 1, r: 0 }] }), now);
    expect(denied.result.accepted).toBe(false);
    expect(denied.state).toEqual(s);
    delete s.units.ground;
    expect(
      execute(
        s,
        'a',
        order('MOVE', 'pilot', { path: Array.from({ length: 9 }, (_, i) => ({ q: i + 1, r: 0 })) }),
        now,
      ).result.accepted,
    ).toBe(false);
  });
  it('les combattants de mêlée ne touchent pas les avions ; les tirs les atteignent sans couvert du sol', () => {
    const { s } = fixture('INFANTRY');
    s.units.target = unit('FIGHTER', 'target', 'b', 1);
    const denied = execute(s, 'a', order('ATTACK', 'pilot', { targetId: 'target' }), now);
    expect(denied.result.reason).toContain('aérienne');
    expect(denied.state).toEqual(s);
    s.units.pilot = unit('RIFLEMAN');
    expect(
      execute(s, 'a', order('ATTACK', 'pilot', { targetId: 'target' }), now).result.accepted,
    ).toBe(true);
    expect(
      estimateDamage(s.units.pilot, s.units.target, { q: 1, r: 0, terrain: 'MOUNTAIN' }),
    ).toEqual(estimateDamage(s.units.pilot, s.units.target, { q: 1, r: 0, terrain: 'PLAIN' }));
  });
  it('la Flak et les chasseurs ont un bonus uniquement contre les cibles aériennes', () => {
    const target = unit('RECON_PLANE');
    for (const kind of ['FLAK_CANNON', 'FIGHTER'] as const) {
      const attacker = unit(kind);
      const damage = estimateDamage(attacker, target, { q: 0, r: 0, terrain: 'PLAIN' });
      expect(damage.min).toBe(
        Math.round(
          UNITS[kind].attack + UNIT_PROFILES[kind].antiAir! - UNITS.RECON_PLANE.defense / 2,
        ) - 1,
      );
    }
    expect(
      estimateDamage(unit('FLAK_CANNON'), unit('INFANTRY'), { q: 0, r: 0, terrain: 'PLAIN' }).max,
    ).toBeLessThan(10);
  });
  it('les murs ne protègent ni une cible volante, ni les troupes au sol contre un bombardement', () => {
    const { s, b } = fixture('BOMBER');
    const wall = addBuilding(s, b, { q: 1, r: 0 }, 'STEEL_WALL', now);
    s.units.target = unit('INFANTRY', 'target', 'b', 1);
    expect(attackBlockReason(s.units.pilot, s.units.target)).toBe('');
    const attacked = execute(s, 'a', order('ATTACK', 'pilot', { targetId: 'target' }), now);
    expect(attacked.result.accepted).toBe(true);
    expect(attacked.state.realms.a.ap).toBe(38);
    s.units.pilot = unit('RIFLEMAN');
    s.units.target = unit('FIGHTER', 'target', 'b', 1);
    expect(
      execute(s, 'a', order('ATTACK', 'pilot', { targetId: 'target' }), now).result.accepted,
    ).toBe(true);
  });
  it('un bombardier exige 2 PA et respecte les trêves', () => {
    const { s, b } = fixture('BOMBER');
    const target = addBuilding(s, b, { q: 1, r: 0 }, 'WOOD_WALL', now);
    s.realms.a.ap = 1;
    expect(
      execute(s, 'a', order('ATTACK', 'pilot', { targetId: target.id }), now).result.accepted,
    ).toBe(false);
    s.realms.a.ap = 15;
    s.treaties.t = {
      id: 't',
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
      execute(s, 'a', order('ATTACK', 'pilot', { targetId: target.id }), now).result.reason,
    ).toContain('trêve');
  });
  it('recrutement réservé aux bâtiments aériens et améliorations appliquées aux avions existants', () => {
    const { s, a } = fixture();
    const camp = Object.values(s.buildings)[0];
    expect(
      execute(s, 'a', order('RECRUIT', camp.id, { kind: 'FIGHTER' }), now).result.accepted,
    ).toBe(false);
    const airfield = addBuilding(s, a, { q: 1, r: 0 }, 'AERODROME', now);
    expect(
      execute(s, 'a', order('RECRUIT', airfield.id, { kind: 'FIGHTER' }), now).result.reason,
    ).toContain('munitions');
    addBuilding(s, a, { q: 2, r: 0 }, 'MUNITIONS', now);
    const housing = addBuilding(s, a, { q: 3, r: 0 }, 'VILLAGE', now);
    housing.population = 100;
    s.units.pilot.hp = 9;
    const upgraded = execute(s, 'a', order('UPGRADE', airfield.id), now);
    expect(upgraded.result.accepted).toBe(true);
    expect(upgraded.state.units.pilot.trainingBonus).toBe(25);
    expect(upgraded.state.units.pilot.hp).toBe(11.25);
    const recruited = execute(
      upgraded.state,
      'a',
      order('RECRUIT', airfield.id, { kind: 'FIGHTER' }),
      now,
      { ...defaultOptions, recruitBonus: () => 0 },
    );
    expect(recruited.result.accepted, recruited.result.reason).toBe(true);
    const fresh = Object.values(recruited.state.units).find((u) => u.id !== 'pilot')!;
    expect(fresh.trainingBonus).toBe(25);
    expect(fresh.hp).toBe(unitStats(fresh).hp);
  });
  it('démolition du nouvel aérodrome rembourse la construction initiale', () => {
    const { s, a } = fixture();
    const b = addBuilding(s, a, { q: 1, r: 0 }, 'AERODROME', now);
    b.constructionCost = { GOLD: 144, WOOD: 90, STONE: 63, IRON: 90 };
    const result = execute(s, 'a', order('DEMOLISH', b.id), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.a.wallet.GOLD).toBe(a.wallet.GOLD + 144);
    expect(result.state.buildings[b.id]).toBeUndefined();
  });
});
