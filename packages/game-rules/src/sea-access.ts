import { isSea } from '@voidmarch/config';
import type { CoastalSea, GameState, Hex, Realm } from '@voidmarch/shared';
import { disk, distance, hash, key, neighbors, tileAt } from './index';
import { clearOceanCache, coastalSeaWater, oceanTerrain, oceanWater } from './oceans';

export const SEA_ACCESS_DISTANCE = 99;
export const SEA_ACCESS_MIN_SIZE = 600;
let searchOffsets: Hex[] | undefined;
const offsets = () =>
  (searchOffsets ??= disk({ q: 0, r: 0 }, SEA_ACCESS_DISTANCE).sort(
    (a, b) => distance(a, { q: 0, r: 0 }) - distance(b, { q: 0, r: 0 }) || a.q - b.q || a.r - b.r,
  ));
/** Saved terrain takes priority: a remembered land tile is not a usable coast. */
const waterAt = (s: GameState, p: Hex) =>
  s.tiles[key(p)] ? isSea(s.tiles[key(p)].terrain) : oceanWater(s, p);

export function nearbySea(s: GameState, capital: Hex): Hex | undefined {
  if (!s.oceanVersion) return;
  const rejected = new Set<string>();
  for (const o of offsets()) {
    const p = { q: capital.q + o.q, r: capital.r + o.r };
    if (rejected.has(key(p)) || !waterAt(s, p)) continue;
    const queue = [p],
      visited = new Set([key(p)]),
      water: Hex[] = [];
    for (let i = 0; i < queue.length && water.length < SEA_ACCESS_MIN_SIZE; i++) {
      const at = queue[i];
      if (!waterAt(s, at)) continue;
      water.push(at);
      for (const n of neighbors(at))
        if (!visited.has(key(n))) {
          visited.add(key(n));
          queue.push(n);
        }
    }
    if (water.length >= SEA_ACCESS_MIN_SIZE) return p;
    for (const t of water) rejected.add(key(t));
  }
}
function protectedCells(s: GameState) {
  const protectedSet = new Set<string>();
  const protect = (p: Hex, radius = 0) => {
    for (const t of disk(p, radius)) protectedSet.add(key(t));
  };
  for (const r of Object.values(s.realms)) if (!r.defeatedAt) protect(r.capital, 12);
  for (const t of Object.values(s.tiles))
    if (
      t.ownerId ||
      t.enclosureOwnerId ||
      t.buildingId ||
      t.road ||
      t.roadOwnerId ||
      t.capture ||
      t.terrain === 'SCORCHED'
    )
      protect(t, 2);
  for (const p of [
    ...Object.values(s.units),
    ...Object.values(s.buildings),
    ...Object.values(s.events),
    ...Object.values(s.strategy?.sites ?? {}),
  ])
    protect(p, 2);
  for (const c of Object.values(s.caravans)) {
    protect(c, 2);
    for (const p of c.path) protect(p, 1);
  }
  for (const m of Object.values(s.missions ?? {})) if (m.active) protect(m.active, 6);
  for (const p of Object.values(s.strategy?.fallout ?? {})) protect(p, 1);
  for (const w of Object.values(s.strategy?.wars ?? {})) if (w.status === 'ACTIVE') protect(w, 3);
  for (const strike of Object.values(s.strategy?.strikes ?? {}))
    if (!strike.resolvedAt) protect(strike, (strike.radius ?? 2) + 3);
  for (const archive of Object.values(s.archives)) {
    for (const p of [...archive.buildings, ...archive.units, ...archive.tiles]) protect(p, 1);
  }
  return protectedSet;
}
export function ensureSeaAccess(s: GameState, realm: Realm, now: number) {
  if (!s.oceanVersion || realm.defeatedAt || realm.id.startsWith('mission:'))
    return 'SKIPPED' as const;
  const old = realm.seaAccess,
    sameCapital = old && key(old.capital) === key(realm.capital);
  if (
    sameCapital &&
    old.status === 'READY' &&
    old.position &&
    distance(realm.capital, old.position) <= SEA_ACCESS_DISTANCE &&
    waterAt(s, old.position)
  )
    return 'UNCHANGED' as const;
  if (sameCapital && old.status === 'BLOCKED' && (old.retryAt ?? 0) > now)
    return 'BLOCKED' as const;
  const remember = (position: Hex) => {
    realm.seaAccess = {
      version: 1,
      capital: { ...realm.capital },
      status: 'READY',
      position: { ...position },
      distance: distance(realm.capital, position),
      checkedAt: now,
    };
  };
  const existing = nearbySea(s, realm.capital);
  if (existing) {
    remember(existing);
    return 'FOUND' as const;
  }
  const blocked = protectedCells(s),
    known = new Set(
      Object.values(s.realms).flatMap((r) =>
        Object.values(r.explored)
          .filter((t) => t.visibility !== 'UNKNOWN')
          .map(key),
      ),
    );
  const phase = hash(s.seed + ':coast:' + key(realm.capital)) * Math.PI * 2;
  let chosen: { sea: CoastalSea; footprint: Hex[]; score: number } | undefined;
  for (const radius of [22, 18]) {
    const bound = Math.ceil((radius + 4) / Math.sqrt(0.75)) + 3;
    for (const ring of [72, 88, 56])
      for (let i = 0; i < 32; i++) {
        const angle = phase + (i * Math.PI) / 16;
        const direction = { q: Math.cos(angle), r: Math.sin(angle) };
        const norm =
          (Math.abs(direction.q) + Math.abs(direction.r) + Math.abs(direction.q + direction.r)) / 2;
        const center = {
          q: realm.capital.q + Math.round((direction.q / norm) * ring),
          r: realm.capital.r + Math.round((direction.r / norm) * ring),
        };
        const footprint = disk(center, bound);
        if (footprint.some((p) => blocked.has(key(p)))) continue;
        const sea = { ...center, id: `access:${key(center)}:${radius}`, radius };
        const joinsExisting = footprint.some(
          (p, index) => index % 13 === 0 && coastalSeaWater(s.seed, sea, p) && waterAt(s, p),
        );
        const explored =
          footprint.reduce((n, p) => n + (known.has(key(p)) ? 1 : 0), 0) / footprint.length;
        const score = (joinsExisting ? 0 : 10000) + explored * 1000 + (22 - radius);
        if (!chosen || score < chosen.score) chosen = { sea, footprint, score };
      }
  }
  if (!chosen) {
    realm.seaAccess = {
      version: 1,
      capital: { ...realm.capital },
      status: 'BLOCKED',
      checkedAt: now,
      retryAt: now + 3600000,
    };
    return 'BLOCKED' as const;
  }
  const { sea, footprint } = chosen;
  // Materialize only the new water and its beach fringe. Every affected cell was safety-checked.
  const fringe = new Set<string>();
  for (const p of footprint)
    if (coastalSeaWater(s.seed, sea, p)) for (const n of disk(p, 3)) fringe.add(key(n));
  (s.coastalSeas ??= []).push(sea);
  clearOceanCache(s);
  const changed = new Map<string, ReturnType<typeof tileAt>>();
  for (const p of footprint) {
    if (!fringe.has(key(p))) continue;
    const terrain = oceanTerrain(s, p);
    if (!terrain) continue;
    const prior = tileAt(s, p);
    const tile = { ...prior, terrain, poi: undefined, exhausted: undefined, capture: undefined };
    s.tiles[key(p)] = tile;
    changed.set(key(p), tile);
  }
  // Refresh already known geography, without revealing any previously unknown tile.
  for (const r of Object.values(s.realms))
    for (const [k, t] of changed) {
      const memory = r.explored[k];
      if (memory && memory.visibility !== 'UNKNOWN')
        r.explored[k] = {
          ...memory,
          terrain: t.terrain,
          ownerId: t.ownerId,
          building: undefined,
          road: t.road,
          roadOwnerId: t.roadOwnerId,
          enclosureOwnerId: t.enclosureOwnerId,
          capture: undefined,
          poi: undefined,
          exhausted: undefined,
        };
    }
  const coast = nearbySea(s, realm.capital);
  if (!coast) throw new Error('La nouvelle mer ne satisfait pas la garantie maritime.');
  remember(coast);
  s.revision++;
  return 'CREATED' as const;
}
export function ensureWorldSeaAccess(s: GameState, now: number) {
  return Object.values(s.realms).map((r) => ({
    realmId: r.id,
    result: ensureSeaAccess(s, r, now),
  }));
}
