import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  UNIT_BIOME_ADAPTATIONS,
  UNITS,
  UNIT_PROFILES,
  type Biome,
  type UnitKind,
} from '@voidmarch/config';
import {
  biomeMovementBonus,
  unitMovementBudget,
  unitStats,
  movementBiome,
  biomeAt,
  biomeBlend,
  createState,
  disk,
  writeTile,
  key,
  tileAt,
} from '@voidmarch/game-rules';
import { actionSchema } from '@voidmarch/protocol';
import type { Unit } from '@voidmarch/shared';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { groupMovementRange, planGroupMovement } from '../apps/web/src/group-movement';
import { missionTravel } from '../apps/web/src/mission-guidance';

const now = 1_900_000_000_000;
const representatives: Record<Biome, UnitKind> = {
  SNOW: 'GIVR_MUSKET',
  DESERT: 'SOL_KHOPESH',
  TEMPERATE: 'RONC_MUSKET',
  AUTUMN: 'RONC_GRENADIER',
};
const troop = (kind: UnitKind, extra: Partial<Unit> = {}): Unit => ({
  id: 'troop',
  ownerId: 'a',
  q: 0,
  r: 0,
  kind,
  hp: UNITS[kind].hp,
  createdAt: now,
  updatedAt: now,
  ...extra,
});
const command = (type: string, actorId: string, payload: unknown) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
function fixture(kind: UnitKind, biome: Biome) {
  const s = createState('climate-moves', now),
    realm = addPlayer(s, 'a', 'Climat', 'ASH', now);
  s.units = { troop: troop(kind) };
  for (const p of disk({ q: 0, r: 0 }, 14)) {
    writeTile(s, p, { terrain: 'PLAIN', biome, ownerId: undefined, road: false });
    realm.explored[key(p)] = { ...p, terrain: 'PLAIN', biome, visibility: 'EXPLORED' };
  }
  const view = () => {
    const world = worldView(s, 'a', now);
    world.tiles = Object.values(s.tiles).map((t) => ({
      ...t,
      building: s.buildings[t.buildingId ?? ''],
      visibility: 'VISIBLE' as const,
    }));
    return world;
  };
  return { s, realm, view };
}

describe('adaptations innées aux biomes', () => {
  it('couvre les quatre climats sans bonus universel et laisse les civils, héros et aéronefs inchangés', () => {
    expect(new Set(Object.values(UNIT_BIOME_ADAPTATIONS))).toEqual(
      new Set(Object.keys(representatives)),
    );
    expect(Object.keys(UNIT_BIOME_ADAPTATIONS).length).toBeLessThan(Object.keys(UNITS).length / 2);
    for (const kind of Object.keys(UNITS) as UnitKind[]) {
      const profile = UNIT_PROFILES[kind],
        preferred = UNIT_BIOME_ADAPTATIONS[kind];
      if (profile.flying || profile.builder || profile.hero)
        expect(preferred, kind).toBeUndefined();
      for (const biome of Object.keys(representatives) as Biome[])
        expect(biomeMovementBonus(troop(kind), biome)).toBe(preferred === biome ? 1 : 0);
    }
    expect(UNIT_BIOME_ADAPTATIONS.RONC_GRENADIER).toBe('AUTUMN');
    expect(UNIT_BIOME_ADAPTATIONS.RONC_MUSKET).toBe('TEMPERATE');
    expect(UNIT_BIOME_ADAPTATIONS.INFANTRY).toBeUndefined();
  });
  it('cumule une seule case avec le soutien et conserve le bonus de faction sans modifier les stats permanentes', () => {
    const u = troop('GIVR_LANCER', {
      supportBonus: { attack: 15, defense: 15, hp: 15, move: 1, vision: 1, terrain: 5 },
    });
    const before = structuredClone(u);
    expect(unitMovementBudget(u, 'SNOW', 'ASH')).toBe(UNITS[u.kind].move + 2);
    expect(unitMovementBudget(u, 'SNOW', 'IRON')).toBe(UNITS[u.kind].move + 3);
    expect(unitMovementBudget(u, 'DESERT', 'ASH')).toBe(UNITS[u.kind].move + 1);
    expect(unitStats(u).move).toBe(UNITS[u.kind].move + 1);
    expect(u).toEqual(before);
    expect(biomeMovementBonus({ ...u, npc: {} as NonNullable<Unit['npc']> }, 'SNOW')).toBe(0);
  });
  it('se base sur le biome sauvegardé, y compris aux transitions et dans les anciennes cases, sans lire le décor mélangé', () => {
    const p = disk({ q: 0, r: 0 }, 100).find((p) => {
      const b = biomeBlend('landscape', p);
      return b.scenery !== b.primary;
    })!;
    const blend = biomeBlend('landscape', p);
    expect(movementBiome('landscape', p)).toBe(biomeAt('landscape', p));
    const u = troop(representatives[blend.primary]);
    expect(biomeMovementBonus(u, movementBiome('landscape', p))).toBe(1);
    expect(biomeMovementBonus(u, blend.scenery)).toBe(0);
    expect(movementBiome('landscape', { ...p, biome: 'AUTUMN' })).toBe('AUTUMN');
    expect(movementBiome('landscape', { ...p, visibility: 'UNKNOWN' })).toBeUndefined();
    expect(biomeMovementBonus(u, movementBiome('landscape', undefined))).toBe(0);
  });
  it.each(Object.entries(representatives) as [Biome, UnitKind][])(
    '%s : autorise exactement la case supplémentaire, même si le trajet quitte le biome',
    (biome, kind) => {
      const { s, realm, view } = fixture(kind, biome);
      const other = biome === 'DESERT' ? 'SNOW' : 'DESERT';
      const path = Array.from({ length: UNITS[kind].move + 1 }, (_, i) => ({ q: i + 1, r: 0 }));
      for (const p of path) writeTile(s, p, { biome: other });
      const order = command('MOVE', 'troop', { path });
      const predicted = predictAction(view(), order)!;
      const result = execute(s, 'a', order, now);
      expect(result.result.accepted, result.result.reason).toBe(true);
      expect(result.result.movement?.path).toEqual(path);
      expect(predicted.movement?.path).toEqual(path);
      expect(result.state.realms.a.ap).toBe(realm.ap - 1);
      expect(
        unitMovementBudget(
          result.state.units.troop,
          tileAt(result.state, path.at(-1)!).biome,
          'ASH',
        ),
      ).toBe(UNITS[kind].move);
      const tooLong = command('MOVE', 'troop', { path: [...path, { q: path.length + 1, r: 0 }] });
      expect(execute(s, 'a', tooLong, now).result.accepted).toBe(false);
      expect(predictAction(view(), tooLong)).toBeUndefined();
    },
  );
  it('ne gagne pas une case en entrant dans son biome pendant un ordre déjà commencé', () => {
    const { s, view } = fixture('GIVR_MUSKET', 'DESERT');
    const path = Array.from({ length: 4 }, (_, i) => ({ q: i + 1, r: 0 }));
    for (const p of path) writeTile(s, p, { biome: 'SNOW' });
    const order = command('MOVE', 'troop', { path });
    expect(execute(s, 'a', order, now).result.accepted).toBe(false);
    expect(predictAction(view(), order)).toBeUndefined();
    const first = execute(s, 'a', command('MOVE', 'troop', { path: path.slice(0, 3) }), now);
    expect(first.result.accepted).toBe(true);
    expect(
      unitMovementBudget(
        first.state.units.troop,
        tileAt(first.state, first.state.units.troop).biome,
      ),
    ).toBe(4);
  });
  it('accorde un budget propre à chaque troupe du groupe et le même trajet au serveur', () => {
    const { s, view } = fixture('GIVR_MUSKET', 'SNOW');
    s.units.ordinary = troop('INFANTRY', { id: 'ordinary', q: 0, r: 1 });
    const world = view();
    const range = groupMovementRange(world, ['troop', 'ordinary']);
    expect(range.cells.get('4,0')?.count).toBe(1);
    const solo = planGroupMovement(world, ['troop'], { q: 4, r: 0 });
    expect(solo.journeys[0].path.at(-1)).toEqual({ q: 4, r: 0 });
    const group = planGroupMovement(world, ['troop', 'ordinary'], { q: 4, r: 0 });
    expect(group.orders).toHaveLength(2);
    const result = execute(s, 'a', command('MOVE_GROUP', 'a', { orders: group.orders }), now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.realms.a.ap).toBe(s.realms.a.ap - 2);
  });
  it('préserve les longs trajets routiers et les terrains impraticables', () => {
    const { s, realm, view } = fixture('GIVR_BIKE', 'SNOW');
    writeTile(s, { q: 1, r: 0 }, { terrain: 'MOUNTAIN' });
    const blocked = command('MOVE', 'troop', { path: [{ q: 1, r: 0 }] });
    expect(execute(s, 'a', blocked, now).result.accepted).toBe(false);
    expect(predictAction(view(), blocked)).toBeUndefined();
    for (let q = 0; q <= 12; q++) {
      writeTile(s, { q, r: 0 }, { terrain: 'PLAIN', road: true, biome: q % 2 ? 'SNOW' : 'DESERT' });
      realm.explored[`${q},0`] = { ...tileAt(s, { q, r: 0 }), visibility: 'EXPLORED' };
    }
    const road = command('MOVE_ROAD', 'troop', { q: 12, r: 0 });
    expect(execute(s, 'a', road, now).result.accepted).toBe(true);
    expect(predictAction(view(), road)?.movement?.path.at(-1)).toEqual({ q: 12, r: 0 });
  });
  it('réévalue le biome de départ à chaque PA dans les estimations de voyage', () => {
    const { s, view } = fixture('GIVR_MUSKET', 'DESERT');
    const world = view();
    world.tiles = Array.from({ length: 10 }, (_, q) => ({
      q,
      r: 0,
      terrain: 'PLAIN',
      biome: q ? 'DESERT' : 'SNOW',
      visibility: 'VISIBLE',
    }));
    expect(missionTravel(world, { q: 9, r: 0 }, s.units.troop)).toMatchObject({
      pa: 3,
      basis: 'known',
    });
    world.tiles = world.tiles.map((t) => ({ ...t, biome: t.q ? 'SNOW' : 'DESERT' }));
    expect(missionTravel(world, { q: 8, r: 0 }, s.units.troop)).toMatchObject({
      pa: 2,
      basis: 'known',
    });
  });
});
