import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { ISLAND_DISCOVERIES, isSea, UNITS } from '@voidmarch/config';
import {
  createState,
  createRealm,
  migrateOceans,
  migrateArchipelagos,
  archipelagoInSector,
  disk,
  tileAt,
  writeTile,
  key,
  publicTile,
  anomalyAPReward,
  observe,
} from '@voidmarch/game-rules';
import { execute, worldView, spawnPosition } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { predictAction } from '../apps/web/src/optimistic-actions';
const now = 1900000000000;
function world(enabled = true) {
  const s = createState('voidmarch-vhal-01', now);
  migrateOceans(s);
  if (enabled) migrateArchipelagos(s);
  return s;
}
const islands = () => archipelagoInSector(world(), -5, -3);
describe('archipels et découvertes libres', () => {
  it('forme trois îles séparées, avec côtes, terres colonisables, forêts et minerais', () => {
    const s = world(),
      cluster = archipelagoInSector(s, -5, -3);
    expect(cluster).toHaveLength(3);
    for (const island of cluster) {
      const tiles = disk(island, 20).map((p) => tileAt(s, p));
      expect(tiles.filter((t) => !isSea(t.terrain)).length).toBeGreaterThan(45);
      expect(tiles.some((t) => t.terrain === 'BEACH')).toBe(true);
      expect(tiles.some((t) => t.terrain === 'COAST')).toBe(true);
      expect(tiles.some((t) => t.terrain === 'SEA')).toBe(true);
      expect(tileAt(s, island).islandDiscovery).toBe(island.kind);
    }
    const main = disk(cluster[0], 10).map((p) => tileAt(s, p).terrain);
    for (const terrain of ['PLAIN', 'FOREST', 'HILL']) expect(main).toContain(terrain);
    const land = disk(cluster[0], 48).filter((p) => !isSea(tileAt(s, p).terrain));
    const keys = new Set(land.map(key));
    const queue: { q: number; r: number }[] = [cluster[0]];
    const connected = new Set<string>();
    const dirs = [
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ];
    while (queue.length) {
      const p = queue.pop()!;
      if (connected.has(key(p)) || !keys.has(key(p))) continue;
      connected.add(key(p));
      for (const d of dirs) queue.push({ q: p.q + d.q, r: p.r + d.r });
    }
    expect(connected.has(key(cluster[1]))).toBe(false);
    expect(connected.has(key(cluster[2]))).toBe(false);
  });
  it('réserve les archipels à la découverte plutôt qu’aux départs des royaumes', () => {
    const s = world();
    s.realms.initial = createRealm('initial', 'Continent', 'MASK', {q:0,r:0}, now);
    for (const id of ['marin', 'bot-a', 'bot-b', 'bot-c']) {
      const p = spawnPosition(s,id);
      expect(isSea(tileAt(s,p).terrain)).toBe(false);
      expect(archipelagoInSector(s,Math.floor(p.q/144),Math.floor(p.r/144)).some(i => disk(i,16).some(t=>key(t)===key(p)))).toBe(false);
    }
  });
  it('reste identique après sauvegarde, observation et changement d’ordre des lectures', () => {
    const s = world(),
      center = islands()[0],
      points = disk(center, 18);
    const before = points.map((p) => tileAt(s, p));
    const r = (s.realms.a = createRealm('a', 'Marins', 'MASK', center, now));
    s.units.scout = {
      id: 'scout',
      ownerId: 'a',
      ...center,
      kind: 'PEASANT',
      hp: UNITS.PEASANT.hp,
      createdAt: now,
      updatedAt: now,
    };
    observe(s, r, now);
    const restored = JSON.parse(JSON.stringify(s));
    for (const p of points.slice().reverse()) tileAt(restored, p);
    expect(points.map((p) => tileAt(restored, p))).toEqual(before);
    expect(migrateArchipelagos(restored)).toBe(false);
  });
  it('préserve le terrain déjà exploré, occupé, enregistré ou archivé lors de la migration', () => {
    const center = islands()[0];
    for (const scenario of ['explored', 'saved', 'unit', 'archive'] as const) {
      const s = world(false),
        r = (s.realms.a = createRealm('a', 'Ancien', 'MASK', { q: 0, r: 0 }, now));
      const old = tileAt(s, center);
      expect(isSea(old.terrain)).toBe(true);
      if (scenario === 'explored') r.explored[key(center)] = { ...old, visibility: 'EXPLORED' };
      if (scenario === 'saved') writeTile(s, center, { road: false });
      if (scenario === 'unit')
        s.units.ship = {
          ...center,
          id: 'ship',
          ownerId: 'a',
          kind: 'TROOP_FERRY',
          hp: 85,
          createdAt: now,
          updatedAt: now,
        };
      if (scenario === 'archive')
        s.archives.a = {
          realm: structuredClone(r),
          units: [],
          buildings: [],
          tiles: [old],
          createdAt: now,
          realmValue: 0,
          version: 1,
        };
      expect(migrateArchipelagos(s)).toBe(true);
      expect(tileAt(s, center)).toMatchObject(old);
      expect(tileAt(s, center).islandDiscovery).toBeUndefined();
      expect(archipelagoInSector(s, -5, -3)).toEqual([]);
    }
  });
  it('ne révèle aucun site sous le brouillard inconnu', () => {
    const s = world(),
      island = islands()[0],
      p = { q: island.q, r: island.r };
    const unknown = publicTile(s, p, new Set(), {});
    expect(unknown).toEqual({ q: p.q, r: p.r, visibility: 'UNKNOWN' });
  });
  it.each(['LIGHTHOUSE', 'RUINED_PORT', 'MINERAL_CACHE'] as const)(
    '%s : butin unique, conservé après sauvegarde, sans mission ni trophée',
    (kind) => {
      const s = world(),
        p = islands().find((i) => i.kind === kind)!;
      const r = (s.realms.a = createRealm('a', 'Voyageurs', 'MASK', p, now));
      r.wallet = { GOLD: 0, WOOD: 0, STONE: 0, IRON: 0, FOOD: 0 };
      r.ap = 20;
      s.units.explorer = {
        id: 'explorer',
        ownerId: 'a',
        ...p,
        kind: 'PEASANT',
        hp: UNITS.PEASANT.hp,
        createdAt: now,
        updatedAt: now,
      };
      const command = () =>
        actionSchema.parse({
          type: 'INTERACT',
          actorId: 'explorer',
          payload: {},
          actionId: randomUUID(),
          clientTimestamp: now,
        });
      const view = worldView(s, 'a', now, [{ q: Math.floor(p.q / 32), r: Math.floor(p.r / 32) }]);
      const prediction = predictAction(view, command())!;
      expect(prediction).toBeDefined();
      const result = execute(s, 'a', command(), now);
      expect(result.result.accepted, result.result.reason).toBe(true);
      expect(result.state.realms.a.wallet).toEqual({
        ...r.wallet,
        ...ISLAND_DISCOVERIES[kind].reward,
      });
      expect(result.state.realms.a.wallet).toEqual(prediction.world.player.wallet);
      expect(result.state.realms.a.ap).toBe(19 + anomalyAPReward(s.seed, key(p)));
      expect(result.state.missions?.a?.trophies ?? []).toEqual([]);
      const restored = JSON.parse(JSON.stringify(result.state));
      expect(tileAt(restored, p).exhausted).toBe(true);
      expect(execute(restored, 'a', command(), now).result.accepted).toBe(false);
      expect(result.result.message).toContain(ISLAND_DISCOVERIES[kind].name);
    },
  );
});
