import { describe, it, expect } from 'vitest';
import { isSea, UNITS } from '@voidmarch/config';
import {
  createState,
  createRealm,
  disk,
  key,
  distance,
  migrateOceans,
  ensureSeaAccess,
  ensureWorldSeaAccess,
  nearbySea,
  oceanWater,
  oceanTerrain,
  tileAt,
  coastalSeaWater,
  SEA_ACCESS_MIN_SIZE,
} from '@voidmarch/game-rules';
import { addPlayer, addBuilding } from '../apps/server/src/engine';
import { freshWorld } from '../apps/server/src/reset-world';
const now = 1900000000000;
function inland() {
  const s = createState('inland-coast', now);
  s.oceanVersion = 1;
  s.protectedLand = Object.fromEntries(disk({ q: 0, r: 0 }, 20).map((p) => [key(p), true]));
  const realm = createRealm('a', 'Ancien royaume', 'ASH', { q: 0, r: 0 }, now);
  s.realms.a = realm;
  return { s, realm };
}
describe('accès maritime à moins de cent cases', () => {
  it('réutilise une mer naturelle sans modifier la carte', () => {
    const s = createState('voidmarch-vhal-01', now);
    migrateOceans(s);
    const r = createRealm('a', 'Royaume', 'ASH', { q: 0, r: 0 }, now);
    s.realms.a = r;
    expect(nearbySea(s, r.capital)).toBeDefined();
    const tiles = structuredClone(s.tiles);
    expect(ensureSeaAccess(s, r, now)).toBe('FOUND');
    expect(r.seaAccess!.distance).toBeLessThan(100);
    expect(s.tiles).toEqual(tiles);
    expect(s.coastalSeas).toBeUndefined();
  });
  it('ne compte pas une rivière ou une mare isolée comme une mer', () => {
    const { s, realm } = inland();
    s.tiles['10,0'] = { q: 10, r: 0, terrain: 'SEA' };
    s.tiles['11,0'] = { q: 11, r: 0, terrain: 'RIVER' };
    expect(nearbySea(s, realm.capital)).toBeUndefined();
    expect(ensureSeaAccess(s, realm, now)).toBe('CREATED');
    expect(realm.seaAccess!.position).not.toEqual({ q: 10, r: 0 });
    const sea = s.coastalSeas![0];
    expect(
      disk(sea, 34).filter((p) => coastalSeaWater(s.seed, sea, p)).length,
    ).toBeGreaterThanOrEqual(SEA_ACCESS_MIN_SIZE);
  });
  it('modifie une ancienne région explorée neutre et met à jour les souvenirs sans révéler le reste', () => {
    const s = createState('legacy-coast', now),
      r = createRealm('a', 'Ancien', 'ASH', { q: 0, r: 0 }, now);
    s.realms.a = r;
    for (const p of disk(r.capital, 110))
      r.explored[key(p)] = {
        ...p,
        terrain: 'FOREST',
        biome: 'SNOW',
        visibility: 'EXPLORED',
        ownerId: 'ancien-propriétaire',
      };
    migrateOceans(s);
    const oldKeys = Object.keys(r.explored).sort();
    const wallet = structuredClone(r.wallet);
    expect(ensureSeaAccess(s, r, now)).toBe('CREATED');
    expect(r.seaAccess!.distance).toBeLessThanOrEqual(99);
    expect(r.wallet).toEqual(wallet);
    expect(Object.keys(r.explored).sort()).toEqual(oldKeys);
    expect(r.explored[key(r.seaAccess!.position!)]).toMatchObject({
      terrain: 'COAST',
      biome: 'SNOW',
      visibility: 'EXPLORED',
    });
    expect(r.explored[key(r.seaAccess!.position!)].ownerId).toBeUndefined();
  });
  it('conserve les bâtiments, troupes, routes, propriétés et événements', () => {
    const { s, realm } = inland();
    const b = addBuilding(s, realm, { q: 65, r: 0 }, 'VILLAGE', now, 4);
    s.tiles['0,72'] = { q: 0, r: 72, terrain: 'FOREST', road: true, roadOwnerId: 'a' };
    s.tiles['-60,0'] = { q: -60, r: 0, terrain: 'HILL', ownerId: 'a' };
    s.units.worker = {
      id: 'worker',
      ownerId: 'a',
      kind: 'PEASANT',
      q: 0,
      r: -72,
      hp: UNITS.PEASANT.hp,
      createdAt: now,
      updatedAt: now,
    };
    s.events.test = {
      id: 'test',
      kind: 'MONOLITH',
      q: 60,
      r: -60,
      title: 'Monolithe',
      description: 'Site protégé',
      startsAt: now,
      endsAt: now + 600000,
      global: false,
      reward: { GOLD: 10 },
    };
    const tiles = structuredClone(s.tiles),
      buildings = structuredClone(s.buildings),
      units = structuredClone(s.units),
      events = structuredClone(s.events);
    expect(ensureSeaAccess(s, realm, now)).toBe('CREATED');
    for (const [k, t] of Object.entries(tiles)) expect(s.tiles[k]).toEqual(t);
    expect(s.buildings).toEqual(buildings);
    expect(s.units).toEqual(units);
    expect(s.events).toEqual(events);
    expect(b.level).toBe(4);
  });
  it('conserve sa forme, ses plages et sa profondeur après rechargement et invalide le cache', () => {
    const { s, realm } = inland();
    for (const p of disk(realm.capital, 99)) oceanWater(s, p);
    ensureSeaAccess(s, realm, now);
    const sea = s.coastalSeas![0],
      positions = disk(sea, 34),
      reload = JSON.parse(JSON.stringify(s));
    expect(oceanWater(s, sea)).toBe(true);
    expect(tileAt(s, sea).terrain).toBe('SEA');
    const beaches = positions.filter((p) => tileAt(s, p).terrain === 'BEACH');
    expect(beaches.length).toBeGreaterThan(40);
    for (const p of beaches.slice(0, 20)) {
      expect(oceanWater(s, p)).toBe(false);
      expect(disk(p, 3).some((n) => oceanWater(s, n))).toBe(true);
    }
    for (const p of positions.filter((_, i) => i % 11 === 0)) {
      expect(tileAt(reload, p)).toEqual(tileAt(s, p));
      expect(oceanTerrain(reload, p)).toBe(oceanTerrain(s, p));
    }
    expect(ensureSeaAccess(reload, reload.realms.a, now + 1)).toBe('UNCHANGED');
    expect(reload.coastalSeas).toHaveLength(1);
  });
  it('réutilise une même mer pour des royaumes voisins', () => {
    const { s, realm } = inland();
    ensureSeaAccess(s, realm, now);
    const r = createRealm('b', 'Voisin', 'ASH', { q: 20, r: 0 }, now);
    s.realms.b = r;
    ensureWorldSeaAccess(s, now);
    expect(r.seaAccess!.distance).toBeLessThan(100);
    expect(s.coastalSeas).toHaveLength(1);
  });
  it('diffère une modification impossible sans détruire les routes et retente plus tard', () => {
    const { s, realm } = inland();
    for (let q = -130; q <= 130; q += 4)
      for (let r = -130; r <= 130; r += 4)
        s.tiles[`${q},${r}`] = { q, r, terrain: 'PLAIN', road: true };
    const tiles = structuredClone(s.tiles);
    expect(ensureSeaAccess(s, realm, now)).toBe('BLOCKED');
    expect(s.tiles).toEqual(tiles);
    expect(s.coastalSeas).toBeUndefined();
    s.tiles = {};
    expect(ensureSeaAccess(s, realm, now + 1)).toBe('BLOCKED');
    expect(ensureSeaAccess(s, realm, now + 3600000)).toBe('CREATED');
  });
  it('s’applique à la création des joueurs et des bots', () => {
    const s = createState('new-coast', now);
    migrateOceans(s);
    const r = addPlayer(s, 'human', 'Humain', 'ASH', now);
    expect(r.seaAccess?.status).toBe('READY');
    expect(r.seaAccess!.distance).toBeLessThan(100);
    const world = freshWorld('bot-coast', now);
    for (const bot of Object.values(world.realms)) {
      expect(bot.seaAccess?.status).toBe('READY');
      expect(distance(bot.capital, bot.seaAccess!.position!)).toBeLessThan(100);
      expect(isSea(tileAt(world, bot.seaAccess!.position!).terrain)).toBe(true);
    }
  });
});
